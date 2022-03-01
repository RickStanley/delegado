// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

const symbolKeys = new WeakMap();
const delegationsMap = new Map();
const delegatablesEventsMap = new Map();
const anonymousDelegationsMap = new Map();
const cleanUp = (symbolKey)=>{
    console.log('limpando');
    console.log(delegatablesEventsMap.size);
    console.log(delegationsMap.size);
    console.log(anonymousDelegationsMap.size);
    delegatablesEventsMap.delete(symbolKey);
    delegationsMap.delete(symbolKey);
    anonymousDelegationsMap.delete(symbolKey);
    console.log('limpo');
    console.log(delegatablesEventsMap.size);
    console.log(delegationsMap.size);
    console.log(anonymousDelegationsMap.size);
};
const cleanUpTarget = (target)=>cleanUp(symbolKeys.get(target))
;
const collector = new FinalizationRegistry(cleanUp);
const initMaps = (target, events)=>{
    const eventsAreObjects = events.every((event)=>typeof event === "object"
    );
    const symbol = Symbol();
    symbolKeys.set(target, symbol);
    delegationsMap.set(symbol, new Map(events.map((event)=>[
            eventsAreObjects ? event.event : event,
            new Map()
        ]
    )));
    anonymousDelegationsMap.set(symbol, new Map(events.map((event)=>[
            eventsAreObjects ? event.event : event,
            new Set()
        ]
    )));
    if (eventsAreObjects) delegatablesEventsMap.set(symbol, events.reduce((previous, current)=>[
            ...previous,
            current.event
        ]
    , []));
    else delegatablesEventsMap.set(symbol, events);
    collector.register(target, symbol);
};
const attachEvents = (target, events)=>{
    if (symbolKeys.has(target)) throwNoTargetFound();
    initMaps(target, events);
    events.map((event)=>delegator(event, target)
    );
    target = null;
    return true;
};
const attachEventsWithOptions = (target, events)=>{
    if (symbolKeys.has(target)) throwNoTargetFound();
    initMaps(target, events);
    events.map((event)=>delegator(event.event, target, event.options)
    );
    target = null;
    return true;
};
const removeDelegation = (event, target, callbackReference, action)=>{
    if (action) {
        if (callbackReference) {
            delegationsMap.get(symbolKeys.get(target)).get(event).get(action).delete(callbackReference);
            return;
        }
        delegationsMap.get(symbolKeys.get(target)).get(event).get(action).clear();
        return;
    }
    if (callbackReference) {
        anonymousDelegationsMap.get(symbolKeys.get(target)).get(event).delete(callbackReference);
        return;
    }
    anonymousDelegationsMap.get(symbolKeys.get(target)).get(event).clear();
};
const delegateMany = (target, event, callbacks)=>{
    tryGuardOperation(target, event);
    callbacks.map((callback)=>anonymousDelegationsMap.get(symbolKeys.get(target)).get(event).add(callback)
    );
};
const delegateManyWithAction = (target, event, action, callbacks)=>{
    tryGuardOperation(target, event);
    delegationsMap.get(symbolKeys.get(target)).get(event).has(action) ? callbacks.map((callback)=>delegationsMap.get(symbolKeys.get(target)).get(event).get(action).add(callback)
    ) : delegationsMap.get(symbolKeys.get(target)).get(event).set(action, new Set(callbacks));
};
const delegate = (target, event, callback)=>{
    tryGuardOperation(target, event);
    anonymousDelegationsMap.get(symbolKeys.get(target)).get(event).add(callback);
};
const delegateWithAction = (target, event, action, callback)=>{
    if (!symbolKeys.has(target)) throwNoTargetFound();
    delegationsMap.get(symbolKeys.get(target)).get(event).has(action) ? delegationsMap.get(symbolKeys.get(target)).get(event).get(action).add(callback) : delegationsMap.get(symbolKeys.get(target)).get(event).set(action, new Set([
        callback
    ]));
};
const delegator = (eventToDelegate, target, options)=>{
    target.addEventListener(eventToDelegate, (event)=>{
        const action = event.target?.closest("[data-action]")?.dataset.action || "";
        anonymousDelegationsMap.get(symbolKeys.get(event.currentTarget)).get(eventToDelegate)?.forEach((callback)=>callback(event)
        );
        if (action) {
            delegationsMap.get(symbolKeys.get(event.currentTarget)).get(eventToDelegate)?.get(action)?.forEach((callback)=>callback(event)
            );
        }
        event = null;
    }, options);
    target = null;
};
const throwError = (message)=>{
    throw new Error(message);
};
const throwNoTargetFound = ()=>throwError("No target found in keys. Please, initialize the target with initWeakMaps function")
;
const tryGuardOperation = (target, event)=>{
    if (!symbolKeys.has(target)) throwNoTargetFound();
    if (!delegationsMap.get(symbolKeys.get(target))?.has(event) && anonymousDelegationsMap.get(symbolKeys.get(target))?.has(event)) throwError("No event found for given target");
};
export { attachEvents as attachEvents, attachEventsWithOptions as attachEventsWithOptions, delegateMany as delegateMany, delegateManyWithAction as delegateManyWithAction, delegate as delegate, delegateWithAction as delegateWithAction, removeDelegation as removeDelegation, cleanUpTarget as cleanUpTarget };
