
import { PhotoflowHelpers } from './photoflowHelpers';
import { AbstractRenderer } from './abstractRenderer';
import { PhotoflowOptionsInterface } from './defaultOptions';

interface DAGMap {
    [key: string]: DAGNode
}

interface DAGNode {
    key: string,
    height: number,
    badness: number,
    cost: number,
    terminal: number,
    bestParentKey: string|null
}

export class JustifiedRenderer extends AbstractRenderer {
    private targetRowHeight: number;
    private isRowValid: Function;
    private renderedWidth: number;
    private renderedRows: string[];

    public constructor(container: HTMLElement, images: HTMLElement[], userOptions: PhotoflowOptionsInterface) {
        super(container, images, userOptions);
        this.targetRowHeight = 0;
        this.isRowValid = PhotoflowHelpers.getOption(userOptions, 'justified.validRow');
        this.renderedWidth = -1;
        this.renderedRows = [];
        this.setVariableSettings();
    }

    protected setVariableSettings() {
        this.targetRowHeight = this.getDimensionSetting('justified.targetRowHeight');
        super.setVariableSettings();
    }

    private calculateY(images: HTMLElement[]) {
        var cx = this.width - ((images.length - 1) * this.margin) - (this.border * 2);
        var r = this.getRs(images);
        var rTotal = 0;
        for (var i = 0; i < r.length; i++) {
            rTotal += r[i];
        }

        return cx / rTotal;
    }

    private emitRow(images: HTMLElement[], startY: number) {
        var rowHeight = this.calculateY(images);

        var currentX = this.border;
        for (var i = 0; i < images.length; i++) {
            var currentImage = images[i];
            // r = x / y
            // x = r * y
            var width = (PhotoflowHelpers.getElementWidth(images[i]) / PhotoflowHelpers.getElementHeight(images[i])) * rowHeight;
            PhotoflowHelpers.positionImage(currentImage, currentX, startY, width, rowHeight);
            currentX += width + this.margin;
        }

        return rowHeight;
    }

    private genRowKey(ixArray: number[]) {
        return ixArray.join(",");
    }

    private rowHeight(ixArray: number[]) {
        var imageRow = [];
        for (var i = 0; i < ixArray.length; i++) {
            imageRow.push(this.images[ixArray[i]]);
        }
        return this.calculateY(imageRow);
    }

    private calculateBadness(height: number) {
        return Math.pow(Math.abs(height - this.targetRowHeight), 2);
    }

    private genValidChildren(rowMap: DAGMap, startIx: number) {
        var totalImages = this.images.length;
        var generatedRows = [];
        var currentRow = [startIx];
        var currentIx = startIx;
        var transitionedToInvalid = false;
        var lastValid = false;
        while (currentIx < totalImages && !transitionedToInvalid) {
            var currentHeight = this.rowHeight(currentRow);
            if (this.isRowValid(this.targetRowHeight, currentRow.length, currentHeight)) {
                lastValid = true;
                var rowKey = this.genRowKey(currentRow);
                if (!(rowKey in rowMap)) {
                    rowMap[rowKey] = {
                        key: rowKey,
                        height: currentHeight,
                        badness: this.calculateBadness(currentHeight),
                        cost: Infinity,
                        terminal: currentRow[currentRow.length - 1],
                        bestParentKey: null
                    };
                }
                var generatedRow = rowMap[rowKey];
                generatedRows.push(generatedRow);
            } else {
                if (lastValid) {
                    transitionedToInvalid = true;
                }
            }
            currentIx++;
            currentRow.push(currentIx);
        }
        return generatedRows;
    }

    private findOptimalRows() {
        var totalImages = this.images.length;
        var rootElement: DAGNode = { key: "root", height: -1, cost: 0, badness: 0, terminal: -1, bestParentKey: null };
        var rowMap: DAGMap = {"root": rootElement };
        var loops = 0;

        var bfs = [rootElement];
        var node;
        var bestPathEnd = null;
        var bestPathCost = Infinity;
        while (node = bfs.pop()) {
            var children = this.genValidChildren(rowMap, node.terminal + 1);
            for (var i = 0; i < children.length; i++) {
                loops++;
                var currentChild = children[i];
                if (bfs.indexOf(currentChild) === -1) {
                    bfs.push(currentChild);
                }
                if (node.cost + currentChild.badness < currentChild.cost) {
                    currentChild.cost = node.cost + currentChild.badness;
                    currentChild.bestParentKey = node.key;
                }
            }
        }

        console.log("Loops: " + loops);

        var rows = Object.keys(rowMap);
        for (var i = 0; i < rows.length; i++) {
            var currentRow = rowMap[rows[i]];
            if (currentRow.terminal === totalImages - 1) {
                if (currentRow.cost < bestPathCost) {
                    bestPathCost = currentRow.cost;
                    bestPathEnd = currentRow.key;
                }
            }
        }
        console.log("Best cost: " + bestPathCost);

        var bestPath = [];
        var current = rowMap[<string>bestPathEnd];
        while (current) {
            if (current.key !== "root") {
                bestPath.push(current.key);
            }
            current = rowMap[<string>current.bestParentKey];
        }

        return bestPath.reverse();
    }

    private explodeRows(optimalRowKeys: string[]) {
        var toReturn = [];
        for (var i = 0; i < optimalRowKeys.length; i++) {
            var imageChunk = [];
            var currentRow = optimalRowKeys[i].split(",");
            for (var j = 0; j < currentRow.length; j++) {
                imageChunk.push(this.images[parseInt(currentRow[j])]);
            }
            toReturn.push(imageChunk);
        }
        return toReturn;
    }

    private getRs(images: HTMLElement[]) {
        var r = [];
        for (var i = 0; i < images.length; i++) {
            r.push(PhotoflowHelpers.getElementWidth(images[i]) / PhotoflowHelpers.getElementHeight(images[i]));
        }
        return r;
    }

    protected doFlow() {
        var rows = [];
        var didSearch = false;
        if (this.renderedWidth !== -1 && Math.abs(this.renderedWidth - this.width) < this.debounceResizeWidth) {
            rows = this.renderedRows;
        } else {
            rows = this.findOptimalRows();
            didSearch = true;
        }
        var chunks = this.explodeRows(rows);
        var y = this.border;
        for (var i = 0; i < chunks.length; i++) {
            var currentY = this.emitRow(chunks[i], y);
            y += currentY + this.margin;
        }
        PhotoflowHelpers.setContainerHeight(this.container, y + this.border);
        PhotoflowHelpers.revealContainer(this.container);
        if (didSearch) {
            this.renderedWidth = this.width;
            this.renderedRows = rows;
        }
    }
}
