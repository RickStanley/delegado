// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

const delegationsWeakMap = new WeakMap();
const delegatablesEventsWeakMap = new WeakMap();
const anonymousDelegationsWeakMap = new WeakMap();
const errorMessages = Object.freeze({
    targetExistsInAnyMap: "Target not found within delegatables maps. Please define with `attachEvents()` directive.",
    eventExistsInTarget: "No event found for given target."
});
const initWeakMaps = (target, events)=>{
    const eventsAreObjects = events.every((event)=>typeof event === "object"
    );
    delegationsWeakMap.set(target, new Map(events.map((event)=>[
            eventsAreObjects ? event.event : event,
            new Map()
        ]
    )));
    anonymousDelegationsWeakMap.set(target, new Map(events.map((event)=>[
            eventsAreObjects ? event.event : event,
            new Set()
        ]
    )));
    if (eventsAreObjects) delegatablesEventsWeakMap.set(target, events.reduce((previous, current)=>[
            ...previous,
            current.event
        ]
    , []));
    else delegatablesEventsWeakMap.set(target, events);
};
const attachEvents = (target, events)=>{
    if (delegationsWeakMap.has(target)) return false;
    initWeakMaps(target, events);
    events.map((event)=>delegator(event, target)
    );
    target = null;
    return true;
};
const attachEventsWithOptions = (target, events)=>{
    if (delegationsWeakMap.has(target)) return false;
    initWeakMaps(target, events);
    events.map((event)=>delegator(event.event, target, event.options)
    );
    target = null;
    return true;
};
const removeDelegation = (event, target, callbackReference, action)=>{
    if (action) {
        if (callbackReference) return delegationsWeakMap.get(target).get(event).get(action).delete(callbackReference);
        delegationsWeakMap.get(target).get(event).get(action).clear();
        return true;
    }
    if (callbackReference) return anonymousDelegationsWeakMap.get(target).get(event).delete(callbackReference);
    anonymousDelegationsWeakMap.get(target).get(event).clear();
    return true;
};
const delegateMany = (target, event, callbacks)=>{
    tryGuardOperation(target, event);
    callbacks.map((callback)=>anonymousDelegationsWeakMap.get(target).get(event).add(callback)
    );
    return true;
};
const delegateManyWithAction = (target, event, action, callbacks)=>{
    tryGuardOperation(target, event);
    delegationsWeakMap.get(target).get(event).has(action) ? callbacks.map((callback)=>delegationsWeakMap.get(target).get(event).get(action).add(callback)
    ) : delegationsWeakMap.get(target).get(event).set(action, new Set(callbacks));
    return true;
};
const delegate = (target, event, callback)=>{
    tryGuardOperation(target, event);
    anonymousDelegationsWeakMap.get(target).get(event).add(callback);
    return true;
};
const delegateWithAction = (target, event, action, callback)=>{
    delegationsWeakMap.get(target).get(event).has(action) ? delegationsWeakMap.get(target).get(event).get(action).add(callback) : delegationsWeakMap.get(target).get(event).set(action, new Set([
        callback
    ]));
    return true;
};
const delegator = (eventToDelegate, target, options)=>{
    target.addEventListener(eventToDelegate, (event)=>{
        const action = event.target?.closest("[data-action]")?.dataset.action || "";
        anonymousDelegationsWeakMap.get(event.currentTarget).get(eventToDelegate)?.forEach((callback)=>callback(event)
        );
        if (action) {
            delegationsWeakMap.get(event.currentTarget).get(eventToDelegate)?.get(action)?.forEach((callback)=>callback(event)
            );
        }
        event = null;
    }, options);
    target = null;
};
const targetExistsInAnyMap = (target)=>delegationsWeakMap.has(target) && anonymousDelegationsWeakMap.has(target)
;
const eventExistsInTarget = (target, event)=>delegationsWeakMap.get(target)?.has(event) && anonymousDelegationsWeakMap.get(target)?.has(event)
;
const throwError = (message)=>{
    throw new Error(message);
};
const tryGuardOperation = (target, event)=>{
    const checks = [
        targetExistsInAnyMap,
        eventExistsInTarget
    ];
    for (const check of checks){
        const result = check(target, event);
        if (!result) {
            const functionName = check.name;
            const errorMessage = errorMessages[functionName];
            throwError(errorMessage);
        }
    }
    return true;
};
export { attachEvents as attachEvents, attachEventsWithOptions as attachEventsWithOptions, delegateMany as delegateMany, delegateManyWithAction as delegateManyWithAction, delegate as delegate, delegateWithAction as delegateWithAction, removeDelegation as removeDelegation };
