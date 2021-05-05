/*
 * Copyright (c) 2019 Convergence Labs, Inc.
 *
 * This file is part of the Monaco Collaborative Extensions, which is
 * released under the terms of the MIT license. A copy of the MIT license
 * is usually provided as part of this source code package in the LICENCE
 * file. If it was not, please see <https://opensource.org/licenses/MIT>
 */

import * as monaco from "monaco-editor";
import { ClientIDType } from "./editor-adapter";
import { IDisposable, Utils } from "./utils";

export interface ICursorWidgetConstructorOptions {
  codeEditor: monaco.editor.ICodeEditor;
  widgetId: ClientIDType;
  color: string;
  label: string;
  range: monaco.Range;
  tooltipDuration?: number;
  onDisposed: OnDisposed;
}

export interface ICursorWidget
  extends monaco.editor.IContentWidget,
    IDisposable {
  /**
   * Update Widget position according to the Cursor position.
   * @param range - Current Position of the Cursor.
   */
  updatePosition(range: monaco.Range): void;
  /**
   * Update Widget content when Username changes.
   * @param userName - New Username of the current User.
   */
  updateContent(userName?: string): void;
}

type OnDisposed = () => void;

/**
 * This class implements a Monaco Content Widget to render a remote user's
 * name in a tooltip.
 *
 * @internal
 */
export class CursorWidget
  implements monaco.editor.IContentWidget, IDisposable, ICursorWidget {
  private readonly _id: string;
  private readonly _editor: monaco.editor.ICodeEditor;
  private readonly _domNode: HTMLElement;
  private _tooltipNode: HTMLElement;
  private readonly _tooltipDuration: number;
  private readonly _scrollListener: IDisposable | null;
  private readonly _onDisposed: OnDisposed;
  static readonly WIDGET_NODE_CLASSNAME = "firepad-remote-cursor";
  static readonly MESSAGE_NODE_CLASSNAME = "firepad-remote-cursor-message";

  protected _color: string;
  protected _content: string;
  private _position: monaco.editor.IContentWidgetPosition | null;
  private _hideTimer: any;
  private _disposed: boolean;

  constructor({
    codeEditor,
    widgetId,
    color,
    label,
    range,
    tooltipDuration = 1000,
    onDisposed,
  }: ICursorWidgetConstructorOptions) {
    this._editor = codeEditor;
    this._tooltipDuration = tooltipDuration;
    this._id = `monaco-remote-cursor-${widgetId}`;
    this._onDisposed = onDisposed;
    this._color = color;
    this._content = label;

    this._domNode = this._createWidgetNode();

    // we only need to listen to scroll positions to update the
    // tooltip location on scrolling.
    this._scrollListener = this._editor.onDidScrollChange(() => {
      this._updateTooltipPosition();
    });

    this.updatePosition(range);

    this._hideTimer = null;
    this._editor.addContentWidget(this);

    this._disposed = false;
  }

  public getId(): string {
    return this._id;
  }

  public getDomNode(): HTMLElement {
    return this._domNode;
  }

  public getPosition(): monaco.editor.IContentWidgetPosition | null {
    return this._position;
  }

  public updatePosition(range: monaco.Range): void {
    this._updatePosition(range);
    setTimeout(() => this._showTooltip(), 0);
  }

  updateContent(userName?: string): void {
    if (typeof userName !== "string" || userName === this._content) {
      return;
    }
    this._tooltipNode.textContent = userName;
  }

  public dispose(): void {
    if (this._disposed) {
      return;
    }

    this._editor.removeContentWidget(this);
    if (this._scrollListener !== null) {
      this._scrollListener.dispose();
    }

    this._disposed = true;
    this._onDisposed();
  }

  public isDisposed(): boolean {
    return this._disposed;
  }

  private _updatePosition(range: monaco.Range): void {
    this._position = {
      position: range.getEndPosition(),
      preference: [
        monaco.editor.ContentWidgetPositionPreference.ABOVE,
        monaco.editor.ContentWidgetPositionPreference.BELOW,
      ],
    };

    this._editor.layoutContentWidget(this);
  }

  private _showTooltip(): void {
    this._updateTooltipPosition();

    if (this._hideTimer !== null) {
      clearTimeout(this._hideTimer);
    } else {
      this._setTooltipVisible(true);
    }

    this._hideTimer = setTimeout(() => {
      this._setTooltipVisible(false);
      this._hideTimer = null;
    }, this._tooltipDuration);
  }

  private _updateTooltipPosition(): void {
    const distanceFromTop =
      this._domNode.offsetTop - this._editor.getScrollTop();
    if (distanceFromTop - this._tooltipNode.offsetHeight < 5) {
      this._tooltipNode.style.top = `${this._tooltipNode.offsetHeight + 2}px`;
    } else {
      this._tooltipNode.style.top = `-${this._tooltipNode.offsetHeight}px`;
    }

    this._tooltipNode.style.left = "0";
  }

  private _setTooltipVisible(visible: boolean): void {
    if (visible) {
      this._tooltipNode.style.opacity = "1.0";
    } else {
      this._tooltipNode.style.opacity = "0";
    }
  }

  protected _colorWithCSSVars(property: string): string {
    const varName = `--color-${property}-${CursorWidget.WIDGET_NODE_CLASSNAME}`;
    return `var(${varName}, ${this._color})`;
  }

  protected _createMessageNode(): HTMLElement {
    const messageNode = document.createElement("div");

    messageNode.style.borderColor = this._colorWithCSSVars("border");
    messageNode.style.backgroundColor = this._colorWithCSSVars("bg");
    messageNode.style.color = Utils.getTextColor(this._color);
    messageNode.style.borderRadius = "2px";
    messageNode.style.fontSize = "12px";
    messageNode.style.padding = "2px 8px";
    messageNode.style.whiteSpace = "nowrap";

    messageNode.textContent = this._content;

    const className = `${
      CursorWidget.MESSAGE_NODE_CLASSNAME
    }-${this._color.replace("#", "")}`;
    messageNode.classList.add(className, CursorWidget.MESSAGE_NODE_CLASSNAME);

    return messageNode;
  }

  protected _createWidgetNode(): HTMLElement {
    Utils.validateTruth(document != null, "This package must run on browser!");

    const widgetNode = document.createElement("div");
    widgetNode.style.height = "20px";
    widgetNode.style.paddingBottom = "0px";
    widgetNode.style.transition = "all 0.1s linear";

    this._tooltipNode = this._createMessageNode();
    widgetNode.appendChild(this._tooltipNode);

    widgetNode.classList.add(
      "monaco-editor-overlaymessage",
      CursorWidget.WIDGET_NODE_CLASSNAME
    );

    return widgetNode;
  }
}
