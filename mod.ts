type DelegatableTarget = typeof window | HTMLElement;
type DelegatableEvents = keyof (WindowEventMap & HTMLElementEventMap);
type DelegatorFunction = (event: Event) => void;
type DatasetAction = HTMLElement['dataset'] | string;
type DelegatableEventWithOptions = {
  event: DelegatableEvents,
  options: AddEventListenerOptions
};

const symbolKeys = new WeakMap<DelegatableTarget, symbol>();
const delegationsMap = new Map<
  symbol,
  Map<DelegatableEvents, Map<DatasetAction, Set<DelegatorFunction>>>
>();
const delegatablesEventsMap = new Map<
  symbol,
  DelegatableEvents[]
>();
const anonymousDelegationsMap = new Map<
  symbol,
  Map<DelegatableEvents, Set<DelegatorFunction>>
>();

const cleanUp = (symbolKey: symbol): void => {
  delegatablesEventsMap.delete(symbolKey);
  delegationsMap.delete(symbolKey);
  anonymousDelegationsMap.delete(symbolKey);
};

const cleanUpTarget = (target: DelegatableTarget): void => cleanUp(symbolKeys.get(target)!);

const collector = new FinalizationRegistry<symbol>(cleanUp);

const initMaps = (target: DelegatableTarget, events: (DelegatableEvents | DelegatableEventWithOptions)[]) => {
  const eventsAreObjects = events.every(event => typeof event === "object");

  const symbol = Symbol();

  symbolKeys.set(target, symbol);

  delegationsMap.set(
    symbol,
    new Map(events.map((event) =>
      [eventsAreObjects ? (event as DelegatableEventWithOptions).event : event as DelegatableEvents, new Map()]))
  );

  anonymousDelegationsMap.set(
    symbol,
    new Map(events.map((event) =>
      [eventsAreObjects ? (event as DelegatableEventWithOptions).event : event as DelegatableEvents, new Set()]))
  );

  if (eventsAreObjects)
    delegatablesEventsMap.set(symbol,
      (events as DelegatableEventWithOptions[])
        .reduce((previous, current) => [...previous, current.event], [] as DelegatableEvents[])
    );
  else
    delegatablesEventsMap.set(symbol, events as DelegatableEvents[]);

  collector.register(target, symbol);
};

const attachEvents = (target: DelegatableTarget, events: DelegatableEvents[]) => {
  if (symbolKeys.has(target))
    throwNoTargetFound();

  initMaps(target, events);

  events.map(event => delegator(event, target));

  //@ts-ignore
  target = null;
  return true;
};

const attachEventsWithOptions = (
  target: DelegatableTarget,
  events: DelegatableEventWithOptions[]
) => {
  if (symbolKeys.has(target))
    throwNoTargetFound();

  initMaps(target, events);

  events.map(event => delegator(event.event, target, event.options));

  target = null;
  return true;
};

const removeDelegation = (
  event: DelegatableEvents,
  target: DelegatableTarget,
  callbackReference?: DelegatorFunction,
  action?: DatasetAction
): void => {
  if (action) {
    if (callbackReference) {
      delegationsMap
        .get(symbolKeys.get(target)!)!
        .get(event)!
        .get(action)!
        .delete(callbackReference);
      return;
    }

    delegationsMap
      .get(symbolKeys.get(target)!)!
      .get(event)!
      .get(action)!
      .clear();
    return;
  }

  if (callbackReference) {
    anonymousDelegationsMap
      .get(symbolKeys.get(target)!)!
      .get(event)!
      .delete(callbackReference);
    return;
  }

  anonymousDelegationsMap.get(symbolKeys.get(target)!)!.get(event)!.clear();
};

/**
 * Delegate many callbacks to a target in an event.
 * @param target The sender.
 * @param event The event to delegate.
 * @param callbacks The functions wich is called when the delegation happens.
 * @example
 * // attach delegatable events to a target.
 * attachEvents(document.getElementById("some-element"), ["click"]);
 * 
 * // delegate the event for the same target.
 * delegateMany(
 *   document.getElementyById("some-element"),
 *   "click",
 *   [
 *    (clickEvent) => {
 *      console.log("hello 1!");
 *    },
 *    (clickEvent) => {
 *      console.log("hello 2!");
 *    }
 *   ]
 * )
 */
const delegateMany = (
  target: DelegatableTarget,
  event: DelegatableEvents,
  callbacks: DelegatorFunction[],
): void => {
  tryGuardOperation(target, event);

  callbacks.map((callback) =>
    anonymousDelegationsMap.get(symbolKeys.get(target)!)!.get(event)!.add(callback)
  );
};

/**
 * Delegate many callbacks to a target in an event and an action.
 * @param target The sender.
 * @param event The event to delegate.
 * @param action The action to delegate. E.g.: "do:action", "toggle:menu".
 * @param callbacks The functions wich is called when the delegation happens.
 * @example
 * // attach delegatable events to a target.
 * attachEvents(document.getElementById("some-element"), ["click"]);
 * 
 * // delegate the event and action for the same target.
 * delegateManyWithAction(
 *   document.getElementyById("some-element"),
 *   "click",
 *   "do:log",
 *   [
 *    (clickEvent) => {
 *      console.log("hello 1!");
 *    },
 *    (clickEvent) => {
 *      console.log("hello 2!");
 *    }
 *   ]
 * )
 */
const delegateManyWithAction = (
  target: DelegatableTarget,
  event: DelegatableEvents,
  action: DatasetAction,
  callbacks: DelegatorFunction[]
): void => {
  tryGuardOperation(target, event);

  delegationsMap.get(symbolKeys.get(target)!)!.get(event)!.has(action)
    ? callbacks.map((callback) =>
      delegationsMap.get(symbolKeys.get(target)!)!.get(event)!.get(action)!.add(callback)
    )
    : delegationsMap
      .get(symbolKeys.get(target)!)!
      .get(event)!
      .set(action, new Set(callbacks));
};

/**
 * Delegate a single event (anonymous delegation).
 * @param target The sender.
 * @param event The event to delegate.
 * @param callback The function wich is called when the delegation happens.
 * @example
 * // attach delegatable events to a target.
 * attachEvents(document.getElementById("some-element"), ["click"]);
 * 
 * // delegate the event for the same target.
 * delegate(
 *   document.getElementyById("some-element"),
 *   "click",
 *   (clickEvent) => {
 *      console.log("hello 1!");
 *   },
 * )
 */
const delegate = (
  target: DelegatableTarget,
  event: DelegatableEvents,
  callback: DelegatorFunction
): void => {
  tryGuardOperation(target, event);

  anonymousDelegationsMap.get(symbolKeys.get(target)!)!.get(event)!.add(callback);
};

/**
 * Delegate a event and action with a single function.
 * @param target The sender.
 * @param event The event to delegate.
 * @param action The action to delegate.
 * @param callback The function wich is called when the delegation happens.
 * @example
 * // attach delegatable events to a target.
 * attachEvents(document.getElementById("some-element"), ["click"]);
 * 
 * // delegate the event for the same target.
 * delegate(
 *   document.getElementyById("some-element"),
 *   "click",
 *   "toggle:button",
 *   (clickEvent) => {
 *      console.log("hello 1!");
 *   },
 * )
 */
const delegateWithAction = (
  target: DelegatableTarget,
  event: DelegatableEvents,
  action: DatasetAction,
  callback: DelegatorFunction
): void => {
  if (!symbolKeys.has(target))
    throwNoTargetFound();

  delegationsMap.get(symbolKeys.get(target)!).get(event)!.has(action) ?
  delegationsMap.get(symbolKeys.get(target)!).get(event)!.get(action)!.add(callback) :
    delegationsMap.get(symbolKeys.get(target)!).get(event)!.set(action, new Set([callback]));
};

const delegator = (
  eventToDelegate: DelegatableEvents,
  target: DelegatableTarget,
  options?: AddEventListenerOptions
): void => {
  target.addEventListener(eventToDelegate, (event) => {
    const action =
      (<HTMLElement>event.target)?.closest<HTMLElement>("[data-action]")
        ?.dataset.action || "";

    anonymousDelegationsMap
      .get(symbolKeys.get(event.currentTarget as DelegatableTarget)!)!
      .get(eventToDelegate)
      ?.forEach((callback) => callback(event));

    if (action) {
      delegationsMap
        .get(symbolKeys.get(event.currentTarget as DelegatableTarget)!)!
        .get(eventToDelegate)
        ?.get(action)
        ?.forEach((callback) => callback(event));
    }

    event = null;
  }, options);

  target = null;
};

const throwError = (message: string) => { throw new Error(message) };

const throwNoTargetFound = () =>
  throwError("No target found in keys. Please, initialize the target with initWeakMaps function");

const tryGuardOperation =
  (target: DelegatableTarget, event: DelegatableEvents): void => {
    if (!symbolKeys.has(target)) throwNoTargetFound();

    if (
      !delegationsMap.get(symbolKeys.get(target)!)?.has(event) &&
      anonymousDelegationsMap.get(symbolKeys.get(target)!)?.has(event)
    )
      throwError("No event found for given target");
  };


export {
  attachEvents,
  attachEventsWithOptions,
  delegateMany,
  delegateManyWithAction,
  delegate,
  delegateWithAction,
  removeDelegation,
  cleanUpTarget
};
