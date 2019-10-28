"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var photoflow_1 = require("./photoflow");
var abstractRenderer_1 = require("./abstractRenderer");
var JustifiedRenderer = /** @class */ (function (_super) {
    __extends(JustifiedRenderer, _super);
    function JustifiedRenderer(container, images, userOptions) {
        var _this = _super.call(this, container, images, userOptions) || this;
        _this.targetRowHeight = 0;
        _this.isRowValid = photoflow_1.Photoflow._getOption(userOptions, 'justified.validRow');
        _this.renderedWidth = -1;
        _this.renderedRows = [];
        _this.setVariableSettings();
        return _this;
    }
    JustifiedRenderer.prototype.setVariableSettings = function () {
        this.targetRowHeight = this.getDimensionSetting('justified.targetRowHeight');
        _super.prototype.setVariableSettings.call(this);
    };
    JustifiedRenderer.prototype.calculateY = function (images) {
        var cx = this.width - ((images.length - 1) * this.margin) - (this.border * 2);
        var r = this.getRs(images);
        var rTotal = 0;
        for (var i = 0; i < r.length; i++) {
            rTotal += r[i];
        }
        return cx / rTotal;
    };
    JustifiedRenderer.prototype.emitRow = function (images, startY) {
        var rowHeight = this.calculateY(images);
        var currentX = this.border;
        for (var i = 0; i < images.length; i++) {
            var currentImage = images[i];
            // r = x / y
            // x = r * y
            var width = (photoflow_1.Photoflow._getElementWidth(images[i]) / photoflow_1.Photoflow._getElementHeight(images[i])) * rowHeight;
            photoflow_1.Photoflow._positionImage(currentImage, currentX, startY, width, rowHeight);
            currentX += width + this.margin;
        }
        return rowHeight;
    };
    JustifiedRenderer.prototype.genRowKey = function (ixArray) {
        return ixArray.join(",");
    };
    JustifiedRenderer.prototype.rowHeight = function (ixArray) {
        var imageRow = [];
        for (var i = 0; i < ixArray.length; i++) {
            imageRow.push(this.images[ixArray[i]]);
        }
        return this.calculateY(imageRow);
    };
    JustifiedRenderer.prototype.calculateBadness = function (height) {
        return Math.pow(Math.abs(height - this.targetRowHeight), 2);
    };
    JustifiedRenderer.prototype.genValidChildren = function (rowMap, startIx) {
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
                        bestParent: null
                    };
                }
                var generatedRow = rowMap[rowKey];
                generatedRows.push(generatedRow);
            }
            else {
                if (lastValid) {
                    transitionedToInvalid = true;
                }
            }
            currentIx++;
            currentRow.push(currentIx);
        }
        return generatedRows;
    };
    JustifiedRenderer.prototype.findOptimalRows = function () {
        var totalImages = this.images.length;
        var rootElement = { key: "root", height: -1, cost: 0, terminal: -1, bestParent: null };
        var rowMap = { "root": rootElement };
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
                    currentChild.bestParent = node.key;
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
        var current = rowMap[bestPathEnd];
        while (current) {
            if (current.key !== "root") {
                bestPath.push(current.key);
            }
            current = rowMap[current.bestParent];
        }
        return bestPath.reverse();
    };
    JustifiedRenderer.prototype.explodeRows = function (optimalRowKeys) {
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
    };
    JustifiedRenderer.prototype.getRs = function (images) {
        var r = [];
        for (var i = 0; i < images.length; i++) {
            r.push(photoflow_1.Photoflow._getElementWidth(images[i]) / photoflow_1.Photoflow._getElementHeight(images[i]));
        }
        return r;
    };
    JustifiedRenderer.prototype.doFlow = function () {
        var rows = [];
        var didSearch = false;
        if (this.renderedWidth !== -1 && Math.abs(this.renderedWidth - this.width) < this.debounceResizeWidth) {
            rows = this.renderedRows;
        }
        else {
            rows = this.findOptimalRows();
            didSearch = true;
        }
        var chunks = this.explodeRows(rows);
        var y = this.border;
        for (var i = 0; i < chunks.length; i++) {
            var currentY = this.emitRow(chunks[i], y);
            y += currentY + this.margin;
        }
        photoflow_1.Photoflow._setContainerHeight(this.container, y + this.border);
        photoflow_1.Photoflow._revealContainer(this.container);
        if (didSearch) {
            this.renderedWidth = this.width;
            this.renderedRows = rows;
        }
    };
    return JustifiedRenderer;
}(abstractRenderer_1.AbstractRenderer));
exports.JustifiedRenderer = JustifiedRenderer;
