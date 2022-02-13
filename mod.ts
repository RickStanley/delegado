type DelegatableTarget = typeof window | HTMLElement;
type DelegatableEvents = keyof (WindowEventMap & HTMLElementEventMap);
type DelegatorFunction = (event: Event) => void;
type DatasetAction = HTMLElement['dataset'] | string;
type DelegatableEventWithOptions = {
  event: DelegatableEvents,
  options: AddEventListenerOptions
};

const delegationsWeakMap = new WeakMap<
  DelegatableTarget,
  Map<DelegatableEvents, Map<DatasetAction, Set<DelegatorFunction>>>
>();
const delegatablesEventsWeakMap = new WeakMap<
  DelegatableTarget,
  DelegatableEvents[]
>();
const anonymousDelegationsWeakMap = new WeakMap<
  DelegatableTarget,
  Map<DelegatableEvents, Set<DelegatorFunction>>
>();

const errorMessages = Object.freeze({
  targetExistsInAnyMap: "Target not found within delegatables maps. Please define with `attachEvents()` directive.",
  eventExistsInTarget: "No event found for given target."
});

const initWeakMaps = (target: DelegatableTarget, events: (DelegatableEvents | DelegatableEventWithOptions)[]) => {
  const eventsAreObjects = events.every(event => typeof event === "object");

  delegationsWeakMap.set(
    target,
    new Map(events.map((event) =>
      [eventsAreObjects ? (event as DelegatableEventWithOptions).event : event as DelegatableEvents, new Map()]))
  );

  anonymousDelegationsWeakMap.set(
    target,
    new Map(events.map((event) =>
      [eventsAreObjects ? (event as DelegatableEventWithOptions).event : event as DelegatableEvents, new Set()]))
  );

  if (eventsAreObjects)
    delegatablesEventsWeakMap.set(target,
      (events as DelegatableEventWithOptions[])
        .reduce((previous, current) => [...previous, current.event], [] as DelegatableEvents[])
    );
  else
    delegatablesEventsWeakMap.set(target, events as DelegatableEvents[]);
};

const attachEvents = (target: DelegatableTarget, events: DelegatableEvents[]) => {
  if (delegationsWeakMap.has(target)) return false;

  initWeakMaps(target, events);

  events.map(event => delegator(event, target));

  //@ts-ignore
  target = null;
  return true;
};

const attachEventsWithOptions = (
  target: DelegatableTarget,
  events: DelegatableEventWithOptions[]
) => {
  if (delegationsWeakMap.has(target)) return false;

  initWeakMaps(target, events);

  events.map(event => delegator(event.event, target, event.options));

  //@ts-ignore
  target = null;
  return true;
};

const removeDelegation = (
  event: DelegatableEvents,
  target: DelegatableTarget,
  callbackReference?: DelegatorFunction,
  action?: DatasetAction
): boolean => {
  if (action) {
    if (callbackReference)
      return delegationsWeakMap
        .get(target)!
        .get(event)!
        .get(action)!
        .delete(callbackReference);

    delegationsWeakMap
      .get(target)!
      .get(event)!
      .get(action)!
      .clear();
    return true;
  }

  if (callbackReference)
    return anonymousDelegationsWeakMap
      .get(target)!
      .get(event)!
      .delete(callbackReference);

  anonymousDelegationsWeakMap.get(target)!.get(event)!.clear();
  return true;
};

const delegateMany = (
  target: DelegatableTarget,
  event: DelegatableEvents,
  callbacks: DelegatorFunction[],
): boolean => {
  tryGuardOperation(target, event);

  callbacks.map((callback) =>
    anonymousDelegationsWeakMap.get(target)!.get(event)!.add(callback)
  );
  return true;
};

const delegateManyWithAction = (
  target: DelegatableTarget,
  event: DelegatableEvents,
  action: DatasetAction,
  callbacks: DelegatorFunction[]
): boolean => {
  tryGuardOperation(target, event);

  delegationsWeakMap.get(target)!.get(event)!.has(action)
    ? callbacks.map((callback) =>
      delegationsWeakMap.get(target)!.get(event)!.get(action)!.add(callback)
    )
    : delegationsWeakMap
      .get(target)!
      .get(event)!
      .set(action, new Set(callbacks));
  return true;
};

const delegate = (
  target: DelegatableTarget,
  event: DelegatableEvents,
  callback: DelegatorFunction
): boolean => {
  tryGuardOperation(target, event);

  anonymousDelegationsWeakMap.get(target)!.get(event)!.add(callback);
  return true;
};

const delegateWithAction = (
  target: DelegatableTarget,
  event: DelegatableEvents,
  action: DatasetAction,
  callback: DelegatorFunction
): boolean => {
  delegationsWeakMap.get(target)!.get(event)!.has(action) ?
    delegationsWeakMap.get(target)!.get(event)!.get(action)!.add(callback) :
    delegationsWeakMap.get(target)!.get(event)!.set(action, new Set([callback]));
  return true;
};

const delegator = (
  eventToDelegate: DelegatableEvents,
  target: DelegatableTarget,
  options?: AddEventListenerOptions
) => {
  target.addEventListener(eventToDelegate, (event) => {
    const action =
      (<HTMLElement>event.target)?.closest<HTMLElement>("[data-action]")
        ?.dataset.action || "";

    anonymousDelegationsWeakMap
      .get(event.currentTarget as DelegatableTarget)!
      .get(eventToDelegate)
      ?.forEach((callback) => callback(event));

    if (action) {
      delegationsWeakMap
        .get(event.currentTarget as DelegatableTarget)!
        .get(eventToDelegate)
        ?.get(action)
        ?.forEach((callback) => callback(event));
    }

    //@ts-ignore
    event = null;
  }, options);
  //@ts-ignore
  target = null;
};

const targetExistsInAnyMap =
  (target: DelegatableTarget) =>
    delegationsWeakMap.has(target) && anonymousDelegationsWeakMap.has(target);

const eventExistsInTarget =
  (target: DelegatableTarget, event: DelegatableEvents) =>
    delegationsWeakMap.get(target)?.has(event) && anonymousDelegationsWeakMap.get(target)?.has(event);

const throwError = (message: string) => { throw new Error(message) };

const tryGuardOperation =
  (target: DelegatableTarget, event: DelegatableEvents) => {
    const checks = [targetExistsInAnyMap, eventExistsInTarget];
    for (const check of checks) {
      const result = check(target, event);
      if (!result) {
        const functionName = check.name as keyof typeof errorMessages;
        const errorMessage = errorMessages[functionName];
        throwError(errorMessage);
      }
    }
    return true;
  };


export {
  attachEvents,
  attachEventsWithOptions,
  delegateMany,
  delegateManyWithAction,
  delegate,
  delegateWithAction,
  removeDelegation
};
