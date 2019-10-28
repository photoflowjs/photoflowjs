"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var defaultOptions_1 = require("./defaultOptions");
var justifiedRenderer_1 = require("./justifiedRenderer");
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
