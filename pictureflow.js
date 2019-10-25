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
            var width = (currentImage.width / currentImage.height) * rowHeight;
            window.pictureflow._positionImage(currentImage, currentX, startY, width, rowHeight);
            window.pictureflow._revealImage(currentImage);
            currentX += width + this.border;
        }

        return rowHeight;
    }
    this._doFlow = function() {
        var chunks = chunk(this.images, this.imagesPerRow);
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
            r.push(images[i].width / images[i].height);
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
