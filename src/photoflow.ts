
import { JustifiedRenderer } from './justifiedRenderer';
import { PhotoflowHelpers } from './photoflowHelpers';
import { PhotoflowOptionsInterface } from './defaultOptions';

class Photoflow {
    private constructor() {}

    public static init(container: HTMLElement, options: PhotoflowOptionsInterface) {
        PhotoflowHelpers.initContainer(container);

        var domElements = PhotoflowHelpers.getOption(options, 'elementSelector')(container);
        var images = Array.prototype.slice.call(domElements);

        let instance = new JustifiedRenderer(container, images, options);

        for (var i = 0; i < images.length; i++) {
            PhotoflowHelpers.initImage(images[i]);
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
