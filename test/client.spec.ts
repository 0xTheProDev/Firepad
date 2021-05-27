import { Client, IBaseClient, IClient } from "../src/client";
import { ITextOperation, TextOperation } from "../src/text-operation";

describe("Client", () => {
  let client: IClient;
  let operator: IBaseClient;
  let sendOperationStub: Function;
  let applyOperationStub: Function;

  beforeAll(() => {
    sendOperationStub = jest.fn();
    applyOperationStub = jest.fn();

    operator = {
      sendOperation(operation: ITextOperation) {
        return sendOperationStub(operation);
      },
      applyOperation(operation: ITextOperation) {
        return applyOperationStub(operation);
      },
    };
  });

  beforeEach(() => {
    client = new Client(operator);
  });

  afterEach(() => {
    client.dispose();
    jest.resetAllMocks();
  });

  it("should start with `Synchronized` state", () => {
    expect(client.isSynchronized()).toEqual(true);
  });

  describe("#applyClient", () => {
    it("should transition to `AwaitingConfirm` state on receiving operation from document in `Synchronized` state", () => {
      client.applyClient(new TextOperation());
      expect(client.isAwaitingConfirm()).toEqual(true);
    });

    it("should send operation to server on receiving operation from document in `Synchronized` state", () => {
      const operation = new TextOperation();
      client.applyClient(operation);
      expect(sendOperationStub).toHaveBeenCalledWith(operation);
    });

    it("should transition to `AwaitingWithBuffer` state on receiving operation from document in `AwaitingConfirm` state", () => {
      client.applyClient(new TextOperation());
      client.applyClient(new TextOperation());
      expect(client.isAwaitingWithBuffer()).toEqual(true);
    });

    it("should stay in `AwaitingWithBuffer` state on receiving operation from document in `AwaitingWithBuffer` state", () => {
      client.applyClient(new TextOperation());
      client.applyClient(new TextOperation());
      client.applyClient(new TextOperation());
      expect(client.isAwaitingWithBuffer()).toEqual(true);
    });
  });

  describe("#applyServer", () => {
    it("should stay in `Synchronized` state on receiving operation from server in `Synchronized` state", () => {
      client.applyServer(new TextOperation());
      expect(client.isSynchronized()).toEqual(true);
    });

    it("should apply changes to document on receiving operation from server in `Synchronized` state", () => {
      const operation = new TextOperation();
      client.applyServer(operation);
      expect(applyOperationStub).toHaveBeenCalledWith(operation);
    });

    it("should stay in `AwaitingConfirm` state on receiving operation from server in `AwaitingConfirm` state", () => {
      client.applyClient(new TextOperation());
      client.applyServer(new TextOperation());
      expect(client.isAwaitingConfirm()).toEqual(true);
    });

    it("should apply changes to document on receiving operation from server in `AwaitingConfirm` state", () => {
      client.applyClient(new TextOperation());
      const operation = new TextOperation();
      client.applyServer(operation);
      expect(applyOperationStub).toHaveBeenCalledWith(operation);
    });

    it("should stay in `AwaitingWithBuffer` state on receiving operation from server in `AwaitingWithBuffer` state", () => {
      client.applyClient(new TextOperation());
      client.applyClient(new TextOperation());
      client.applyServer(new TextOperation());
      expect(client.isAwaitingWithBuffer()).toEqual(true);
    });

    it("should apply changes to document on receiving operation from server in `AwaitingWithBuffer` state", () => {
      client.applyClient(new TextOperation());
      client.applyClient(new TextOperation());
      const operation = new TextOperation();
      client.applyServer(operation);
      expect(applyOperationStub).toHaveBeenCalledWith(operation);
    });
  });

  describe("#serverAck", () => {
    it("should throw error if called in `Synchronized` state", () => {
      const fn = () => client.serverAck();
      expect(fn).toThrowError();
    });

    it("should transition to `Synchronized` state on receiving acknowledgement from document in `AwaitingConfirm` state", () => {
      client.applyClient(new TextOperation());
      client.serverAck();
      expect(client.isSynchronized()).toEqual(true);
    });

    it("should transition to `AwaitingConfirm` state on receiving acknowledgement from server in `AwaitingWithBuffer` state", () => {
      client.applyClient(new TextOperation());
      client.applyClient(new TextOperation());
      client.serverAck();
      expect(client.isAwaitingConfirm()).toEqual(true);
    });

    it("should send outstanding operation to server on receiving acknowledgement from document in `AwaitingWithBuffer` state", () => {
      const operation = new TextOperation();
      client.applyClient(new TextOperation());
      client.applyClient(operation);
      client.serverAck();
      expect(sendOperationStub).toHaveBeenNthCalledWith(2, operation);
    });
  });

  describe("#serverRetry", () => {
    it("should throw error if called in `Synchronized` state", () => {
      const fn = () => client.serverRetry();
      expect(fn).toThrowError();
    });

    it("should stay in `AwaitingConfirm` state on receiving error from server in `AwaitingConfirm` state", () => {
      client.applyClient(new TextOperation());
      client.serverRetry();
      expect(client.isAwaitingConfirm()).toEqual(true);
    });

    it("should resend operation on receiving error from server in `AwaitingConfirm` state", () => {
      const operation = new TextOperation();
      client.applyClient(operation);
      client.serverRetry();
      expect(sendOperationStub).toHaveBeenNthCalledWith(2, operation);
    });

    it("should resend operation on receiving error from server in `AwaitingWithBuffer` state", () => {
      client.applyClient(new TextOperation());
      const operation = new TextOperation();
      client.applyClient(operation);
      client.serverRetry();
      expect(sendOperationStub).toHaveBeenNthCalledWith(2, operation);
    });
  });
});
