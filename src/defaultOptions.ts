
interface PhotoflowOptionsInterface {
    border?: number,
    margin?: number,
    debounceResizeWidth?: number,
    elementSelector?: (container: HTMLElement) => HTMLElement[],
    justified?: {
        targetRowHeight?: string|number,
        validRow?: (targetRowHeight: number, rowElementCount: number, currentRowHeight: number, totalElements: number) => boolean
    }
}

var defaultOptions: PhotoflowOptionsInterface = {
    border: 0,
    margin: 5,
    debounceResizeWidth: 50,
    elementSelector: function(container: HTMLElement): HTMLElement[] {
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
        validRow: function(targetRowHeight: number, rowElementCount: number, currentRowHeight: number, totalElements: number): boolean {
            // For larger galleries be stricter about what a valid row is, so there are less nodes/edges in the DAG
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
};

export { defaultOptions, PhotoflowOptionsInterface };
