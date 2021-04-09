import { IClient, Client } from "./client";
import { ICursor, Cursor, CursorType } from "./cursor";
import { IDatabaseAdapter } from "./database-adapter";
import { IEditorAdapter } from "./editor-adapter";
import { IEvent, IEventEmitter, EventEmitter, EventListener } from "./emitter";
import { OperationMeta } from "./operation-meta";
import { IRemoteClient, RemoteClient } from "./remote-client";
import { ITextOperation } from "./text-operation";
import { IUndoManager, UndoManager } from "./undo-manager";
import { IDisposable } from "./utils";
import { IWrappedOperation, WrappedOperation } from "./wrapped-operation";

export enum EditorClientEvent {
  Undo = "undo",
  Redo = "redo",
  Error = "error",
  Synced = "synced",
}

interface IEditorClientEvent extends IEvent {}

interface ISyncCursor extends ICursor {
  /** If the Cursor is synced will all remote users. Default: false */
  synced?: boolean;
}

export interface IEditorClient extends IClient, IDisposable {
  /**
   * Add listener to Editor Client.
   * @param event - Event name.
   * @param listener - Event handler callback.
   */
  on(
    event: EditorClientEvent,
    listener: EventListener<IEditorClientEvent>
  ): void;
  /**
   * Remove listener to Editor Client.
   * @param event - Event name.
   * @param listener - Event handler callback.
   */
  off(
    event: EditorClientEvent,
    listener: EventListener<IEditorClientEvent>
  ): void;
  /**
   * Clears undo redo stack of current Editor model.
   */
  clearUndoRedoStack(): void;
}

export class EditorClient extends Client implements IEditorClient {
  protected readonly _databaseAdapter: IDatabaseAdapter;
  protected readonly _editorAdapter: IEditorAdapter;
  protected readonly _clients: Map<string, IRemoteClient>;

  protected _focused: boolean;
  protected _cursor: ISyncCursor | null;
  protected _emitter: IEventEmitter | null;
  protected _undoManager: IUndoManager | null;
  protected _sendCursorTimeout: NodeJS.Timeout | null;

  /**
   * Provides a channel of communication between database server and editor wrapped inside adapter
   * @param databaseAdapter - Database connector wrapped with Adapter interface
   * @param editorAdapter - Editor instance wrapped with Adapter interface
   */
  constructor(
    databaseAdapter: IDatabaseAdapter,
    editorAdapter: IEditorAdapter
  ) {
    super();

    this._focused = false;
    this._cursor = null;
    this._sendCursorTimeout = null;

    this._databaseAdapter = databaseAdapter;
    this._editorAdapter = editorAdapter;
    this._undoManager = new UndoManager();
    this._clients = new Map<string, IRemoteClient>();
    this._emitter = new EventEmitter([
      EditorClientEvent.Error,
      EditorClientEvent.Undo,
      EditorClientEvent.Redo,
      EditorClientEvent.Synced,
    ]);

    this._init();
  }

  protected _init(): void {
    this._editorAdapter.registerCallbacks({
      change: (operation: ITextOperation, inverse: ITextOperation) => {
        this._onChange(operation, inverse);
      },
      cursorActivity: () => {
        this._onCursorActivity();
      },
      blur: () => {
        this._onBlur();
      },
      focus: () => {
        this._onFocus();
      },
      error: (err, operation, state) => {
        this._trigger(EditorClientEvent.Error, err, operation, state);
      },
    });

    this._editorAdapter.registerUndo(() => {
      this._undo();
    });

    this._editorAdapter.registerRedo(() => {
      this._redo();
    });

    this._databaseAdapter.registerCallbacks({
      ack: () => {
        this.serverAck();
        this._updateCursor();
        this._sendCursor(this._cursor);
        this._emitStatus();
      },
      retry: () => {
        this.serverRetry();
      },
      operation: (operation: ITextOperation) => {
        this.applyServer(operation);
      },
      cursor: (
        clientId: string,
        cursor: CursorType | null,
        userColor?: string,
        userName?: string
      ) => {
        if (
          this._databaseAdapter.isCurrentUser(clientId) ||
          !this.isSynchronized()
        ) {
          return;
        }

        const client = this._getClientObject(clientId);

        if (!cursor) {
          client.removeCursor();
          return;
        }

        if (userColor) {
          client.setColor(userColor);
        }

        if (userName) {
          client.setUserName(userName);
        }

        client.updateCursor(Cursor.fromJSON(cursor));
      },
      error: (err, operation, state) => {
        this._trigger(EditorClientEvent.Error, err, operation, state);
      },
    });
  }

  dispose(): void {
    if (this._sendCursorTimeout) {
      clearTimeout(this._sendCursorTimeout);
      this._sendCursorTimeout = null;
    }

    if (this._emitter) {
      this._emitter.dispose();
      this._emitter = null;
    }

    if (this._undoManager) {
      this._undoManager.dispose();
      this._undoManager = null;
    }

    this._clients.clear();
  }

  on(
    event: EditorClientEvent,
    listener: EventListener<IEditorClientEvent>
  ): void {
    return this._emitter?.on(event, listener);
  }

  off(
    event: EditorClientEvent,
    listener: EventListener<IEditorClientEvent>
  ): void {
    return this._emitter?.off(event, listener);
  }

  protected _trigger(
    event: EditorClientEvent,
    eventArgs: IEditorClientEvent | void,
    ...extraArgs: unknown[]
  ): void {
    return this._emitter?.trigger(event, eventArgs || {}, ...extraArgs);
  }

  protected _emitStatus() {
    setTimeout(() => {
      this._trigger(EditorClientEvent.Synced, this.isSynchronized());
    });
  }

  protected _getClientObject(clientId: string): IRemoteClient {
    let client = this._clients.get(clientId);

    if (client) {
      return client;
    }

    client = new RemoteClient(clientId, this._editorAdapter);
    this._clients.set(clientId, client);

    return client;
  }

  protected _onChange(operation: ITextOperation, inverse: ITextOperation) {
    const cursorBefore = this._cursor;
    this._updateCursor();

    const compose =
      this._undoManager!.canUndo() &&
      inverse.shouldBeComposedWithInverted(
        this._undoManager!.last() as IWrappedOperation
      );

    const inverseMeta = new OperationMeta(this._cursor, cursorBefore);
    this._undoManager!.add(new WrappedOperation(inverse, inverseMeta), compose);
    this.applyClient(operation);
  }

  clearUndoRedoStack(): void {
    this._undoManager!.dispose();
  }

  protected _applyUnredo(operation: IWrappedOperation) {
    this._undoManager!.add(this._editorAdapter.invertOperation(operation));

    this._editorAdapter.applyOperation(operation);

    this._cursor = operation.getCursor();
    if (this._cursor) {
      this._editorAdapter.setCursor(this._cursor);
    }

    this.applyClient(operation);
  }

  protected _undo() {
    if (!this._undoManager!.canUndo()) {
      return;
    }

    this._undoManager!.performUndo((operation: IWrappedOperation) => {
      this._applyUnredo(operation);
      this._trigger(EditorClientEvent.Undo, operation.toString());
    });
  }

  protected _redo() {
    if (!this._undoManager!.canRedo()) {
      return;
    }

    this._undoManager!.performRedo((operation: IWrappedOperation) => {
      this._applyUnredo(operation);
      this._trigger(EditorClientEvent.Redo, operation.toString());
    });
  }

  sendOperation(operation: ITextOperation): void {
    this._databaseAdapter.sendOperation(operation);
  }

  applyOperation(operation: ITextOperation): void {
    this._editorAdapter.applyOperation(operation);
    this._updateCursor();
    this._undoManager!.transform(new WrappedOperation(operation));
    this._emitStatus();
  }

  protected _sendCursor(cursor: ICursor | null) {
    if (this._sendCursorTimeout) {
      clearTimeout(this._sendCursorTimeout);
      this._sendCursorTimeout = null;
    }

    if (this.isAwaitingWithBuffer()) {
      this._sendCursorTimeout = setTimeout(() => {
        this._sendCursor(cursor);
      }, 3);
      return;
    }

    this._databaseAdapter.sendCursor(cursor);
  }

  protected _updateCursor() {
    this._cursor = this._editorAdapter.getCursor();
  }

  protected _onCursorActivity() {
    const oldCursor = this._cursor;
    this._updateCursor();

    if (oldCursor == null && oldCursor == this._cursor) {
      /** Empty Cursor */
      return;
    }

    this._sendCursor(this._cursor);
  }

  protected _onBlur() {
    this._cursor = null;
    this._sendCursor(null);
    this._focused = false;
  }

  protected _onFocus() {
    this._focused = true;
    this._onCursorActivity();
  }
}
