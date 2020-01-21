import { CommonModule } from '@angular/common';
import {
    Directive, ElementRef, EventEmitter, HostListener,
    Output, PipeTransform, Renderer2,
    Input, NgModule, OnInit,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DeprecateProperty } from '../../core/deprecateDecorators';
import { KEYS, MaskParsingService } from './mask-parsing.service';
import { isIE, IBaseEventArgs } from '../../core/utils';

const noop = () => { };

@Directive({
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: IgxMaskDirective, multi: true }],
    selector: '[igxMask]'
})
export class IgxMaskDirective implements OnInit, ControlValueAccessor {
    /**
     * Sets the input mask.
     * ```html
     * <input [igxMask] = "'00/00/0000'">
     * ```
     */
    @Input('igxMask')
    public mask = 'CCCCCCCCCC';

    /**
     * Sets the character representing a fillable spot in the input mask.
     * Default value is "'_'".
     * ```html
     * <input [promptChar] = "'/'">
     * ```
     */
    @Input()
    public promptChar = '_';

    /**
     * Specifies if the bound value includes the formatting symbols.
     * ```html
     * <input [includeLiterals] = "true">
     * ```
     */
    @Input()
    public includeLiterals: boolean;

    /**
     * Specifies a placeholder.
     * ```html
     * <input placeholder = "enter text...">
     * ```
     */
    @DeprecateProperty('"placeholder" is deprecated, use native placeholder instead.')
    public set placeholder(val: string) {
        this.renderer.setAttribute(this.nativeElement, 'placeholder', val);
    }

    public get placeholder(): string {
        return this.nativeElement.placeholder;
    }

    /**
     * Specifies a pipe to be used on blur.
     * ```html
     * <input [displayValuePipe] = "displayFormatPipe">
     * ```
     */
    @Input()
    public displayValuePipe: PipeTransform;

    /**
     * Specifies a pipe to be used on focus.
     * ```html
     * <input [focusedValuePipe] = "inputFormatPipe">
     * ```
     */
    @Input()
    public focusedValuePipe: PipeTransform;

    /** @hidden */
    @Input()
    private dataValue: string;

    /**
     * Emits an event each time the value changes.
     * Provides `rawValue: string` and `formattedValue: string` as event arguments.
     * ```html
     * <input (onValueChange) = "onValueChange(rawValue: string, formattedValue: string)">
     * ```
     */
    @Output()
    public onValueChange = new EventEmitter<IMaskEventArgs>();

    /** @hidden @internal; */
    protected get inputValue(): string {
        return this.nativeElement.value;
    }

    /** @hidden @internal */
    protected set inputValue(val) {
        this.nativeElement.value = val;
    }

    /** @hidden */
    protected get maskOptions() {
        const format = this.mask;
        const promptChar = this.promptChar && this.promptChar.substring(0, 1);
        return { format, promptChar };
    }

    private get selectionStart(): number {
        return this.nativeElement.selectionStart;
    }

    private get selectionEnd(): number {
        return this.nativeElement.selectionEnd;
    }

    private get nativeElement() {
        return this.elementRef.nativeElement;
    }

    private _key;
    private _selection;
    private _stopPropagation: boolean;

    private _onTouchedCallback: () => void = noop;
    private _onChangeCallback: (_: any) => void = noop;

    constructor(
        protected elementRef: ElementRef,
        protected maskParser: MaskParsingService,
        protected renderer: Renderer2) { }

    /** @hidden */
    public ngOnInit(): void {
        this.renderer.setAttribute(this.nativeElement, 'placeholder',
            this.placeholder ? this.placeholder : this.maskOptions.format);
    }

    /** @hidden */
    @HostListener('keydown', ['$event'])
    public onKeyDown(event): void {
        const key = event.keyCode || event.charCode;

        if (isIE() && this._stopPropagation) {
            this._stopPropagation = false;
        }

        if ((key === KEYS.Ctrl && key === KEYS.Z) || (key === KEYS.Ctrl && key === KEYS.Y)) {
            event.preventDefault();
        }

        this._key = key;
        this._selection = Math.abs(this.selectionEnd - this.selectionStart);
    }

    /** @hidden */
    @HostListener('input', ['$event'])
    public onInputChanged(event): void {
        if (isIE() && this._stopPropagation) {
            this._stopPropagation = false;
            return;
        }

        const currentCursorPos = this.getCursorPosition();
        const hasDeleteAction = (this._key === KEYS.BACKSPACE) || (this._key === KEYS.DELETE);
        this.inputValue = this._selection !== 0 ?
            this.maskParser.parseValueWithSelection(
                this.inputValue, this.maskOptions, currentCursorPos - 1, this._selection, hasDeleteAction) :
            this.maskParser.parseValueWithoutSelection(this.inputValue, this.maskOptions, currentCursorPos - 1);

        this.setCursorPosition(this.maskParser.cursor);

        const rawVal = this.maskParser.restoreValueFromMask(this.inputValue, this.maskOptions);
        this.dataValue = this.includeLiterals ? this.inputValue : rawVal;
        this._onChangeCallback(this.dataValue);

        this.onValueChange.emit({ rawValue: rawVal, formattedValue: this.inputValue });
    }

    /** @hidden */
    @HostListener('paste', ['$event'])
    public onPaste(event): void {
        event.preventDefault();
        this.inputValue = this.maskParser.parseValueOnPaste(
            this.inputValue, this.maskOptions, this.getCursorPosition(), event.clipboardData.getData('text'), this._selection);
        this.setCursorPosition(this.maskParser.cursor);
    }

    /** @hidden */
    @HostListener('focus', ['$event.target.value'])
    public onFocus(value): void {
        if (this.focusedValuePipe) {
            if (isIE()) {
                this._stopPropagation = true;
            }
            this.inputValue = this.focusedValuePipe.transform(value);
        } else {
            this.inputValue = this.maskParser.parseValueByMaskOnInit(this.inputValue, this.maskOptions);
        }
    }

    /** @hidden */
    @HostListener('blur', ['$event.target.value'])
    public onBlur(value): void {
        if (this.displayValuePipe) {
            this.inputValue = this.displayValuePipe.transform(value);
        } else if (value === this.maskParser.parseMask(this.maskOptions)) {
            this.inputValue = '';
        }
    }

    private getCursorPosition(): number {
        return this.nativeElement.selectionStart;
    }

    private setCursorPosition(start: number, end: number = start): void {
        this.nativeElement.setSelectionRange(start, end);
    }

    /** @hidden */
    public writeValue(value): void {
        if (this.promptChar && this.promptChar.length > 1) {
            this.maskOptions.promptChar = this.promptChar.substring(0, 1);
        }

        this.inputValue = value ? this.maskParser.parseValueByMaskOnInit(value, this.maskOptions) : '';
        if (this.displayValuePipe) {
            this.inputValue = this.displayValuePipe.transform(this.inputValue);
        }

        this.dataValue = this.includeLiterals ? this.inputValue : value;
        this._onChangeCallback(this.dataValue);

        this.onValueChange.emit({ rawValue: value, formattedValue: this.inputValue });
    }

    /** @hidden */
    public registerOnChange(fn: (_: any) => void): void { this._onChangeCallback = fn; }

    /** @hidden */
    public registerOnTouched(fn: () => void): void { this._onTouchedCallback = fn; }
}

/**
 * The IgxMaskModule provides the {@link IgxMaskDirective} inside your application.
 */
export interface IMaskEventArgs extends IBaseEventArgs {
    rawValue: string;
    formattedValue: string;
}

/** @hidden */
@NgModule({
    declarations: [IgxMaskDirective],
    exports: [IgxMaskDirective],
    imports: [CommonModule]
})
export class IgxMaskModule { }
