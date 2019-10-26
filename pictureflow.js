

function abstractRenderer(window, container, images, userOptions) {
    this.container = container;
    this.images = images;
    this.window = window;
    this.initializedImages = 0;
    this.width = 0;
    this.height = 0;
    this.border = pictureflow._getOption(userOptions, 'border');
    var _t = this;

    this.window.onresize = function () {
        _t._windowResized();
    }
    this._windowResized = function() {
        var newWidth = this.container.offsetWidth;
        var newHeight = this.container.offsetHeight;
        var widthChanged = false;

        if (this.width !== newWidth) {
            widthChanged = true;
        }

        this.width = newWidth;
        this.height = newHeight;

        if (widthChanged) {
            this._doFlow();
        }
    }
    this._imageInitialized = function() {
        this.initializedImages++;
        if (this.initializedImages === this.images.length) {
            for (var i = 0; i < this.images.length; i++) {
                this._windowResized();
                this._doFlow();
            }
        }
    }
}

function pictureflowInstance(window, container, images, userOptions) {
    abstractRenderer.call(this, window, container, images, userOptions);

    this.targetRowHeight = pictureflow._getOption(userOptions, 'justified.targetRowHeight');
    this._isRowValid = pictureflow._getOption(userOptions, 'justified.validRow');
    this.debounceResizeWidth = pictureflow._getOption(userOptions, 'debounceResizeWidth');
    this.userOptions = userOptions;
    this.renderedWidth = -1;
    this.renderedRows = [];

    this._calculateY = function(images) {
        var cx = this.width - ((images.length - 1) * this.border);
        var r = this._getRs(images);
        var rTotal = 0;
        for (var i = 0; i < r.length; i++) {
            rTotal += r[i];
        }

        return cx / rTotal;
    }
    this._emitRow = function(images, startY) {
        var rowHeight = this._calculateY(images);

        var currentX = 0;
        for (var i = 0; i < images.length; i++) {
            var currentImage = images[i];
            // r = x / y
            // x = r * y
            var width = (pictureflow._getElementWidth(images[i]) / pictureflow._getElementHeight(images[i])) * rowHeight;
            window.pictureflow._positionImage(currentImage, currentX, startY, width, rowHeight);
            currentX += width + this.border;
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
            r.push(pictureflow._getElementWidth(images[i]) / pictureflow._getElementHeight(images[i]));
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
        var y = 0;
        for (var i = 0; i < chunks.length; i++) {
            var currentY = this._emitRow(chunks[i], y);
            y += currentY + this.border;
        }
        window.pictureflow._setContainerHeight(this.container, y);
        pictureflow._revealContainer(this.container);
        if (didSearch) {
            this.renderedWidth = this.width;
            this.renderedRows = rows;
        }
    }
}

(function (window) {
    var pictureflow = function(){};

    pictureflow._initContainer = function(container) {
        container.style.position = "relative";
        container.style.display = "none";
    }

    pictureflow._initImage = function(imgElement) {
        imgElement.style.position = "absolute";
    }

    pictureflow._revealContainer = function(container) {
        container.style.display = "";
    }

    pictureflow._positionImage = function(imgElement, x, y, width, height) {
        var layoutElment = imgElement;
        layoutElment.style.top = y;
        layoutElment.style.left = x;
        var dimensionElement = imgElement;
        if (imgElement.tagName === 'PICTURE') {
            dimensionElement = imgElement.querySelector('img');
        }
        dimensionElement.style.width = width;
        dimensionElement.style.height = height;
    }

    pictureflow._getElementWidth = function(imgElement) {
        if (imgElement.tagName === 'PICTURE') {
            return imgElement.querySelector('img').naturalWidth;
        } else if (imgElement.tagName === 'VIDEO') {
            return imgElement.videoWidth;
        }

        return imgElement.naturalWidth;
    }

    pictureflow._getElementHeight = function(imgElement) {
        if (imgElement.tagName === 'PICTURE') {
            return imgElement.querySelector('img').naturalHeight;
        } else if (imgElement.tagName === 'VIDEO') {
            return imgElement.videoHeight;
        }

        return imgElement.naturalHeight;
    }

    pictureflow._setContainerHeight = function(container, height) {
        container.style.height = height;
    }

    pictureflow._getOption = function(userOptions, key) {
        var currentDefault = pictureflow.defaultOptions;
        var currentUser = userOptions;
        var keysplit = key.split(".");
        for (var i = 0; i < keysplit.length; i++) {
            var currentKey = keysplit[i];
            if (currentDefault[currentKey]) {
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

    pictureflow.init = function(container, options) {
        pictureflow._initContainer(container);

        var domElements = pictureflow._getOption(options, 'elementSelector')(container);
        var images = Array.prototype.slice.call(domElements);

        let instance = new pictureflowInstance(window, container, images, options);

        for (var i = 0; i < images.length; i++) {
            pictureflow._initImage(images[i]);
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

            loadElement.onload = function () {
                console.log(this);
                instance._imageInitialized();
            };
        }

        pictureflow._setContainerHeight(container, 100);
    }

    pictureflow.defaultOptions = {
        border: 5,
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
            targetRowHeight: 400,
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

    window.pictureflow = pictureflow;
})(window);
