'use strict';


var __QUEUE = [];
var __CURRENT_STATE = [];
var __INTERVAL_ID = null;
var __QUEUED_TIMEOUT_IDS = [];
var __SUBWORKER = new Worker('life-core.js');
__SUBWORKER.addEventListener('message', (event) => {
    __CURRENT_STATE = event.data; // store results of processing
    postMessage({nextState: __CURRENT_STATE}); // sync results with interface
});

var queueProxy = createQueueProxy();

function createQueueProxy() {
    return new Proxy(__QUEUE, {
        set: (target, property, value, receiver) => {
            target[property] = value;

            let timeoutIndex = __QUEUED_TIMEOUT_IDS.length;
    
            let timeoutId = setTimeout(() => {
                __QUEUED_TIMEOUT_IDS.splice(timeoutIndex, 1);
                if (__QUEUE.length > 0) {
                    let nextItem = getQueueItem();
                    processItem(nextItem);
                }
            });

            __QUEUED_TIMEOUT_IDS[timeoutIndex] = timeoutId;
    
            return true;
        }
    });
}

function processItem(item) {
    switch (item.eventType) {
        case 0: // next

            // process a single turn
            // stop playing if playing
            resetQueue();

            let currentState = item.currentState;
            __SUBWORKER.postMessage(currentState);
            break;
        case 1: // play

            // create an interval to process a turn every 100 ms
            if (!__INTERVAL_ID) {
                let currentState = item.currentState;
                __SUBWORKER.postMessage(currentState);
                __INTERVAL_ID = setInterval(() => addQueueItem({eventType: 3}), 100);
            }
            break;
        case 2: // stop

            // stop interval, clear any queue actions, and reset variables
            if (__INTERVAL_ID) {
                resetQueue();
            }
            break;
        case 3: // continue

            // process turn queued by interval
            __SUBWORKER.postMessage(__CURRENT_STATE);
            break;
    }
}

function getQueueItem() {
    return __QUEUE.shift();
}

function addQueueItem(value) {
    queueProxy.push(value)
}

function resetQueue() {
    clearInterval(__INTERVAL_ID); // stop interval
    for (let timeoutId of __QUEUED_TIMEOUT_IDS) clearTimeout(timeoutId); // clear queued timeouts

    while (__QUEUE.length > 0) getQueueItem(); // clear queue

    __CURRENT_STATE = [];
    __INTERVAL_ID = null;
    __QUEUED_TIMEOUT_IDS = [];
}

onmessage = function(event) {
    addQueueItem(event.data);
}
