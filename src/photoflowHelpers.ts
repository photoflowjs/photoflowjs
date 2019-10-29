
import { defaultOptions, PhotoflowOptionsInterface } from './defaultOptions';

class PhotoflowHelpers {
    private constructor() {}

    public static initContainer(container: HTMLElement) {
        container.style.position = "relative";
        container.style.visibility = "none";
        container.style.height = "0px";
    }

    public static initImage(imgElement: HTMLElement) {
        imgElement.style.position = "absolute";
    }

    public static revealContainer(container: HTMLElement) {
        container.style.visibility = "";
    }

    public static positionImage(imgElement: HTMLElement, x: number, y: number, width: number, height: number) {
        var layoutElment = imgElement;
        layoutElment.style.top = y + "px";
        layoutElment.style.left = x + "px";
        var dimensionElement = imgElement;
        if (imgElement.tagName === 'PICTURE') {
            dimensionElement = <HTMLElement>imgElement.querySelector('img');
        }
        dimensionElement.style.width = width + "px";
        dimensionElement.style.height = height + "px";
    }

    public static getElementWidth(imgElement: HTMLElement): number {
        if (imgElement.tagName === 'PICTURE') {
            var image = imgElement.querySelector('img');
            if (image === null) {
                return 0;
            }

            return image.naturalWidth;
        } else if (imgElement.tagName === 'VIDEO') {
            return (<HTMLVideoElement>imgElement).videoWidth;
        }

        return (<HTMLImageElement>imgElement).naturalWidth;
    }

    public static getElementHeight(imgElement: HTMLElement): number {
        if (imgElement.tagName === 'PICTURE') {
            var image = imgElement.querySelector('img');
            if (image === null) {
                return 0;
            }

            return image.naturalHeight;
        } else if (imgElement.tagName === 'VIDEO') {
            return (<HTMLVideoElement>imgElement).videoHeight;
        }

        return (<HTMLImageElement>imgElement).naturalHeight;
    }

    public static setContainerHeight(container: HTMLElement, height: number) {
        container.style.height = height + "px";
    }

    public static getOption(userOptions: PhotoflowOptionsInterface, key: string): any {
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
                currentUser = (<any>currentUser)[currentKey];
            }
        }

        if (currentUser !== undefined && currentUser !== null) {
            return currentUser;
        }

        return currentDefault;
    }
}

export { PhotoflowHelpers };
