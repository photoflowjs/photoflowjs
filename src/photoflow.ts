
import { defaultOptions } from './defaultOptions';
import { JustifiedRenderer } from './justifiedRenderer';

class Photoflow {
    private constructor() {}

    public static _initContainer(container: any) {
        container.style.position = "relative";
        container.style.visibility = "none";
        container.style.height = "0px";
    }

    public static _initImage(imgElement: any) {
        imgElement.style.position = "absolute";
    }

    public static _revealContainer(container: any) {
        container.style.visibility = "";
    }

    public static _positionImage(imgElement: any, x: Number, y: Number, width: Number, height: Number) {
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

    public static _getElementWidth(imgElement: any) {
        if (imgElement.tagName === 'PICTURE') {
            return imgElement.querySelector('img').naturalWidth;
        } else if (imgElement.tagName === 'VIDEO') {
            return imgElement.videoWidth;
        }

        return imgElement.naturalWidth;
    }

    public static _getElementHeight(imgElement: any) {
        if (imgElement.tagName === 'PICTURE') {
            return imgElement.querySelector('img').naturalHeight;
        } else if (imgElement.tagName === 'VIDEO') {
            return imgElement.videoHeight;
        }

        return imgElement.naturalHeight;
    }

    public static _setContainerHeight(container: HTMLElement, height: number) {
        container.style.height = height + "px";
    }

    public static _getOption(userOptions: any, key: any) {
        var currentDefault = defaultOptions;
        var currentUser = userOptions;
        var keysplit = key.split(".");
        for (var i = 0; i < keysplit.length; i++) {
            var currentKey = keysplit[i];
            if ((<any>currentDefault)[currentKey] !== undefined) {
                currentDefault = (<any>currentDefault)[currentKey];
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

    public static init(container: any, options: any) {
        Photoflow._initContainer(container);

        var domElements = Photoflow._getOption(options, 'elementSelector')(container);
        var images = Array.prototype.slice.call(domElements);

        let instance = new JustifiedRenderer(container, images, options);

        for (var i = 0; i < images.length; i++) {
            Photoflow._initImage(images[i]);
            var currentImage = images[i];
            var loadElement = images[i];
            if (currentImage.tagName === 'VIDEO') {
                if (currentImage.readyState >= 1) {
                    instance.imageInitialized();
                } else {
                    currentImage.addEventListener('loadedmetadata', function() {
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
            } else {
                loadElement.addEventListener("load", function() {
                    instance.imageInitialized();
                });
            }
        }

        window.onload = function() {
            instance.reflow();
        }
        window.onresize = function() {
            instance.reflow();
        }

        return instance;
    }
}


(<any>window).Photoflow = Photoflow;

export { Photoflow };
