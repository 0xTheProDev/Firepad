import { ITextOperation } from "./text-operation";
import { IDisposable, Utils } from "./utils";

export interface IBaseClient {
  /**
   * Send operation to Database adapter.
   * @param operation - Text Operation at client end.
   */
  sendOperation(operation: ITextOperation): void;
  /**
   * Apply operation to Editor adapter
   * @param operation - Text Operation at Server end.
   */
  applyOperation(operation: ITextOperation): void;
}

export interface IClient extends IBaseClient, IDisposable {
  /**
   * Tests whether the Client is Synchronized with Server or not.
   */
  isSynchronized(): boolean;
  /**
   * Tests whether the Client is Waiting for Acknowledgement with Server or not.
   */
  isAwaitingConfirm(): boolean;
  /**
   * Tests whether the Client is Waiting for Acknowledgement with Server along with pending Operation or not.
   */
  isAwaitingWithBuffer(): boolean;
  /**
   * Send operation to remote users.
   * @param operation - Text Operation from Editor Adapter
   */
  applyClient(operation: ITextOperation): void;
  /**
   * Recieve operation from remote user.
   * @param operation - Text Operation recieved from remote user.
   */
  applyServer(operation: ITextOperation): void;
  /**
   * Handle acknowledgement
   */
  serverAck(): void;
  /**
   * Handle retry
   */
  serverRetry(): void;
}

export interface IClientSynchronizationState {
  applyClient(
    client: IClient,
    operation: ITextOperation
  ): IClientSynchronizationState;
  applyServer(
    client: IClient,
    operation: ITextOperation
  ): IClientSynchronizationState;
  serverAck(client: IClient): IClientSynchronizationState;
  serverRetry(client: IClient): IClientSynchronizationState;
}

/**
 * In the `Synchronized` state, there is no pending operation that the client
 * has sent to the server.
 */
class Synchronized implements IClientSynchronizationState {
  constructor() {}

  applyClient(
    client: IClient,
    operation: ITextOperation
  ): IClientSynchronizationState {
    // When the user makes an edit, send the operation to the server and
    // switch to the 'AwaitingConfirm' state
    client.sendOperation(operation);
    return new AwaitingConfirm(operation);
  }

  applyServer(
    client: IClient,
    operation: ITextOperation
  ): IClientSynchronizationState {
    // When we receive a new operation from the server, the operation can be
    // simply applied to the current document
    client.applyOperation(operation);
    return this;
  }

  serverAck(_client: IClient): IClientSynchronizationState {
    Utils.shouldNotGetCalled("There is no pending operation.");
    return this;
  }

  serverRetry(_client: IClient): IClientSynchronizationState {
    Utils.shouldNotGetCalled("There is no pending operation.");
    return this;
  }
}

// Singleton
const _synchronized = new Synchronized();

/**
 * In the `AwaitingConfirm` state, there's one operation the client has sent
 * to the server and is still waiting for an acknowledgement.
 */
class AwaitingConfirm implements IClientSynchronizationState {
  protected readonly _outstanding: ITextOperation;

  constructor(outstanding: ITextOperation) {
    // Save the pending operation
    this._outstanding = outstanding;
  }

  applyClient(
    _client: IClient,
    operation: ITextOperation
  ): IClientSynchronizationState {
    // When the user makes an edit, don't send the operation immediately,
    // instead switch to 'AwaitingWithBuffer' state
    return new AwaitingWithBuffer(this._outstanding, operation);
  }

  applyServer(
    client: IClient,
    operation: ITextOperation
  ): IClientSynchronizationState {
    // This is another client's operation. Visualization:
    //
    //                   /\
    // this.outstanding /  \ operation
    //                 /    \
    //                 \    /
    //  pair[1]         \  / pair[0] (new outstanding)
    //  (can be applied  \/
    //  to the client's
    //  current document)

    const pair = this._outstanding.transform(operation);
    client.applyOperation(pair[1]);
    return new AwaitingConfirm(pair[0]);
  }

  serverAck(_client: IClient): IClientSynchronizationState {
    // The client's operation has been acknowledged
    // => switch to synchronized state
    return _synchronized;
  }

  serverRetry(client: IClient): IClientSynchronizationState {
    client.sendOperation(this._outstanding);
    return this;
  }
}

/**
 * In the `AwaitingWithBuffer` state, the client is waiting for an operation
 * to be acknowledged by the server while buffering the edits the user makes
 */
class AwaitingWithBuffer implements IClientSynchronizationState {
  protected readonly _outstanding: ITextOperation;
  protected readonly _buffer: ITextOperation;

  constructor(outstanding: ITextOperation, buffer: ITextOperation) {
    // Save the pending operation and the user's edits since then
    this._outstanding = outstanding;
    this._buffer = buffer;
  }

  applyClient(
    client: IClient,
    operation: ITextOperation
  ): IClientSynchronizationState {
    // Compose the user's changes onto the buffer
    const newBuffer = this._buffer.compose(operation);
    return new AwaitingWithBuffer(this._outstanding, newBuffer);
  }

  applyServer(
    client: IClient,
    operation: ITextOperation
  ): IClientSynchronizationState {
    // Operation comes from another client
    //
    //                       /\
    //     this.outstanding /  \ operation
    //                     /    \
    //                    /\    /
    //       this.buffer /  \* / pair1[0] (new outstanding)
    //                  /    \/
    //                  \    /
    //          pair2[1] \  / pair2[0] (new buffer)
    // the transformed    \/
    // operation -- can
    // be applied to the
    // client's current
    // document
    //
    // * pair1[1]

    const pair1 = this._outstanding.transform(operation);
    const pair2 = this._buffer.transform(pair1[1]);
    client.applyOperation(pair2[1]);
    return new AwaitingWithBuffer(pair1[0], pair2[0]);
  }

  serverAck(client: IClient): IClientSynchronizationState {
    // The pending operation has been acknowledged
    // => send buffer
    client.sendOperation(this._buffer);
    return new AwaitingConfirm(this._buffer);
  }

  serverRetry(client: IClient): IClientSynchronizationState {
    // Merge with our buffer and resend.
    const outstanding = this._outstanding.compose(this._buffer);
    client.sendOperation(outstanding);
    return new AwaitingConfirm(outstanding);
  }
}

export class Client implements IClient {
  protected _operator: IBaseClient;
  protected _state: IClientSynchronizationState;

  constructor(operator: IBaseClient) {
    this._operator = operator;
    this._state = _synchronized;
  }

  dispose(): void {
    this._operator = null;
    this._setState(_synchronized);
  }

  protected _setState(state: IClientSynchronizationState): void {
    this._state = state;
  }

  isSynchronized(): boolean {
    return this._state === _synchronized;
  }

  isAwaitingConfirm(): boolean {
    return this._state instanceof AwaitingConfirm;
  }

  isAwaitingWithBuffer(): boolean {
    return this._state instanceof AwaitingWithBuffer;
  }

  applyClient(operation: ITextOperation): void {
    this._setState(this._state.applyClient(this, operation));
  }

  applyServer(operation: ITextOperation): void {
    this._setState(this._state.applyServer(this, operation));
  }

  serverAck(): void {
    this._setState(this._state.serverAck(this));
  }

  serverRetry(): void {
    this._setState(this._state.serverRetry(this));
  }

  sendOperation(operation: ITextOperation): void {
    this._operator.sendOperation(operation);
  }

  applyOperation(operation: ITextOperation): void {
    this._operator.applyOperation(operation);
  }
}
