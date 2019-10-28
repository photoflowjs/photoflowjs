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
define("defaultOptions", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var defaultOptions = {
        border: 0,
        margin: 5,
        debounceResizeWidth: 50,
        elementSelector: function (container) {
            var allSupportedTypes = Array.prototype.slice.call(container.querySelectorAll('img,video,picture'));
            var returnElements = [];
            for (var i = 0; i < allSupportedTypes.length; i++) {
                var currentElement = allSupportedTypes[i];
                if (!(currentElement.tagName === 'IMG' && currentElement.parentElement.tagName === 'PICTURE')) {
                    returnElements.push(currentElement);
                }
            }
            return returnElements;
        },
        justified: {
            targetRowHeight: "40vh",
            validRow: function (targetRowHeight, rowElementCount, currentRowHeight, totalElements) {
                if (totalElements < 5) {
                    var minRowHeight = targetRowHeight / 4;
                    var maxRowHeight = targetRowHeight * 3;
                }
                else {
                    var minRowHeight = targetRowHeight * (0.6);
                    var maxRowHeight = targetRowHeight * 2;
                }
                // If it's the only element in the row, and it's still less than the
                // row height, that means we're some kind of thin horizontal panorama.
                // We want this to score badly but not be considered invalid.
                if (rowElementCount !== 1 && currentRowHeight < minRowHeight) {
                    return false;
                }
                return currentRowHeight < maxRowHeight;
            }
        }
    };
    exports.defaultOptions = defaultOptions;
});
define("justifiedRenderer", ["require", "exports", "photoflow", "abstractRenderer"], function (require, exports, photoflow_1, abstractRenderer_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
});
define("photoflow", ["require", "exports", "defaultOptions", "justifiedRenderer"], function (require, exports, defaultOptions_1, justifiedRenderer_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Photoflow = /** @class */ (function () {
        function Photoflow() {
        }
        Photoflow._initContainer = function (container) {
            container.style.position = "relative";
            container.style.visibility = "none";
            container.style.height = "0px";
        };
        Photoflow._initImage = function (imgElement) {
            imgElement.style.position = "absolute";
        };
        Photoflow._revealContainer = function (container) {
            container.style.visibility = "";
        };
        Photoflow._positionImage = function (imgElement, x, y, width, height) {
            var layoutElment = imgElement;
            layoutElment.style.top = y + "px";
            layoutElment.style.left = x + "px";
            var dimensionElement = imgElement;
            if (imgElement.tagName === 'PICTURE') {
                dimensionElement = imgElement.querySelector('img');
            }
            dimensionElement.style.width = width + "px";
            dimensionElement.style.height = height + "px";
        };
        Photoflow._getElementWidth = function (imgElement) {
            if (imgElement.tagName === 'PICTURE') {
                return imgElement.querySelector('img').naturalWidth;
            }
            else if (imgElement.tagName === 'VIDEO') {
                return imgElement.videoWidth;
            }
            return imgElement.naturalWidth;
        };
        Photoflow._getElementHeight = function (imgElement) {
            if (imgElement.tagName === 'PICTURE') {
                return imgElement.querySelector('img').naturalHeight;
            }
            else if (imgElement.tagName === 'VIDEO') {
                return imgElement.videoHeight;
            }
            return imgElement.naturalHeight;
        };
        Photoflow._setContainerHeight = function (container, height) {
            container.style.height = height + "px";
        };
        Photoflow._getOption = function (userOptions, key) {
            var currentDefault = defaultOptions_1.defaultOptions;
            var currentUser = userOptions;
            var keysplit = key.split(".");
            for (var i = 0; i < keysplit.length; i++) {
                var currentKey = keysplit[i];
                if (currentDefault[currentKey] !== undefined) {
                    currentDefault = currentDefault[currentKey];
                }
                else {
                    console.error("Looking up key that doesn't exist as a default option, did you mess up?");
                }
                if (currentUser !== undefined && currentUser !== null) {
                    currentUser = currentUser[currentKey];
                }
            }
            if (currentUser !== undefined && currentUser !== null) {
                return currentUser;
            }
            return currentDefault;
        };
        Photoflow.init = function (container, options) {
            Photoflow._initContainer(container);
            var domElements = Photoflow._getOption(options, 'elementSelector')(container);
            var images = Array.prototype.slice.call(domElements);
            var instance = new justifiedRenderer_1.JustifiedRenderer(container, images, options);
            for (var i = 0; i < images.length; i++) {
                Photoflow._initImage(images[i]);
                var currentImage = images[i];
                var loadElement = images[i];
                if (currentImage.tagName === 'VIDEO') {
                    if (currentImage.readyState >= 1) {
                        instance.imageInitialized();
                    }
                    else {
                        currentImage.addEventListener('loadedmetadata', function () {
                            instance.imageInitialized();
                        });
                    }
                    continue;
                }
                if (currentImage.tagName === 'PICTURE') {
                    loadElement = currentImage.querySelector('img');
                }
                if (loadElement.complete) {
                    instance.imageInitialized();
                }
                else {
                    loadElement.addEventListener("load", function () {
                        instance.imageInitialized();
                    });
                }
            }
            window.onload = function () {
                instance.reflow();
            };
            window.onresize = function () {
                instance.reflow();
            };
            return instance;
        };
        return Photoflow;
    }());
    exports.Photoflow = Photoflow;
    window.Photoflow = Photoflow;
});
define("abstractRenderer", ["require", "exports", "photoflow"], function (require, exports, photoflow_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var AbstractRenderer = /** @class */ (function () {
        function AbstractRenderer(container, images, userOptions) {
            this.container = container;
            this.images = images;
            this.userOptions = userOptions;
            this.width = 0;
            this.height = 0;
            this.border = 0;
            this.margin = 0;
            this.initializedImages = 0;
            this.hasRendered = false;
            this.setVariableSettings();
            this.debounceResizeWidth = 0;
            this.hasRendered = false;
            this.onready = null;
            this.onresize = null;
        }
        AbstractRenderer.prototype.getDimensionSetting = function (setting) {
            var dimension = photoflow_2.Photoflow._getOption(this.userOptions, setting);
            if (typeof dimension === 'number') {
                return dimension;
            }
            if (typeof dimension !== 'string') {
                console.error("Unsupported dimension type");
                return 0;
            }
            // Make sure they didn't just pass a stringified number "123"
            var stringNumber = parseInt(dimension);
            if (!isNaN(dimension) && !isNaN(stringNumber)) {
                return stringNumber;
            }
            var numVal = parseInt(dimension.slice(0, dimension.length - 2));
            var unit = dimension.slice(-2);
            if (['px', 'vh', 'vw'].indexOf(unit) === -1 || isNaN(numVal)) {
                console.error("Unsupported dimension type, use 'px', 'vh' or 'vw'");
                return 0;
            }
            if (unit === 'px') {
                return numVal;
            }
            else if (unit === 'vh') {
                console.log(window.innerHeight * (numVal / 100));
                return window.innerHeight * (numVal / 100);
            }
            else if (unit === 'vw') {
                return window.innerWidth * (numVal / 100);
            }
            return 0;
        };
        AbstractRenderer.prototype.setVariableSettings = function () {
            this.border = this.getDimensionSetting('border');
            this.margin = this.getDimensionSetting('margin');
            this.debounceResizeWidth = this.getDimensionSetting.call(this, 'debounceResizeWidth');
        };
        AbstractRenderer.prototype.reflow = function () {
            if (this.initializedImages !== this.images.length) {
                return;
            }
            this.setVariableSettings();
            var oldWidth = this.width;
            var newWidth = this.container.offsetWidth;
            var newHeight = this.container.offsetHeight;
            var widthChanged = false;
            var heightChanged = false;
            if (this.width !== newWidth && newWidth !== 0) {
                widthChanged = true;
            }
            if (this.height !== newHeight && newHeight !== 0) {
                heightChanged = true;
            }
            this.width = newWidth;
            this.height = newHeight;
            if (widthChanged || heightChanged) {
                this.doFlow();
                if (!this.hasRendered) {
                    this.hasRendered = true;
                    this.ready();
                }
                if (oldWidth !== 0) {
                    this.resize();
                }
            }
        };
        AbstractRenderer.prototype.imageInitialized = function () {
            this.initializedImages++;
            if (this.initializedImages === this.images.length) {
                this.reflow();
            }
        };
        AbstractRenderer.prototype.ready = function () {
            if (this.onready) {
                this.onready(this);
            }
        };
        AbstractRenderer.prototype.resize = function () {
            if (this.onresize) {
                this.onresize(this);
            }
        };
        return AbstractRenderer;
    }());
    exports.AbstractRenderer = AbstractRenderer;
});
