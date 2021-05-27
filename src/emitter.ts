import * as Utils from "./utils";

export type Event = string;

export type EventListener<E> = (eventArgs: E, ...extraArgs: any[]) => void;

export interface IEvent {}

export interface IEventListener<E, C> {
  context: ThisType<C> | null;
  callback: EventListener<E>;
}

export type EventListeners<E, C> = {
  [event: string]: IEventListener<E, C>[];
};

export interface IEventEmitter<T = Event, E = IEvent, C = {}>
  extends Utils.IDisposable {
  /**
   * Add listener to emitter
   * @param event - Event name
   * @param listener - Callback handler
   * @param context - Scope of Callback
   */
  on(event: T, listener: EventListener<E>, context?: ThisType<C>): void;
  /**
   * Remove listener from emitter
   * @param event - Event name
   * @param listener - Callback handler
   */
  off(event: T, listener: EventListener<E>): void;
  /**
   * Trigger an event to listeners
   * @param event - Event Name
   * @param eventAttr - Event Attributes
   * @param extraAttrs - Additionnal Attributes
   */
  trigger(event: Event, eventAttr: E, ...extraAttrs: unknown[]): void;
}

export class EventEmitter<E = IEvent, C = {}>
  implements IEventEmitter<Event, E, C> {
  protected readonly _allowedEvents: Event[] | undefined;
  protected readonly _eventListeners: EventListeners<E, C>;

  /**
   * Creates an Event Emitter.
   * @param allowedEvents - Set of Events that Emitter supports (optional).
   */
  constructor(allowedEvents?: Event[]) {
    this._allowedEvents = allowedEvents;
    this._eventListeners = {};
  }

  on(event: Event, listener: EventListener<E>, context?: ThisType<C>): void {
    this._validateEvent(event);

    this._eventListeners[event] ||= [];
    this._eventListeners[event].push({
      callback: listener,
      context: context || null,
    });
  }

  off(event: Event, listener: EventListener<E>): void {
    this._validateEvent(event);

    const eventListeners = this._eventListeners[event];

    if (!eventListeners || eventListeners.length === 0) {
      return;
    }

    this._eventListeners[event] = eventListeners.filter(
      (eventListener) => eventListener.callback !== listener
    );
  }

  trigger(event: Event, eventAtrr: E, ...extraAttrs: any[]): void {
    const eventListeners = this._eventListeners[event] || [];

    for (const eventListener of eventListeners) {
      const { context, callback } = eventListener;
      callback.call(context, eventAtrr, ...extraAttrs);
    }
  }

  dispose(): void {
    for (const event in this._eventListeners) {
      this._eventListeners[event] = [];
    }
  }

  protected _validateEvent(event: Event): void {
    if (!this._allowedEvents || this._allowedEvents.includes(event)) {
      return;
    }

    Utils.shouldNotBeListenedTo(event);
  }
}
