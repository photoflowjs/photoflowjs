

function pictureflowInstance(window, container, images) {
    this.container = container;
    this.images = images;
    this.window = window;
    this.initializedImages = 0;
    this.width = 0;
    this.height = 0;
    // TODO: make this border dynamic
    this.border = 5;
    // TODO: Replace this with something fancy
    this.imagesPerRow = 3;
    // TODO: User defined
    this.rowHeightTarget = 600;
    // TODO: User defined
    this.minRowHeight = this.rowHeightTarget / 4;
    // TODO: User defined
    this.maxRowHeight = this.rowHeightTarget * 3;
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
    function chunk(arr, len) {
        var chunks = [],
        i = 0,
        n = arr.length;

        while (i < n) {
            chunks.push(arr.slice(i, i += len));
        }

        return chunks;
    }
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
            var width = (currentImage.naturalWidth / currentImage.naturalHeight) * rowHeight;
            window.pictureflow._positionImage(currentImage, currentX, startY, width, rowHeight);
            window.pictureflow._revealImage(currentImage);
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
        return Math.pow(Math.abs(height - this.rowHeightTarget), 2);
    }
    this._isRowValid = function(ixArray) {
        var y = this._rowHeight(ixArray);

        return y >= this.minRowHeight && y <= this.maxRowHeight;
    }
    this._findOptimalRows = function() {
        var totalImages = this.images.length;
        var rowMap = {"root": {key:"root", height: -1, cost: 0, terminal: false, bestParent: null, children: []}};
        var breakIx = [{ parent: "root", ix: 0 }];
        var poppedIx;
        while (popped = breakIx.pop()) {
            var poppedIx = popped.ix;
            var parent = popped.parent;
            var transitionedToInvalid = false;
            var lastValid = false;
            var currentIx = poppedIx;
            var currentRow = [poppedIx];
            while (currentIx < totalImages && !transitionedToInvalid) {
                if (this._isRowValid(currentRow)) {
                    lastValid = true;
                    var rowKey = this._genRowKey(currentRow);
                    breakIx.push({ parent: rowKey, ix: currentIx + 1 });
                    rowMap[parent].children.push(rowKey);
                    // Make sure we didn't already calculate this
                    if (!(rowKey in rowMap)) {
                        var currentHeight = this._rowHeight(currentRow);
                        rowMap[rowKey] = {
                            key: rowKey,
                            height: currentHeight,
                            badness: this._calculateBadness(currentHeight),
                            cost: Infinity,
                            terminal: currentRow[currentRow.length - 1] === totalImages - 1,
                            bestParent: null,
                            children: []
                        };
                    }
                } else {
                    if (lastValid) {
                        transitionedToInvalid = true;
                    }
                }
                currentIx++;
                currentRow.push(currentIx);
            }
        }

        var bfs = [rowMap.root];
        var node;
        while (node = bfs.pop()) {
            for (var i = 0; i < node.children.length; i++) {
                var currentChild = rowMap[node.children[i]];
                bfs.push(currentChild);
                if (node.cost + currentChild.badness < currentChild.cost) {
                    currentChild.cost = node.cost + currentChild.badness;
                    currentChild.bestParent = node.key;
                }
            }
        }

        var rows = Object.keys(rowMap);
        var bestPathEnd = null;
        var bestPathCost = Infinity;

        for (var i = 0; i < rows.length; i++) {
            var currentRow = rowMap[rows[i]];
            if (currentRow.terminal) {
                if (currentRow.cost < bestPathCost) {
                    bestPathCost = currentRow.cost;
                    bestPathEnd = currentRow.key;
                }
            }
        }

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
    this._doFlow = function() {
        var rows = this._findOptimalRows();
        console.log(rows);
        var chunks = this._explodeRows(rows);
        //var chunks = chunk(this.images, this.imagesPerRow);
        var y = 0;
        for (var i = 0; i < chunks.length; i++) {
            var currentY = this._emitRow(chunks[i], y);
            y += currentY + this.border;
        }
        window.pictureflow._setContainerHeight(this.container, y);
    }
    this._getRs = function (images) {
        var r = [];
        for (var i = 0; i < images.length; i++) {
            r.push(images[i].naturalWidth / images[i].naturalHeight);
        }
        return r;
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
    console.log(this);
}

(function (window) {
    var pictureflow = {};

    pictureflow._initContainer = function(container) {
        container.style.position = "relative";
    }

    pictureflow._initImage = function(imgElement) {
        imgElement.style.display = "none";
        imgElement.style.position = "absolute";
    }

    pictureflow._revealImage = function(imgElement) {
        imgElement.style.display = "";
    }

    pictureflow._positionImage = function(imgElement, x, y, width, height) {
        imgElement.style.top = y;
        imgElement.style.left = x;
        imgElement.style.width = width;
        imgElement.style.height = height;
    }

    pictureflow._setContainerHeight = function(container, height) {
        container.style.height = height;
    }

    pictureflow.init = function(domElement) {
        pictureflow._initContainer(domElement);

        // Todo, make this selector dynamic
        var domImages = domElement.getElementsByTagName('img');
        var images = Array.prototype.slice.call(domImages);

        let instance = new pictureflowInstance(window, domElement, images);

        for (var i = 0; i < images.length; i++) {
            pictureflow._initImage(images[i]);
            images[i].onload = function () {
                instance._imageInitialized();
            };
            //positionImage(images[i], 0, i * 100, 100, 100);
            //revealImage(images[i]);
        }

        pictureflow._setContainerHeight(domElement, 100);
    }

    window.pictureflow = pictureflow;
})(window);
