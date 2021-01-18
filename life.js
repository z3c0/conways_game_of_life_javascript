'use strict';


function main() {
    let lifeInterface = new LifeInterface();

    window.onresize = () => {
        lifeInterface.drawGrid();
    };
}

class LifeInterface {
    GRID_SIZE = 16;

    constructor() {
        this.__painting = false;
        this.__processing_turns = false;
        this.__play = false;
        this.__runPromise = null;

        this.model = new SparseGrid();
        this.controller = new Worker('life-queue.js');
        this.controller.addEventListener('message', (event) => {
            if (event.data) {
                let workerMessage = event.data;
                if (workerMessage.nextState) {
                    this.model.setPoints(workerMessage.nextState, true);
                    this.drawGrid();
                }
                else if (workerMessage.debug) {
                    console.log(workerMessage); // for debugging
                }
            }
        });

        this.drawInterface();
        this.drawGrid();
        this.drawControls();
    }

    get element() {
        return document.querySelector('#life-interface');
    }

    set element(newElement) {
        document.body.innerHTML = '';
        document.body.appendChild(newElement);
    }

    get statistics() {
        return this.element.querySelector('#life-statistics');
    }

    get controls() {
        return this.element.querySelector('#life-controls');
    }

    get grid() {
        return this.element.querySelector('#life-grid');
    }

    get rowCount() {
        return Math.floor(this.grid.clientHeight / this.GRID_SIZE)
    }

    get columnCount() {
        let leftMargin = Math.floor((this.grid.offsetWidth - Math.floor((this.grid.offsetWidth - 1) / this.GRID_SIZE) * this.GRID_SIZE) / 2);
        let gridWidth = this.grid.offsetWidth - leftMargin;
        return Math.floor((gridWidth - 1) / this.GRID_SIZE);
    }

    drawInterface() {
        // initialize element
        let newElement = document.createElement('main');
        newElement.id = 'life-interface';

        // initialize header
        let header = document.createElement('div');
        header.id = 'life-header';

        // intialize statistics
        let statistics = document.createElement('div');
        statistics.id = 'life-statistics';

        // initalize controls
        let controls = document.createElement('div');
        controls.id = 'life-controls';

        // initialize grid
        let grid = document.createElement('table');
        grid.id = 'life-grid';

        // assemble header
        header.appendChild(statistics);
        header.appendChild(controls);

        // assemble interface
        newElement.innerHTML = '';
        newElement.appendChild(header);
        newElement.appendChild(grid);

        this.element = newElement;
    }

    drawControls() {
        let nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.addEventListener('click', () => {
            setTimeout(() => {
                let message = {eventType: 0, currentState: this.model.points};
                this.controller.postMessage(message);
            });
        });

        let playButton = document.createElement('button');
        playButton.textContent = 'Play';
        playButton.addEventListener('click', () => {
            setTimeout(() => {
                let message = {eventType: 1, currentState: this.model.points};
                this.controller.postMessage(message);
            });
        });

        let stopButton = document.createElement('button');
        stopButton.textContent = 'Stop';
        stopButton.addEventListener('click', () => {
            setTimeout(() => this.controller.postMessage({eventType: 2}));
        });

        let resetButton = document.createElement('button');
        resetButton.textContent = 'Reset';
        resetButton.addEventListener('click', () => {
            setTimeout(() => {
                this.controller.postMessage({eventType: 2});
                this.model.reset();
                this.drawGrid();
            });
        });

        this.controls.appendChild(nextButton);
        this.controls.appendChild(playButton);
        this.controls.appendChild(stopButton);
        this.controls.appendChild(resetButton);
    }

    drawGrid() {
        this.grid.style.width = this.element.getBoundingClientRect().width + 'px';

        let leftMargin = Math.floor((this.grid.offsetWidth - Math.floor((this.grid.offsetWidth - 1) / this.GRID_SIZE) * this.GRID_SIZE) / 2);
        let gridWidth = this.grid.offsetWidth - leftMargin;

        let gridBody = document.createElement('tbody');
        gridBody.style.width = gridWidth + 'px';
        gridBody.style.marginLeft = leftMargin + 'px';

        let colCount = this.columnCount;
        let rowCount = this.rowCount;

        for (let y = 0; y < rowCount; y++) {
            let row = document.createElement('tr');
            row.id = 'row-' + y;
            row.style.width = gridWidth + 'px';

            for (let x = 0; x < colCount; x++) {
                let cell = document.createElement('td');
                cell.id = 'cell-' + ((colCount * y) + x);
                cell.style.height = this.GRID_SIZE - 1 + 'px';
                cell.style.width = this.GRID_SIZE - 1 + 'px';

                let cell_value = this.model.getPoint(x, y);

                // determine cell appearance
                switch (cell_value) {
                    case true:
                        cell.className = 'alive';
                        break;
                    case false:
                        cell.className = 'dead';
                        break;
                    default:
                        cell.className = 'empty';
                }

                // assign event callbacks

                // painting
                cell.addEventListener('mousedown', () => this.__painting = true);
                cell.addEventListener('mouseup', () => this.__painting = false);
                cell.addEventListener('mouseover', event => {
                    if (this.__painting) {
                        this.model.setPoint(x, y, true);
                        event.target.className = 'alive';
                    }
                });

                // on click, toggle the cell's state
                cell.addEventListener('click', event => {
                    if (!this.__painting) {
                        if (!this.model.getPoint(x, y)) {
                            this.model.setPoint(x, y, true);
                            event.target.className = 'alive'
                        } 
                        else {
                            this.model.deletePoint(x, y);
                            event.target.className = 'empty'
                        }
                    }
                });

                row.appendChild(cell);
            }

            gridBody.appendChild(row);
        }

        this.grid.innerHTML = '';
        this.grid.appendChild(gridBody);
    }
}


class SparseGrid {

    constructor() {
        this.__data = {};
    }

    get points() {
        return Object.keys(this.__data).map(n => {
            let nArray = n.split(',').map(i => Number.parseInt(i));
            return new Point(nArray[0], nArray[1]);
        });
    }

    reset() {
        this.__data = {};
    }

    deletePoint(x, y) {
        delete this.__data[new Point(x, y)];
    }

    setPoint(x, y, value) {
        this.__data[new Point(x, y)] = value;
    }

    setPoints(points, value) {
        let newData = {}
        for (let point of points) {
            newData[[point.x, point.y]] = value;
        }
        this.__data = newData;
    }

    getPoint(x, y) {
        return this.__data[new Point(x, y)];
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    toString() {
        return ([this.x, this.y]).toString();
    }
}
