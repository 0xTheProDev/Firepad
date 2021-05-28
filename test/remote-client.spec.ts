import { Cursor } from "../src/cursor";
import { UserIDType } from "../src/database-adapter";
import { IEditorAdapter } from "../src/editor-adapter";
import { IRemoteClient, RemoteClient } from "../src/remote-client";

describe("Remote Client", () => {
  let clientId: UserIDType;
  let remoteClient: IRemoteClient;
  let editorAdapter: Partial<IEditorAdapter>;
  let setOtherCursorStub: Function;
  let disposeStub: Function;

  beforeAll(() => {
    clientId = Math.round(Math.random() * 100);
    setOtherCursorStub = jest.fn();
    disposeStub = jest.fn();

    editorAdapter = {
      setOtherCursor(clientId, cursor, userColor, userName) {
        setOtherCursorStub(clientId, cursor, userColor, userName);
        return {
          dispose() {
            disposeStub();
          },
        };
      },
    };

    remoteClient = new RemoteClient(clientId, editorAdapter as IEditorAdapter);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("#setColor", () => {
    it("should set cursor/selection color for remote user", () => {
      const fn = () => remoteClient.setColor("#fff");
      expect(fn).not.toThrowError();
    });
  });

  describe("#setUserName", () => {
    it("should set name/short-name for remote user", () => {
      const fn = () => remoteClient.setUserName("Robin");
      expect(fn).not.toThrowError();
    });
  });

  describe("#updateCursor", () => {
    it("should update cursor/selection position for remote user", () => {
      const userCursor = new Cursor(5, 8);
      remoteClient.updateCursor(userCursor);
      expect(setOtherCursorStub).toHaveBeenCalledWith(
        clientId,
        userCursor,
        "#fff",
        "Robin"
      );
    });
  });

  describe("#removeCursor", () => {
    it("should remove cursor/selection for remote user", () => {
      remoteClient.removeCursor();
      expect(disposeStub).toHaveBeenCalled();
    });
  });
});
