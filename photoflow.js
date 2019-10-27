var photoflow = function(){};

photoflow._initContainer = function(container) {
    container.style.position = "relative";
    container.style.visibility = "none";
    container.style.height = "0px";
}

photoflow._initImage = function(imgElement) {
    imgElement.style.position = "absolute";
}

photoflow._revealContainer = function(container) {
    container.style.visibility = "";
}

photoflow._positionImage = function(imgElement, x, y, width, height) {
    var layoutElment = imgElement;
    layoutElment.style.top = y + "px";
    layoutElment.style.left = x + "px";
    var dimensionElement = imgElement;
    if (imgElement.tagName === 'PICTURE') {
        dimensionElement = imgElement.querySelector('img');
    }
    dimensionElement.style.width = width + "px";
    dimensionElement.style.height = height + "px";
}

photoflow._getElementWidth = function(imgElement) {
    if (imgElement.tagName === 'PICTURE') {
        return imgElement.querySelector('img').naturalWidth;
    } else if (imgElement.tagName === 'VIDEO') {
        return imgElement.videoWidth;
    }

    return imgElement.naturalWidth;
}

photoflow._getElementHeight = function(imgElement) {
    if (imgElement.tagName === 'PICTURE') {
        return imgElement.querySelector('img').naturalHeight;
    } else if (imgElement.tagName === 'VIDEO') {
        return imgElement.videoHeight;
    }

    return imgElement.naturalHeight;
}

photoflow._setContainerHeight = function(container, height) {
    container.style.height = height + "px";
}

photoflow._getOption = function(userOptions, key) {
    var currentDefault = photoflow.defaultOptions;
    var currentUser = userOptions;
    var keysplit = key.split(".");
    for (var i = 0; i < keysplit.length; i++) {
        var currentKey = keysplit[i];
        if (currentDefault[currentKey] !== undefined) {
            currentDefault = currentDefault[currentKey];
        } else {
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
}

photoflow.init = function(container, options) {
    photoflow._initContainer(container);

    var domElements = photoflow._getOption(options, 'elementSelector')(container);
    var images = Array.prototype.slice.call(domElements);

    let instance = new justifiedRenderer(window, container, images, options);

    for (var i = 0; i < images.length; i++) {
        photoflow._initImage(images[i]);
        var currentImage = images[i];
        var loadElement = images[i];
        if (currentImage.tagName === 'VIDEO') {
            if (currentImage.readyState >= 1) {
                instance._imageInitialized();
            } else {
                currentImage.addEventListener('loadedmetadata', function() {
                    instance._imageInitialized();
                });
            }

            continue;
        }
        if (currentImage.tagName === 'PICTURE') {
            loadElement = currentImage.querySelector('img');
        }

        if (loadElement.complete) {
            instance._imageInitialized();
        } else {
            loadElement.addEventListener("load", function() {
                instance._imageInitialized();
            });
        }
    }

    window.onload = function() {
        instance._reflow();
    }

    return instance;
}

photoflow.defaultOptions = {
    border: 0,
    margin: 5,
    debounceResizeWidth: 50,
    elementSelector: function(container) {
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
        validRow: function(targetRowHeight, rowElementCount, currentRowHeight, totalElements) {
            if (totalElements < 5) {
                var minRowHeight = targetRowHeight / 4;
                var maxRowHeight = targetRowHeight * 3;
            } else {
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
}

window.photoflow = photoflow;

function abstractRenderer(window, container, images, userOptions) {
    this.userOptions = userOptions;
    this.container = container;
    this.images = images;
    this.window = window;
    this.initializedImages = 0;
    this.width = 0;
    this.height = 0;
    this.border = 0;
    this.margin = 0;
    this._setVariableSettings();
    this.debounceResizeWidth = 0;
    this.onready = null;
    this.onresize = null;
    this.hasRendered = false;
    var _t = this;

    this.window.onresize = function() {
        _t._reflow();
    }
    this._reflow = function() {
        if (this.initializedImages !== this.images.length) {
            return;
        }
        this._setVariableSettings();
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
            this._doFlow();
            if (!this.hasRendered) {
                this.hasRendered = true;
                this._ready();
            }
            if (oldWidth !== 0) {
                this._resize();
            }
        }
    }
    this._imageInitialized = function() {
        this.initializedImages++;
        if (this.initializedImages === this.images.length) {
            this._reflow();
        }
    }
    this._ready = function() {
        if (this.onready) {
            this.onready(this);
        }
    }
    this._resize = function() {
        if (this.onresize) {
            this.onresize(this);
        }
    }
}

abstractRenderer.prototype._setVariableSettings = function() {
    this.border = abstractRenderer.prototype._getDimensionSetting.call(this, 'border');
    this.margin = abstractRenderer.prototype._getDimensionSetting.call(this, 'margin');
    this.debounceResizeWidth = abstractRenderer.prototype._getDimensionSetting.call(this, 'debounceResizeWidth');
}

abstractRenderer.prototype._getDimensionSetting = function(setting) {
    var dimension = photoflow._getOption(this.userOptions, setting);
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
    } else if (unit === 'vh') {
        console.log(window.innerHeight * (numVal / 100));
        return window.innerHeight * (numVal / 100);
    } else if (unit === 'vw') {
        return window.innerWidth * (numVal / 100);
    }
}

function justifiedRenderer(window, container, images, userOptions) {
    abstractRenderer.call(this, window, container, images, userOptions);
    this.targetRowHeight = 0;
    this._isRowValid = photoflow._getOption(userOptions, 'justified.validRow');
    this.renderedWidth = -1;
    this.renderedRows = [];
    this._setVariableSettings();

    this._calculateY = function(images) {
        var cx = this.width - ((images.length - 1) * this.margin) - (this.border * 2);
        var r = this._getRs(images);
        var rTotal = 0;
        for (var i = 0; i < r.length; i++) {
            rTotal += r[i];
        }

        return cx / rTotal;
    }
    this._emitRow = function(images, startY) {
        var rowHeight = this._calculateY(images);

        var currentX = this.border;
        for (var i = 0; i < images.length; i++) {
            var currentImage = images[i];
            // r = x / y
            // x = r * y
            var width = (photoflow._getElementWidth(images[i]) / photoflow._getElementHeight(images[i])) * rowHeight;
            window.photoflow._positionImage(currentImage, currentX, startY, width, rowHeight);
            currentX += width + this.margin;
        }

        return rowHeight;
    }
    this._genRowKey = function(ixArray) {
        return ixArray.join(",");
    }
    this._rowHeight = function(ixArray) {
        var imageRow = [];
        for (var i = 0; i < ixArray.length; i++) {
            imageRow.push(this.images[ixArray[i]]);
        }
        return this._calculateY(imageRow);
    }
    this._calculateBadness = function(height) {
        return Math.pow(Math.abs(height - this.targetRowHeight), 2);
    }
    this._genValidChildren = function(rowMap, startIx) {
        var totalImages = this.images.length;
        var generatedRows = [];
        var currentRow = [startIx];
        var currentIx = startIx;
        var transitionedToInvalid = false;
        var lastValid = false;
        while (currentIx < totalImages && !transitionedToInvalid) {
            var currentHeight = this._rowHeight(currentRow);
            if (this._isRowValid(this.targetRowHeight, currentRow.length, currentHeight)) {
                lastValid = true;
                var rowKey = this._genRowKey(currentRow);
                if (!(rowKey in rowMap)) {
                    rowMap[rowKey] = {
                        key: rowKey,
                        height: currentHeight,
                        badness: this._calculateBadness(currentHeight),
                        cost: Infinity,
                        terminal: currentRow[currentRow.length - 1],
                        bestParent: null
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
    this._findOptimalRows = function() {
        var totalImages = this.images.length;
        var rootElement = { key:"root", height: -1, cost: 0, terminal: -1, bestParent: null };
        var rowMap = {"root": rootElement };
        var loops = 0;

        var bfs = [rootElement];
        var node;
        var bestPathEnd = null;
        var bestPathCost = Infinity;
        while (node = bfs.pop()) {
            var children = this._genValidChildren(rowMap, node.terminal + 1);
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
    }
    this._explodeRows = function(optimalRowKeys) {
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
    this._getRs = function (images) {
        var r = [];
        for (var i = 0; i < images.length; i++) {
            r.push(photoflow._getElementWidth(images[i]) / photoflow._getElementHeight(images[i]));
        }
        return r;
    }
    this._doFlow = function() {
        var rows = [];
        var didSearch = false;
        if (this.renderedWidth !== -1 && Math.abs(this.renderedWidth - this.width) < this.debounceResizeWidth) {
            rows = this.renderedRows;
        } else {
            rows = this._findOptimalRows();
            didSearch = true;
        }
        var chunks = this._explodeRows(rows);
        var y = this.border;
        for (var i = 0; i < chunks.length; i++) {
            var currentY = this._emitRow(chunks[i], y);
            y += currentY + this.margin;
        }
        window.photoflow._setContainerHeight(this.container, y + this.border);
        photoflow._revealContainer(this.container);
        if (didSearch) {
            this.renderedWidth = this.width;
            this.renderedRows = rows;
        }
    }
}

justifiedRenderer.prototype._setVariableSettings = function() {
    this.targetRowHeight = abstractRenderer.prototype._getDimensionSetting.call(this, 'justified.targetRowHeight');
    abstractRenderer.prototype._setVariableSettings.call(this);
}
