type DelegatableTarget = typeof window | HTMLElement;
type DelegatableEvents = keyof (WindowEventMap & HTMLElementEventMap);
type DelegatorFunction = (event: Event) => void;

const delegatablesWeakMap = new WeakMap<
  DelegatableTarget,
  Map<DelegatableEvents, Map<string, Set<DelegatorFunction>>>
>();
const delegatablesEventsWeakMap = new WeakMap<
  DelegatableTarget,
  DelegatableEvents[]
>();
const anomnymousDelegationsWeakMap = new WeakMap<
  DelegatableTarget,
  Map<DelegatableEvents, Set<DelegatorFunction>>
>();

const attachTo = (target: DelegatableTarget, events: DelegatableEvents[]) => {
  if (delegatablesWeakMap.has(target)) return false;

  delegatablesWeakMap.set(
    target,
    new Map(events.map((event) => [event, new Map()]))
  );
  anomnymousDelegationsWeakMap.set(
    target,
    new Map(events.map((event) => [event, new Set()]))
  );
  delegatablesEventsWeakMap.set(target, events);

  for (const event of events) delegator(event, target);

  target = null;
  return true;
};

const delegator = (
  eventToDelegate: DelegatableEvents,
  target: DelegatableTarget
) => {
  target.addEventListener(eventToDelegate, (event) => {
    const action =
      (<HTMLElement>event.target)?.closest<HTMLElement>("[data-action]")
        ?.dataset.action || "";

    if (action) {
      delegatablesWeakMap
        .get(event.currentTarget as DelegatableTarget)
        .get(eventToDelegate)
        .get(action)
        .forEach((callback) => callback(event));
    } else {
      anomnymousDelegationsWeakMap
        .get(event.currentTarget as DelegatableTarget)
        .get(eventToDelegate)
        .forEach((callback) => callback(event));
    }
    event = null;
  });
  target = null;
};

const removeDelegation = (
  event: DelegatableEvents,
  callbackReference: DelegatorFunction,
  target: DelegatableTarget = window,
  action: string
): boolean =>
  delegatablesWeakMap
    .get(target)
    .get(event)
    .get(action)
    .delete(callbackReference);

const removeAllDelegations = (
  event: DelegatableEvents,
  target: DelegatableTarget = window,
  action?: string
): boolean =>
  action
    ? delegatablesWeakMap.get(target).get(event).delete(action)
    : delegatablesWeakMap.get(target).delete(event);

const delegateMany = (
  event: DelegatableEvents,
  callbacks: DelegatorFunction[],
  target: DelegatableTarget = window,
  action?: string
): boolean => {
  if (
    !delegatablesWeakMap.has(target) ||
    !anomnymousDelegationsWeakMap.has(target)
  )
    return false;

  if (action) {
    delegatablesWeakMap.get(target).get(event).has(action)
      ? callbacks.map((callback) =>
          delegatablesWeakMap.get(target).get(event).get(action).add(callback)
        )
      : delegatablesWeakMap
          .get(target)
          .get(event)
          .set(action, new Set(callbacks));
    return true;
  }
  callbacks.map((callback) =>
    anomnymousDelegationsWeakMap.get(target).get(event).add(callback)
  );
  return true;
};

const delegate = (
  event: DelegatableEvents,
  callback: DelegatorFunction,
  target: DelegatableTarget = window,
  action?: string
): boolean => {
  if (
    !delegatablesWeakMap.has(target) ||
    !anomnymousDelegationsWeakMap.has(target)
  )
    return false;

  if (action) {
    delegatablesWeakMap.get(target).get(event).get(action).add(callback);
    return true;
  }
  anomnymousDelegationsWeakMap.get(target).get(event).add(callback);
  return true;
};

export {
  attachTo,
  delegateMany,
  delegate,
  removeAllDelegations,
  removeDelegation,
};
