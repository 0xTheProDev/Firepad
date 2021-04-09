import * as monaco from "monaco-editor";
import { ClientIDType } from "./editor-adapter";
import { IDisposable, Utils } from "./utils";

export interface ICursorWidgetConstructorOptions {
  clientId: ClientIDType;
  editor: monaco.editor.IStandaloneCodeEditor;
  range: monaco.Range;
  userColor: string;
  userName: string;
}

export interface ICursorWidget
  extends monaco.editor.IContentWidget,
    IDisposable {
  /**
   * Update Widget position according to the Cursor position.
   * @param position - Current Position of the Cursor.
   */
  updatePosition(position: monaco.Range): void;
  /**
   * Update Widget content when Username changes.
   * @param userName - New Username of the current User.
   */
  updateContent(userName?: string): void;
}

export class CursorWidget implements ICursorWidget {
  protected readonly _domNode: HTMLElement;
  protected readonly _editor: monaco.editor.IStandaloneCodeEditor;
  protected readonly _id: ClientIDType;

  protected _color: string;
  protected _content: string;
  protected _range: monaco.Range;

  readonly allowEditorOverflow: boolean;

  static readonly WIDGET_NODE_CLASSNAME = "firepad-remote-cursor";
  static readonly MESSAGE_NODE_CLASSNAME = "firepad-remote-cursor-message";

  constructor({
    editor,
    range,
    userColor,
    clientId,
    userName,
  }: ICursorWidgetConstructorOptions) {
    this.allowEditorOverflow = true;

    this._id = clientId;
    this._editor = editor;

    this._color = userColor;
    this._content = userName;
    this._range = range;

    this._domNode = this._createWidgetNode();
    this._editor.addContentWidget(this);
  }

  getId(): string {
    return `firepad.cursor.${this._id}`;
  }

  getDomNode(): HTMLElement {
    return this._domNode;
  }

  getPosition(): monaco.editor.IContentWidgetPosition {
    return {
      position: this._range.getEndPosition(),
      range: this._range,
      preference: [
        monaco.editor.ContentWidgetPositionPreference.ABOVE,
        monaco.editor.ContentWidgetPositionPreference.BELOW,
      ],
    };
  }

  updatePosition(range: monaco.Range): void {
    this._range = range;
    this._editor.layoutContentWidget(this);
  }

  updateContent(userName?: string): void {
    if (typeof userName !== "string" || userName === this._content) {
      return;
    }

    const messageNode = this._domNode.firstChild!;
    messageNode.textContent = userName;
  }

  dispose(): void {
    this._editor.removeContentWidget(this);
  }

  protected _colorWithCSSVars(property: string): string {
    const varName = `--color-${property}-${CursorWidget.WIDGET_NODE_CLASSNAME}`;
    return `var(${varName}, ${this._color})`;
  }

  protected _createMessageNode(): HTMLElement {
    const messageNode = document.createElement("div");

    messageNode.style.borderColor = this._colorWithCSSVars("border");
    messageNode.style.backgroundColor = this._colorWithCSSVars("bg");

    messageNode.textContent = this._content;

    const className = `${
      CursorWidget.MESSAGE_NODE_CLASSNAME
    }-${this._color.replace("#", "")}`;
    messageNode.classList.add(className, CursorWidget.MESSAGE_NODE_CLASSNAME);

    return messageNode;
  }

  protected _createArrowDownNode(): HTMLElement {
    const size = "0",
      border = "5px solid",
      borderColor = "transparent";

    const arrowDownNode = document.createElement("div");

    arrowDownNode.style.width = arrowDownNode.style.height = size;
    arrowDownNode.style.borderTop = arrowDownNode.style.borderLeft = arrowDownNode.style.borderRight = border;
    arrowDownNode.style.borderLeftColor = arrowDownNode.style.borderRightColor = borderColor;
    arrowDownNode.style.borderTopColor = this._colorWithCSSVars("border");

    return arrowDownNode;
  }

  protected _createWidgetNode(): HTMLElement {
    Utils.validateTruth(document != null, "This package must run on browser!");

    const widgetNode = document.createElement("div");

    const messageNode = this._createMessageNode();
    widgetNode.appendChild(messageNode);

    const arrowDownNode = this._createArrowDownNode();
    widgetNode.appendChild(arrowDownNode);

    widgetNode.classList.add(
      "monaco-editor-overlaymessage",
      CursorWidget.WIDGET_NODE_CLASSNAME
    );

    return widgetNode;
  }
}
