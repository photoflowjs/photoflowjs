import { Photoflow } from './photoflow';

export abstract class AbstractRenderer {
    protected userOptions: any;
    protected container: HTMLElement;
    protected images: HTMLElement[];
    protected initializedImages: number;
    protected width: number;
    protected height: number;
    protected border: number;
    protected margin: number; // TODO Set 0
    // TODO
    //this._setVariableSettings();
    protected debounceResizeWidth: number;
    protected onready: Function|null;
    protected onresize: Function|null;
    protected hasRendered: Boolean;
    public constructor(container: any, images: any, userOptions: any) {
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

    protected getDimensionSetting(setting: any): number {
        var dimension = Photoflow._getOption(this.userOptions, setting);
        if (typeof dimension === 'number') {
            return dimension;
        }

        if (typeof dimension !== 'string') {
            console.error("Unsupported dimension type");
            return 0;
        }

        // Make sure they didn't just pass a stringified number "123"
        var stringNumber = parseInt(dimension);
        if (!isNaN(<number><unknown>dimension) && !isNaN(stringNumber)) {
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

        return 0;
    }

    protected setVariableSettings() {
        this.border = this.getDimensionSetting('border');
        this.margin = this.getDimensionSetting('margin');
        this.debounceResizeWidth = this.getDimensionSetting.call(this, 'debounceResizeWidth');
    }

    public reflow() {
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
    }

    public imageInitialized() {
        this.initializedImages++;
        if (this.initializedImages === this.images.length) {
            this.reflow();
        }
    }

    private ready() {
        if (this.onready) {
            this.onready(this);
        }
    }

    private resize() {
        if (this.onresize) {
            this.onresize(this);
        }
    }

    protected abstract doFlow(): void;
}