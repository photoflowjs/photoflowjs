"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var photoflow_1 = require("./photoflow");
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
        var dimension = photoflow_1.Photoflow._getOption(this.userOptions, setting);
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
