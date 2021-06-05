import { Cursor } from "../src/cursor";
import { OperationMeta } from "../src/operation-meta";
import { TextOperation } from "../src/text-operation";
import { IUndoManager, UndoManager } from "../src/undo-manager";
import { IWrappedOperation, WrappedOperation } from "../src/wrapped-operation";

describe("Undo Manager", () => {
  let undoManager: IUndoManager;
  let wrappedOperation: IWrappedOperation;

  beforeAll(() => {
    const operation = new TextOperation().retain(15, null);
    const operationMeta = new OperationMeta(new Cursor(0, 0), new Cursor(4, 9));
    wrappedOperation = new WrappedOperation(operation, operationMeta);
  });

  beforeEach(() => {
    undoManager = new UndoManager();
  });

  afterEach(() => {
    undoManager.dispose();
    undoManager = null;
  });

  describe("#dispose", () => {
    it("should cleanup Undo stack", () => {
      undoManager.add(wrappedOperation);
      undoManager.dispose();
      expect(undoManager.canUndo()).toEqual(false);
    });

    it("should cleanup Redo stack", () => {
      undoManager.add(wrappedOperation);
      undoManager.dispose();
      expect(undoManager.canRedo()).toEqual(false);
    });
  });

  describe("#add", () => {
    it("should add operation to Undo stack in normal state", () => {
      undoManager.add(wrappedOperation);
      expect(undoManager.canUndo()).toEqual(true);
    });

    it("should add operation to Redo stack in undoing state", () => {
      undoManager.add(wrappedOperation);
      undoManager.performUndo(() => {
        undoManager.add(wrappedOperation.invert(""));
      });
      expect(undoManager.canRedo()).toEqual(true);
    });

    it("should add operation to Undo stack in redoing state", () => {
      undoManager.add(wrappedOperation);
      undoManager.performUndo(() => {
        undoManager.add(wrappedOperation.invert(""));
      });
      undoManager.performRedo(() => {
        undoManager.add(wrappedOperation);
      });
      expect(undoManager.canUndo()).toEqual(true);
    });
  });

  describe("#last", () => {
    it("should return last operation in Undo stack", () => {
      undoManager.add(wrappedOperation);
      expect(undoManager.last()).toEqual(wrappedOperation);
    });
  });

  describe("#transform", () => {
    it("should transform Undo/Redo stack to incoming operation", () => {
      undoManager.add(wrappedOperation);
      const operation = new TextOperation()
        .retain(15, null)
        .insert("Hello", null);
      undoManager.transform(operation);
      expect(undoManager.last()).not.toEqual(wrappedOperation);
    });
  });

  describe("#isUndoing", () => {
    it("should return true if the manager is undoing an operation", (done) => {
      undoManager.add(wrappedOperation);
      undoManager.performUndo(() => {
        expect(undoManager.isUndoing()).toEqual(true);
        done();
      });
    });
  });
});
