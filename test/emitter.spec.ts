import {
  EventType,
  EventEmitter,
  EventListenerType,
  IEventEmitter,
} from "../src/emitter";

describe("Emitter", () => {
  let event: EventType;
  let emitter: IEventEmitter;
  let eventListener: EventListenerType<unknown>;

  beforeAll(() => {
    event = "Some Event";
    eventListener = jest.fn();
  });

  beforeEach(() => {
    emitter = new EventEmitter([event]);
  });

  afterEach(() => {
    emitter.dispose();
    jest.resetAllMocks();
  });

  describe("#on", () => {
    it("should attach event listener to emitter for valid event", () => {
      const fn = () => emitter.on(event, eventListener);
      expect(fn).not.toThrowError();
    });

    it("should throw error for invalid event", () => {
      const otherEvent = "Some Other Event";
      const fn = () => emitter.on(otherEvent, eventListener);
      expect(fn).toThrowError();
    });
  });

  describe("#off", () => {
    it("should detach event listener to emitter for valid event", () => {
      const fn = () => emitter.off(event, eventListener);
      expect(fn).not.toThrowError();
    });

    it("should throw error for invalid event", () => {
      const otherEvent = "Some Other Event";
      const fn = () => emitter.off(otherEvent, eventListener);
      expect(fn).toThrowError();
    });
  });

  describe("#trigger", () => {
    it("should invoke event listener for given event", () => {
      const eventAtrr = "Some Event Details";
      emitter.on(event, eventListener);
      emitter.trigger(event, eventAtrr);
      expect(eventListener).toHaveBeenCalledWith(eventAtrr);
    });

    it("should not invoke event listener after detachment", () => {
      const eventAtrr = "Some Event Details";
      emitter.on(event, eventListener);
      emitter.off(event, eventListener);
      emitter.trigger(event, eventAtrr);
      expect(eventListener).not.toHaveBeenCalled();
    });

    it("should not throw error if no listener is attached", () => {
      const eventAtrr = "Some Event Details";
      const fn = () => emitter.trigger(event, eventAtrr);
      expect(fn).not.toThrowError();
    });
  });
});
