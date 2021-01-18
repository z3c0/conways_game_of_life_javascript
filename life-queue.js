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
                let nextItem = getQueueItem();
                try {
                    processItem(nextItem);
                }
                catch (e) {
                    postMessage({debug: nextItem, debugMessage: 'An error occurred while processing the next item in the event queue'});
                    return false;
                }
            }, 100);

            __QUEUED_TIMEOUT_IDS[timeoutIndex] = timeoutId;
    
            return true;
        }
    });
}

function processItem(item) {
    switch (item.eventType) {
        case 0: // next
            let currentState = item.currentState;
            __SUBWORKER.postMessage(currentState);
            break;
        case 1: // play
            if (!__INTERVAL_ID) {
                let currentState = item.currentState;
                __SUBWORKER.postMessage(currentState);
                __INTERVAL_ID = setInterval(() => {
                    addQueueItem({eventType: 3})
                }, 100);
            }
            break;
        case 2: // stop
            if (__INTERVAL_ID) {
                clearInterval(__INTERVAL_ID);
                __INTERVAL_ID = null

                while (__QUEUE.length > 0) getQueueItem(); // empty queue
                for (let timeoutId of __QUEUED_TIMEOUT_IDS) clearTimeout(timeoutId); // clear queued timeouts
            }
            break;
        case 3: // continue
            __SUBWORKER.postMessage(__CURRENT_STATE);
            break;
        default:

    }
}

function getQueueItem() {
    return __QUEUE.shift();
}

function addQueueItem(value) {
    queueProxy.push(value)
}

onmessage = function(event) {
    addQueueItem(event.data);
}
