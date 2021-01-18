'use strict';


onmessage = function(event) {
    let currentState = event.data;
    let nextState = evaluateNextState(currentState);
    postMessage(nextState);
}

function evaluateNextState(currentState) {
    let nextState = [];

    for (let cell of currentState) {
        let neighbors = getNeighbors(cell.x, cell.y);
        
        let livingNeighborCount = 0;
        for (let neighbor of neighbors) {
            for (let c of currentState) {
                if (neighbor.x === c.x && neighbor.y === c.y) {
                    livingNeighborCount++;
                    break
                }
            }
        }

        if (livingNeighborCount === 2 || livingNeighborCount === 3) {
            nextState.push(cell);
        }
    }

    for (let cell of calculateInversePoints(currentState)) {
        let neighbors = getNeighbors(cell.x, cell.y);
        
        let livingNeighborCount = 0;
        for (let neighbor of neighbors) {
            for (let c of currentState) {
                if (neighbor.x === c.x && neighbor.y === c.y) {
                    livingNeighborCount++;
                    break
                }
            }
        }

        if (livingNeighborCount === 3) {
            nextState.push(cell);
        }
    }

    return nextState;
}

function getNeighbors(x, y) {
    return [
        {x: x - 1, y: y},
        {x: x + 1, y: y},
        {x: x, y: y - 1},
        {x: x, y: y + 1},
        {x: x - 1, y: y - 1},
        {x: x + 1, y: y - 1},
        {x: x - 1, y: y + 1},
        {x: x + 1, y: y + 1}
    ]
}

function calculateInversePoints(points) {
    let inversePoints = [];
    for (let point of points) {
        let neighbors = getNeighbors(point.x, point.y);
        for (let neighbor of neighbors) {
            if (pointExists(neighbor, points) || pointExists(neighbor, inversePoints)) {
                continue;
            }
            inversePoints.push(neighbor);
        }
    }

    return inversePoints;
}

function pointExists(point, points) {
    for (let p of points) {
        if (p.x === point.x && p.y === point.y) {
            return true;
        }
    }

    return false;
}
