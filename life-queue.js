'use strict';

var __INTERVAL_ID = null;
var __QUEUE = [];
var __CURRENT_STATE = [];
var __QUEUED_TIMEOUT_IDS = [];
var __STOPPING = false;
var __SUBWORKER = new Worker('life-core.js');
__SUBWORKER.addEventListener('message', (event) => {
    if (!__STOPPING) {
        __CURRENT_STATE = event.data; // store results of processing
        postMessage({nextState: __CURRENT_STATE}); // sync results with interface
    }
});

var queueProxy = createQueueProxy();

function createQueueProxy() {
    return new Proxy(__QUEUE, {
        set: (target, property, value, receiver) => {
            target[property] = value;

            // triggers when an item is added to the queue

            if (__STOPPING) __STOPPING = false;

            // wake event loop
            if (!__INTERVAL_ID) {
                __INTERVAL_ID = setInterval(() => {
                    if (__QUEUE.length > 0) {
                        let nextItem = getQueueItem();
                        processItem(nextItem);
                    }
                }, 100);
            }
    
            return true;
        }
    });
}

function processItem(item) {
    switch (item.eventType) {
        case 0: // next

            // process a single turn
            __CURRENT_STATE = item.currentState;
            __SUBWORKER.postMessage(__CURRENT_STATE);
            resetQueue();
            break;
        case 1: // play
            __SUBWORKER.postMessage(item.currentState);
            addQueueItem({eventType: 3, currentState: item.currentState});
            break;
        case 2: // stop
            // set stopping flag to halt any further messages to the interface
            __STOPPING = true;

            // clear queue of any future actions
            resetQueue();
            break;
        case 3:
            let timeoutIndex = __QUEUED_TIMEOUT_IDS.length;
            let timeoutId = setTimeout(() => {
                __QUEUED_TIMEOUT_IDS.splice(timeoutIndex, 1);
                __SUBWORKER.postMessage(__CURRENT_STATE);
                addQueueItem({eventType: 3, currentState: item.currentState});
            }, 100);
            __QUEUED_TIMEOUT_IDS[timeoutIndex] = timeoutId;
    }
}

function getQueueItem() {
    return __QUEUE.shift();
}

function addQueueItem(value) {
    queueProxy.push(value)
}

function resetQueue() {
    if (__INTERVAL_ID) clearInterval(__INTERVAL_ID);
    while (__QUEUED_TIMEOUT_IDS.length > 0) clearTimeout(__QUEUED_TIMEOUT_IDS.shift());
    while (__QUEUE.length > 0) getQueueItem();

    __INTERVAL_ID = null;
    __CURRENT_STATE = [];
}

onmessage = function(event) {
    addQueueItem(event.data);
}
