import {
    Component,
    ElementRef,
    Inject,
    NgModule,
    ViewChild,
    ComponentRef,
    HostBinding,
    ApplicationRef
} from '@angular/core';
import { TestBed, fakeAsync, tick, async, inject } from '@angular/core/testing';
import { BrowserModule } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { IgxOverlayService } from './overlay';
import { IgxToggleDirective, IgxToggleModule, IgxOverlayOutletDirective } from './../../directives/toggle/toggle.directive';
import { AutoPositionStrategy } from './position/auto-position-strategy';
import { ConnectedPositioningStrategy } from './position/connected-positioning-strategy';
import { GlobalPositionStrategy } from './position/global-position-strategy';
import { ElasticPositionStrategy } from './position/elastic-position-strategy';
import {
    PositionSettings,
    HorizontalAlignment,
    VerticalAlignment,
    OverlaySettings,
    Point,
    OverlayEventArgs,
    OverlayCancelableEventArgs,
    Util
} from './utilities';
import { NoOpScrollStrategy } from './scroll/NoOpScrollStrategy';
import { BlockScrollStrategy } from './scroll/block-scroll-strategy';
import { AbsoluteScrollStrategy } from './scroll/absolute-scroll-strategy';
import { CloseScrollStrategy } from './scroll/close-scroll-strategy';
import { UIInteractions } from '../../test-utils/ui-interactions.spec';

import { configureTestSuite } from '../../test-utils/configure-suite';
import { IgxCalendarComponent, IgxCalendarModule } from '../../calendar/index';
import { IgxAvatarComponent, IgxAvatarModule } from '../../avatar/avatar.component';
import { IgxDatePickerComponent, IgxDatePickerModule } from '../../date-picker/date-picker.component';
import { IPositionStrategy } from './position/IPositionStrategy';
import { IgxCalendarContainerComponent } from '../../date-picker/calendar-container.component';
import { BaseFitPositionStrategy } from './position/base-fit-position-strategy';
import { ContainerPositionStrategy } from './position';
import { scaleInVerTop, scaleOutVerTop } from '../../animations/main';

const CLASS_OVERLAY_CONTENT = 'igx-overlay__content';
const CLASS_OVERLAY_CONTENT_MODAL = 'igx-overlay__content--modal';
const CLASS_OVERLAY_WRAPPER = 'igx-overlay__wrapper';
const CLASS_OVERLAY_WRAPPER_MODAL = 'igx-overlay__wrapper--modal';
const CLASS_OVERLAY_MAIN = 'igx-overlay';

// Utility function to get all applied to element css from all sources.
function css(element) {
    const sheets = document.styleSheets, ret = [];
    element.matches = element.matches || element.webkitMatchesSelector || element.mozMatchesSelector
        || element.msMatchesSelector || element.oMatchesSelector;
    for (const key in sheets) {
        if (sheets.hasOwnProperty(key)) {
            const sheet = <CSSStyleSheet>sheets[key];
            const rules: any = sheet.rules || sheet.cssRules;

            for (const r in rules) {
                if (element.matches(rules[r].selectorText)) {
                    ret.push(rules[r].cssText);
                }
            }
        }
    }
    return ret;
}

function addScrollDivToElement(parent) {
    const scrollDiv = document.createElement('div');
    scrollDiv.style.width = '100px';
    scrollDiv.style.height = '100px';
    scrollDiv.style.top = '10000px';
    scrollDiv.style.left = '10000px';
    scrollDiv.style.position = 'absolute';
    parent.appendChild(scrollDiv);

}

/**
 * Returns the top left location of the shown element
 * @param positionSettings Overlay setting to get location for
 * @param targetRect Rectangle of overlaySettings.target
 * @param wrapperRect Rectangle of shown element
 * @param screenRect Rectangle of the visible area
 * @param elastic Is elastic position strategy, defaults to false
 */
function getOverlayWrapperLocation(
    positionSettings: PositionSettings,
    targetRect: ClientRect,
    wrapperRect: ClientRect,
    screenRect: ClientRect,
    elastic = false): Point {
    const location: Point = new Point(0, 0);

    location.x =
        targetRect.left +
        targetRect.width * (1 + positionSettings.horizontalStartPoint) +
        wrapperRect.width * positionSettings.horizontalDirection;
    if (location.x < screenRect.left) {
        if (elastic) {
            let offset = screenRect.left - location.x;
            if (offset > wrapperRect.width - positionSettings.minSize.width) {
                offset = wrapperRect.width - positionSettings.minSize.width;
            }
            location.x += offset;
        } else {
            const flipOffset = wrapperRect.width * (1 + positionSettings.horizontalDirection);
            if (positionSettings.horizontalStartPoint === HorizontalAlignment.Left) {
                location.x = Math.max(0, targetRect.right - flipOffset);
            } else if (positionSettings.horizontalStartPoint === HorizontalAlignment.Center) {
                location.x =
                    Math.max(0, targetRect.left + targetRect.width / 2 - flipOffset);
            } else {
                location.x = Math.max(0, targetRect.left - flipOffset);
            }
        }
    } else if (location.x + wrapperRect.width > screenRect.right && !elastic) {
        const flipOffset = wrapperRect.width * (1 + positionSettings.horizontalDirection);
        if (positionSettings.horizontalStartPoint === HorizontalAlignment.Left) {
            location.x = Math.min(screenRect.right, targetRect.right - flipOffset);
        } else if (positionSettings.horizontalStartPoint === HorizontalAlignment.Center) {
            location.x = Math.min(screenRect.right, targetRect.left + targetRect.width / 2 - flipOffset);
        } else {
            location.x = Math.min(screenRect.right, targetRect.left - flipOffset);
        }
    }

    location.y =
        targetRect.top +
        targetRect.height * (1 + positionSettings.verticalStartPoint) +
        wrapperRect.height * positionSettings.verticalDirection;
    if (location.y < screenRect.top) {
        if (elastic) {
            let offset = screenRect.top - location.y;
            if (offset > wrapperRect.height - positionSettings.minSize.height) {
                offset = wrapperRect.height - positionSettings.minSize.height;
            }
            location.y += offset;
        } else {
            const flipOffset = wrapperRect.height * (1 + positionSettings.verticalDirection);
            if (positionSettings.verticalStartPoint === VerticalAlignment.Top) {
                location.y = Math.max(0, targetRect.bottom - flipOffset);
            } else if (positionSettings.verticalStartPoint === VerticalAlignment.Middle) {
                location.y = Math.max(0, targetRect.top + targetRect.height / 2 - flipOffset);
            } else {
                location.y =  Math.max(0, targetRect.top - flipOffset);
            }
        }
    } else if (location.y + wrapperRect.height > screenRect.bottom && !elastic) {
        const flipOffset = wrapperRect.height * (1 + positionSettings.verticalDirection);
        if (positionSettings.verticalStartPoint === VerticalAlignment.Top) {
            location.y = Math.min(screenRect.bottom, targetRect.bottom - flipOffset);
        } else if (positionSettings.verticalStartPoint === VerticalAlignment.Middle) {
            location.y = Math.min(screenRect.bottom, targetRect.top + targetRect.height / 2 - flipOffset);
        } else {
            location.y = Math.min(screenRect.bottom, targetRect.top - flipOffset);
        }
    }
    return location;
}

describe('igxOverlay', () => {
    beforeEach(async(() => {
        UIInteractions.clearOverlay();
    }));

    afterAll(() => {
        UIInteractions.clearOverlay();
    });

    describe('Unit Tests: ', () => {
        configureTestSuite();
        beforeEach(async(() => {
            TestBed.configureTestingModule({
                imports: [IgxToggleModule, DynamicModule, NoopAnimationsModule],
                declarations: DIRECTIVE_COMPONENTS
            }).compileComponents();
        }));

        it('OverlayElement should return a div attached to Document\'s body.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            fixture.componentInstance.buttonElement.nativeElement.click();
            tick();
            const overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeDefined();
            expect(overlayDiv.classList.contains('igx-overlay')).toBeTruthy();
        }));

        it('Should attach to setting target or default to body', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            const button = fixture.componentInstance.buttonElement;
            const overlay = fixture.componentInstance.overlay;
            fixture.detectChanges();

            overlay.show(SimpleDynamicComponent, {
                outlet: button,
                modal: false
            });
            tick();
            let wrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            expect(wrapper).toBeDefined();
            expect(wrapper.parentNode).toBe(button.nativeElement);
            overlay.hideAll();

            overlay.show(SimpleDynamicComponent, { modal: false });
            tick();
            wrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            expect(wrapper).toBeDefined();
            expect(wrapper.parentElement.classList).toContain('igx-overlay');
            expect(wrapper.parentElement.parentElement).toBe(document.body);
            overlay.hideAll();

            const outlet = document.createElement('div');
            fixture.debugElement.nativeElement.appendChild(outlet);
            overlay.show(SimpleDynamicComponent, {
                modal: false,
                outlet: new IgxOverlayOutletDirective(new ElementRef(outlet))
            });
            tick();
            wrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            expect(wrapper).toBeDefined();
            expect(wrapper.parentNode).toBe(outlet);
        }));

        it('Should show component passed to overlay.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            fixture.componentInstance.buttonElement.nativeElement.click();
            tick();
            const overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeDefined();
            expect(overlayDiv.children.length).toEqual(1);
            const wrapperDiv = overlayDiv.children[0];
            expect(wrapperDiv).toBeDefined();
            expect(wrapperDiv.classList.contains(CLASS_OVERLAY_WRAPPER_MODAL)).toBeTruthy();
            expect(wrapperDiv.children[0].localName).toEqual('div');

            const contentDiv = wrapperDiv.children[0];
            expect(contentDiv).toBeDefined();
            expect(contentDiv.classList.contains(CLASS_OVERLAY_CONTENT_MODAL)).toBeTruthy();
        }));

        it('Should hide component and the overlay when Hide() is called.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            let overlayDiv: Element;

            fixture.componentInstance.overlay.show(SimpleDynamicComponent);
            tick();

            fixture.componentInstance.overlay.show(SimpleDynamicComponent);
            tick();

            overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeDefined();
            expect(overlayDiv.children.length).toEqual(2);
            expect(overlayDiv.children[0].localName).toEqual('div');
            expect(overlayDiv.children[1].localName).toEqual('div');

            fixture.componentInstance.overlay.hide('0');
            tick();

            overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeDefined();
            expect(Array.from(overlayDiv.classList).indexOf(CLASS_OVERLAY_MAIN) > -1).toBeTruthy();
            expect(overlayDiv.children.length).toEqual(1);
            expect(overlayDiv.children[0].localName).toEqual('div');

            fixture.componentInstance.overlay.hide('1');
            tick();

            overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeUndefined();
        }));

        it('Should hide all components and the overlay when HideAll() is called.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            let overlayDiv: Element;
            fixture.componentInstance.overlay.show(SimpleDynamicComponent);
            fixture.componentInstance.overlay.show(SimpleDynamicComponent);
            tick();
            fixture.detectChanges();
            overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeDefined();
            expect(overlayDiv.children.length).toEqual(2);
            expect(overlayDiv.children[0].localName).toEqual('div');
            expect(overlayDiv.children[1].localName).toEqual('div');

            fixture.componentInstance.overlay.hideAll();
            tick();
            overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeUndefined();
        }));

        it('Should show and hide component via directive.', fakeAsync(() => {
            const fixture = TestBed.createComponent(SimpleDynamicWithDirectiveComponent);
            fixture.detectChanges();
            let overlayDiv: Element;
            fixture.componentInstance.show();
            tick();
            overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeDefined();
            expect(overlayDiv.children.length).toEqual(1);
            expect(overlayDiv.children[0].localName).toEqual('div');

            fixture.componentInstance.hide();
            tick();
            overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeUndefined();
        }));

        it('Should properly emit events.', fakeAsync(() => {
            const fix = TestBed.createComponent(SimpleRefComponent);
            fix.detectChanges();
            const overlayInstance = fix.componentInstance.overlay;
            spyOn(overlayInstance.onClosed, 'emit');
            spyOn(overlayInstance.onClosing, 'emit');
            spyOn(overlayInstance.onOpened, 'emit');
            spyOn(overlayInstance.onAppended, 'emit');
            spyOn(overlayInstance.onOpening, 'emit');
            spyOn(overlayInstance.onAnimation, 'emit');

            const firstCallId = overlayInstance.show(SimpleDynamicComponent);
            tick();

            expect(overlayInstance.onOpening.emit).toHaveBeenCalledTimes(1);
            expect(overlayInstance.onOpening.emit)
                .toHaveBeenCalledWith({ id: firstCallId, componentRef: jasmine.any(ComponentRef), cancel: false });
            const args: OverlayEventArgs = (overlayInstance.onOpening.emit as jasmine.Spy).calls.mostRecent().args[0];
            expect(args.componentRef.instance).toEqual(jasmine.any(SimpleDynamicComponent));
            expect(overlayInstance.onAppended.emit).toHaveBeenCalledTimes(1);
            expect(overlayInstance.onAnimation.emit).toHaveBeenCalledTimes(1);

            tick();
            expect(overlayInstance.onOpened.emit).toHaveBeenCalledTimes(1);
            expect(overlayInstance.onOpened.emit).toHaveBeenCalledWith({ id: firstCallId, componentRef: jasmine.any(ComponentRef) });
            overlayInstance.hide(firstCallId);

            tick();
            expect(overlayInstance.onClosing.emit).toHaveBeenCalledTimes(1);
            expect(overlayInstance.onClosing.emit)
                .toHaveBeenCalledWith({ id: firstCallId, componentRef: jasmine.any(ComponentRef), cancel: false, event: undefined });
            expect(overlayInstance.onAnimation.emit).toHaveBeenCalledTimes(2);

            tick();
            expect(overlayInstance.onClosed.emit).toHaveBeenCalledTimes(1);
            expect(overlayInstance.onClosed.emit).toHaveBeenCalledWith({ id: firstCallId, componentRef: jasmine.any(ComponentRef) });

            const secondCallId = overlayInstance.show(fix.componentInstance.item);
            tick();
            expect(overlayInstance.onOpening.emit).toHaveBeenCalledTimes(2);
            expect(overlayInstance.onOpening.emit).toHaveBeenCalledWith({ componentRef: undefined, id: secondCallId, cancel: false });
            expect(overlayInstance.onAppended.emit).toHaveBeenCalledTimes(2);
            expect(overlayInstance.onAnimation.emit).toHaveBeenCalledTimes(3);

            tick();
            expect(overlayInstance.onOpened.emit).toHaveBeenCalledTimes(2);
            expect(overlayInstance.onOpened.emit).toHaveBeenCalledWith({ componentRef: undefined, id: secondCallId });

            overlayInstance.hide(secondCallId);
            tick();
            expect(overlayInstance.onClosing.emit).toHaveBeenCalledTimes(2);
            expect(overlayInstance.onClosing.emit).
                toHaveBeenCalledWith({ componentRef: undefined, id: secondCallId, cancel: false, event: undefined });
            expect(overlayInstance.onAnimation.emit).toHaveBeenCalledTimes(4);

            tick();
            expect(overlayInstance.onClosed.emit).toHaveBeenCalledTimes(2);
            expect(overlayInstance.onClosed.emit).toHaveBeenCalledWith({ componentRef: undefined, id: secondCallId });
        }));

        it('Should properly set style on position method call - GlobalPosition.', () => {
            const mockParent = document.createElement('div');
            const mockItem = document.createElement('div');
            mockParent.appendChild(mockItem);

            const mockPositioningSettings1: PositionSettings = {
                horizontalDirection: HorizontalAlignment.Right,
                verticalDirection: VerticalAlignment.Bottom,
                target: mockItem
            };

            const horAl = Object.keys(HorizontalAlignment).filter(key => !isNaN(Number(HorizontalAlignment[key])));
            const verAl = Object.keys(VerticalAlignment).filter(key => !isNaN(Number(VerticalAlignment[key])));

            const mockDirection: string[] = ['flex-start', 'center', 'flex-end'];

            for (let i = 0; i < mockDirection.length; i++) {
                for (let j = 0; j < mockDirection.length; j++) {
                    mockPositioningSettings1.horizontalDirection = HorizontalAlignment[horAl[i]];
                    mockPositioningSettings1.verticalDirection = VerticalAlignment[verAl[j]];
                    const globalStrat1 = new GlobalPositionStrategy(mockPositioningSettings1);
                    globalStrat1.position(mockItem);
                    expect(mockParent.style.justifyContent).toEqual(mockDirection[i]);
                    expect(mockParent.style.alignItems).toEqual(mockDirection[j]);
                }
            }
        });

        it('Should properly set style on position method call - ConnectedPosition.', () => {
            const left = 0;
            const top = 0;
            const width = 200;
            const height = 200;
            const right = 200;
            const bottom = 200;
            const mockElement = document.createElement('div');
            spyOn(mockElement, 'getBoundingClientRect').and.callFake(() => {
                return {
                    left, top, width, height, right, bottom
                } as DOMRect;
            });

            const mockItem = document.createElement('div');
            mockElement.append(mockItem);
            spyOn(mockItem, 'getBoundingClientRect').and.callFake(() => {
                return new DOMRect(top, left, width, height);
            });

            const mockPositioningSettings1: PositionSettings = {
                horizontalDirection: HorizontalAlignment.Right,
                verticalDirection: VerticalAlignment.Bottom,
                target: mockItem,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };
            const connectedStrat1 = new ConnectedPositioningStrategy(mockPositioningSettings1);
            connectedStrat1.position(mockItem, { width, height });
            expect(mockItem.style.top).toEqual('0px');
            expect(mockItem.style.left).toEqual('0px');

            connectedStrat1.settings.horizontalStartPoint = HorizontalAlignment.Center;
            connectedStrat1.position(mockItem, { width, height });
            expect(mockItem.style.top).toEqual('0px');
            expect(mockItem.style.left).toEqual('100px');

            connectedStrat1.settings.horizontalStartPoint = HorizontalAlignment.Right;
            connectedStrat1.position(mockItem, { width, height });
            expect(mockItem.style.top).toEqual('0px');
            expect(mockItem.style.left).toEqual('200px');

            connectedStrat1.settings.verticalStartPoint = VerticalAlignment.Middle;
            connectedStrat1.position(mockItem, { width, height });
            expect(mockItem.style.top).toEqual('100px');
            expect(mockItem.style.left).toEqual('200px');

            connectedStrat1.settings.verticalStartPoint = VerticalAlignment.Bottom;
            connectedStrat1.position(mockItem, { width, height });
            expect(mockItem.style.top).toEqual('200px');
            expect(mockItem.style.left).toEqual('200px');

            // If target is Point
            connectedStrat1.settings.target = new Point(0, 0);
            connectedStrat1.position(mockItem, { width, height });
            expect(mockItem.style.top).toEqual('0px');
            expect(mockItem.style.left).toEqual('0px');

            // If target is not point or html element, should fallback to new Point(0,0)
            connectedStrat1.settings.target = <any>'g';
            connectedStrat1.position(mockItem, { width, height });
            expect(mockItem.style.top).toEqual('0px');
            expect(mockItem.style.left).toEqual('0px');
        });

        it('Should properly call position method - AutoPosition.', () => {
            spyOn(BaseFitPositionStrategy.prototype, 'position');
            spyOn<any>(ConnectedPositioningStrategy.prototype, 'setStyle');
            const element = document.createElement('div');
            const autoStrat1 = new AutoPositionStrategy();
            autoStrat1.position(element, null, document, false);
            expect(BaseFitPositionStrategy.prototype.position).toHaveBeenCalledTimes(1);
            expect(BaseFitPositionStrategy.prototype.position).toHaveBeenCalledWith(element, null, document, false);

            const autoStrat2 = new AutoPositionStrategy();
            autoStrat2.position(element, null, document, false);
            expect(BaseFitPositionStrategy.prototype.position).toHaveBeenCalledTimes(2);

            const autoStrat3 = new AutoPositionStrategy();
            autoStrat3.position(element, null, document, false);
            expect(BaseFitPositionStrategy.prototype.position).toHaveBeenCalledTimes(3);
        });

        it('Should properly call position method - ElasticPosition.', () => {
            spyOn(BaseFitPositionStrategy.prototype, 'position');
            spyOn<any>(ConnectedPositioningStrategy.prototype, 'setStyle');
            const element = document.createElement('div');
            const autoStrat1 = new ElasticPositionStrategy();

            autoStrat1.position(element, null, document, false);
            expect(BaseFitPositionStrategy.prototype.position).toHaveBeenCalledTimes(1);
            expect(BaseFitPositionStrategy.prototype.position).toHaveBeenCalledWith(element, null, document, false);

            const autoStrat2 = new ElasticPositionStrategy();
            autoStrat2.position(element, null, document, false);
            expect(BaseFitPositionStrategy.prototype.position).toHaveBeenCalledTimes(2);

            const autoStrat3 = new ElasticPositionStrategy();
            autoStrat3.position(element, null, document, false);
            expect(BaseFitPositionStrategy.prototype.position).toHaveBeenCalledTimes(3);
        });

        it('Should properly call setOffset method', fakeAsync(() => {
            const fix = TestBed.createComponent(WidthTestOverlayComponent);
            const overlayInstance = fix.componentInstance.overlay;
            const id = fix.componentInstance.overlay.attach(SimpleRefComponent);

            overlayInstance.show(id);

            fix.detectChanges();
            tick();

            overlayInstance.setOffset(id, 40, 40);
            const overlayContent: Element = document.getElementsByClassName(CLASS_OVERLAY_CONTENT_MODAL)[0];
            const component = document.getElementsByClassName('simpleRef')[0];
            const contentRectOverlay = overlayContent.getBoundingClientRect();
            const componentRectOverlay = component.getBoundingClientRect();
            let overlayContentTransform = (<any>overlayContent).style.transform;
            const firstTransform = 'translate(40px, 40px)';
            const secondTransform = 'translate(30px, 60px)';

            expect(contentRectOverlay.top).toEqual(componentRectOverlay.top);
            expect(contentRectOverlay.left).toEqual(componentRectOverlay.left);
            expect(overlayContentTransform).toEqual(firstTransform);

            // Set the offset again and verify it is changed correctly
            overlayInstance.setOffset(id, -10, 20);
            fix.detectChanges();
            tick();
            const contentRectOverlayNew = overlayContent.getBoundingClientRect();
            const componentRectOverlayNew = component.getBoundingClientRect();
            overlayContentTransform = (<any>overlayContent).style.transform;

            expect(contentRectOverlayNew.top).toEqual(componentRectOverlayNew.top);
            expect(contentRectOverlayNew.left).toEqual(componentRectOverlayNew.left);

            expect(contentRectOverlayNew.top).not.toEqual(contentRectOverlay.top);
            expect(contentRectOverlayNew.left).not.toEqual(contentRectOverlay.left);

            expect(componentRectOverlayNew.top).not.toEqual(componentRectOverlay.top);
            expect(componentRectOverlayNew.left).not.toEqual(componentRectOverlay.left);
            expect(overlayContentTransform).toEqual(secondTransform);
        }));

        it('#1690 - click on second filter does not close first one.', fakeAsync(() => {
            const fixture = TestBed.createComponent(TwoButtonsComponent);
            const button1 = fixture.nativeElement.getElementsByClassName('buttonOne')[0];
            const button2 = fixture.nativeElement.getElementsByClassName('buttonTwo')[0];

            button1.click();
            tick();

            const overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            const wrapper = overlayDiv.children[0];
            expect(wrapper.classList).toContain(CLASS_OVERLAY_WRAPPER);

            button2.click();
            tick();
            expect(overlayDiv.children.length).toBe(1);
        }));

        it('#1692 - scroll strategy closes overlay when shown component is scrolled.', fakeAsync(() => {
            const fixture = TestBed.createComponent(SimpleDynamicWithDirectiveComponent);
            const overlaySettings: OverlaySettings = { scrollStrategy: new CloseScrollStrategy() };
            fixture.componentInstance.show(overlaySettings);
            tick();

            let overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeDefined();

            const scrollableDiv = document.getElementsByClassName('scrollableDiv')[0];
            scrollableDiv.scrollTop += 5;
            scrollableDiv.dispatchEvent(new Event('scroll'));
            tick();

            overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeDefined();

            scrollableDiv.scrollTop += 100;
            scrollableDiv.dispatchEvent(new Event('scroll'));
            tick();

            overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeDefined();
            fixture.componentInstance.hide();
        }));

        // TODO: refactor utilities to include all exported methods in a class
        it('#1799 - content div should reposition on window resize.', fakeAsync(() => {
            const rect: ClientRect = {
                bottom: 50,
                height: 0,
                left: 50,
                right: 50,
                top: 50,
                width: 0
            };
            const getPointSpy = spyOn(Util, 'getTargetRect').and.returnValue(rect);
            const fix = TestBed.createComponent(FlexContainerComponent);
            fix.detectChanges();
            const overlayInstance = fix.componentInstance.overlay;
            const buttonElement: HTMLElement = fix.componentInstance.buttonElement.nativeElement;

            const id = overlayInstance.attach(
                SimpleDynamicComponent,
                { positionStrategy: new ConnectedPositioningStrategy({ target: buttonElement }) });
            overlayInstance.show(id);
            tick();

            let contentRect = document.getElementsByClassName(CLASS_OVERLAY_CONTENT_MODAL)[0].getBoundingClientRect();

            expect(50).toEqual(contentRect.left);
            expect(50).toEqual(contentRect.top);

            rect.left = 200;
            rect.right = 200;
            rect.top = 200;
            rect.bottom = 200;
            getPointSpy.and.callThrough().and.returnValue(rect);
            window.resizeBy(200, 200);
            window.dispatchEvent(new Event('resize'));
            tick();

            contentRect = document.getElementsByClassName(CLASS_OVERLAY_CONTENT_MODAL)[0].getBoundingClientRect();
            expect(200).toEqual(contentRect.left);
            expect(200).toEqual(contentRect.top);

            overlayInstance.hide(id);
        }));

        it('#2475 - An error is thrown for IgxOverlay when showing a component' +
            'instance that is not attached to the DOM', fakeAsync(() => {
                const fix = TestBed.createComponent(SimpleRefComponent);
                fix.detectChanges();
                fix.elementRef.nativeElement.parentElement.removeChild(fix.elementRef.nativeElement);
                fix.componentInstance.overlay.show(fix.elementRef);

                tick();
                const overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
                expect(overlayDiv).toBeDefined();
                expect(overlayDiv.children.length).toEqual(1);
                const wrapperDiv = overlayDiv.children[0];
                expect(wrapperDiv).toBeDefined();
                expect(wrapperDiv.classList.contains(CLASS_OVERLAY_WRAPPER_MODAL)).toBeTruthy();
                expect(wrapperDiv.children[0].localName).toEqual('div');

                const contentDiv = wrapperDiv.children[0];
                expect(contentDiv).toBeDefined();
                expect(contentDiv.classList.contains(CLASS_OVERLAY_CONTENT_MODAL)).toBeTruthy();
            }));

        it('#2486 - filtering dropdown is not correctly positioned', fakeAsync(() => {
            const fix = TestBed.createComponent(WidthTestOverlayComponent);
            fix.debugElement.nativeElement.style.transform = 'translatex(100px)';

            fix.detectChanges();
            tick();

            fix.componentInstance.overlaySettings.outlet = fix.componentInstance.elementRef;

            const buttonElement: HTMLElement = fix.componentInstance.buttonElement.nativeElement;
            buttonElement.click();

            fix.detectChanges();
            tick();

            const wrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            expect(wrapper.getBoundingClientRect().left).toBe(100);
            expect(fix.componentInstance.customComponent.nativeElement.getBoundingClientRect().left).toBe(400);
        }));

        it('#2798 - Allow canceling of open and close of IgxDropDown through onOpening and onClosing events', fakeAsync(() => {
            const fix = TestBed.createComponent(SimpleRefComponent);
            fix.detectChanges();
            const overlayInstance = fix.componentInstance.overlay;

            overlayInstance.onClosing.subscribe((e: OverlayCancelableEventArgs) => {
                e.cancel = true;
            });

            spyOn(overlayInstance.onClosed, 'emit').and.callThrough();
            spyOn(overlayInstance.onClosing, 'emit').and.callThrough();
            spyOn(overlayInstance.onOpened, 'emit').and.callThrough();
            spyOn(overlayInstance.onOpening, 'emit').and.callThrough();

            const firstCallId = overlayInstance.show(SimpleDynamicComponent);
            tick();

            expect(overlayInstance.onOpening.emit).toHaveBeenCalledTimes(1);
            expect(overlayInstance.onOpened.emit).toHaveBeenCalledTimes(1);

            overlayInstance.hide(firstCallId);
            tick();

            expect(overlayInstance.onClosing.emit).toHaveBeenCalledTimes(1);
            expect(overlayInstance.onClosed.emit).toHaveBeenCalledTimes(0);

            overlayInstance.onOpening.subscribe((e: OverlayCancelableEventArgs) => {
                e.cancel = true;
            });

            overlayInstance.show(fix.componentInstance.item);
            tick();

            expect(overlayInstance.onOpening.emit).toHaveBeenCalledTimes(2);
            expect(overlayInstance.onOpened.emit).toHaveBeenCalledTimes(1);
        }));

        it('#3673 - Should not close dropdown in dropdown', fakeAsync(() => {
            const fix = TestBed.createComponent(EmptyPageComponent);
            const button = fix.componentInstance.buttonElement;
            const overlay = fix.componentInstance.overlay;
            fix.detectChanges();

            const overlaySettings: OverlaySettings = {
                positionStrategy: new ConnectedPositioningStrategy(),
                modal: false,
                closeOnOutsideClick: true
            };

            overlaySettings.positionStrategy.settings.target = button.nativeElement;

            overlay.show(SimpleDynamicComponent, overlaySettings);
            overlaySettings.positionStrategy.settings.horizontalStartPoint = HorizontalAlignment.Right;
            overlay.show(SimpleDynamicComponent, overlaySettings);
            fix.detectChanges();
            tick();

            let overlayDiv: Element = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeDefined();
            expect(overlayDiv.children.length).toEqual(2);
            expect(overlayDiv.children[0].localName).toEqual('div');
            expect(overlayDiv.children[1].localName).toEqual('div');

            (<any>overlay)._overlayInfos[0].elementRef.nativeElement.click();
            fix.detectChanges();
            tick();

            overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(overlayDiv).toBeDefined();
            expect(overlayDiv.children.length).toEqual(1);
            expect(overlayDiv.children[0].localName).toEqual('div');
        }));

        it('#3743 - Reposition correctly resized element.', () => {
            const fixture = TestBed.createComponent(TopLeftOffsetComponent);
            fixture.detectChanges();

            const compElement = document.createElement('div');
            compElement.setAttribute('style', 'width:100px; height:100px; color:green; border: 1px solid blue;');
            const contentElement = document.createElement('div');
            contentElement.classList.add('contentWrapper');
            contentElement.classList.add('no-height');
            contentElement.setAttribute('style', 'width:100px; position: absolute;');
            contentElement.appendChild(compElement);
            const wrapperElement = document.createElement('div');
            wrapperElement.setAttribute('style', 'position: fixed; width: 100%; height: 100%; top: 0; left: 0;');
            wrapperElement.appendChild(contentElement);
            document.body.appendChild(wrapperElement);

            const targetEl: HTMLElement = <HTMLElement>document.getElementsByClassName('300_button')[0];

            fixture.detectChanges();
            const positionSettings: PositionSettings = {
                target: targetEl,
                horizontalDirection: HorizontalAlignment.Left,
                verticalDirection: VerticalAlignment.Top,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };
            const strategy = new ConnectedPositioningStrategy(positionSettings);
            strategy.position(contentElement, null);
            fixture.detectChanges();

            const targetRect = targetEl.getBoundingClientRect();
            let contentElementRect = contentElement.getBoundingClientRect();
            expect(targetRect.top).toBe(contentElementRect.bottom);
            expect(targetRect.left).toBe(contentElementRect.right);

            compElement.setAttribute('style', 'width:100px; height:50px; color:green; border: 1px solid blue;');
            strategy.position(contentElement, null);
            fixture.detectChanges();
            contentElementRect = contentElement.getBoundingClientRect();
            expect(targetRect.top).toBe(contentElementRect.bottom);
            expect(targetRect.left).toBe(contentElementRect.right);

            compElement.setAttribute('style', 'width:100px; height:500px; color:green; border: 1px solid blue;');
            strategy.position(contentElement, null);
            fixture.detectChanges();
            contentElementRect = contentElement.getBoundingClientRect();
            expect(targetRect.top).toBe(contentElementRect.bottom);
            expect(targetRect.left).toBe(contentElementRect.right);

            document.body.removeChild(wrapperElement);
        });

        it('#3988 - Should use ngModuleRef to create component', inject([ApplicationRef], (appRef: ApplicationRef) => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            const overlay = fixture.componentInstance.overlay;
            fixture.detectChanges();

            spyOn(appRef, 'attachView');
            const mockComponent = {
                hostView: 'test',
                location: { nativeElement: 'element' }
            };
            const factoryMock = jasmine.createSpyObj('factoryMock', {
                create: mockComponent
            });
            const injector = 'testInjector';
            const componentFactoryResolver = jasmine.createSpyObj('componentFactoryResolver', {
                resolveComponentFactory: factoryMock
            });

            const id = overlay.attach(SimpleDynamicComponent, {}, { componentFactoryResolver, injector } as any);
            expect(componentFactoryResolver.resolveComponentFactory).toHaveBeenCalledWith(SimpleDynamicComponent);
            expect(factoryMock.create).toHaveBeenCalledWith(injector);
            expect(appRef.attachView).toHaveBeenCalledWith('test');
            expect(overlay.getOverlayById(id).componentRef as any).toBe(mockComponent);
        }));

        it('##6474 - should calculate correctly position', () => {
            const elastic: ElasticPositionStrategy = new ElasticPositionStrategy();
            const targetRect: ClientRect = {
                top: 100,
                bottom: 200,
                height: 100,
                left: 100,
                right: 200,
                width: 100
            };
            const elementRect: ClientRect = {
                top: 0,
                bottom: 300,
                height: 300,
                left: 0,
                right: 300,
                width: 300
            };
            const viewPortRect: ClientRect = {
                top: 1000,
                bottom: 1300,
                height: 300,
                left: 1000,
                right: 1300,
                width: 300
            };
            spyOn<any>(elastic, 'setStyle').and.returnValue({});
            spyOn(Util, 'getViewportRect').and.returnValue(viewPortRect);
            spyOn(Util, 'getTargetRect').and.returnValue(targetRect);

            const element = jasmine.createSpyObj('HTMLElement', ['getBoundingClientRect'] );
            spyOn(element, 'getBoundingClientRect').and.returnValue(elementRect);
            element.classList = { add: () => {} };
            element.style = { width: '', height: ''};
            elastic.position(element, null, null, true);

            expect(element.style.width).toBe('200px');
            expect(element.style.height).toBe('100px');
        });
    });

    describe('Unit Tests - Scroll Strategies: ', () => {
        beforeEach(async(() => {
            TestBed.configureTestingModule({
                imports: [IgxToggleModule, DynamicModule, NoopAnimationsModule],
                declarations: DIRECTIVE_COMPONENTS
            });
        }));
        afterAll(() => {
            TestBed.resetTestingModule();
        });
        it('Should properly initialize Scroll Strategy - Block.', fakeAsync(async () => {
            TestBed.overrideComponent(EmptyPageComponent, {
                set: {
                    styles: [`button {
                position: absolute,
                bottom: 200%;
            }`]
                }
            });
            await TestBed.compileComponents();
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            const scrollStrat = new BlockScrollStrategy();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: scrollStrat,
                modal: false,
                closeOnOutsideClick: false
            };
            const overlay = fixture.componentInstance.overlay;
            spyOn(scrollStrat, 'initialize').and.callThrough();
            spyOn(scrollStrat, 'attach').and.callThrough();
            spyOn(scrollStrat, 'detach').and.callThrough();
            const scrollSpy = spyOn<any>(scrollStrat, 'onScroll').and.callThrough();
            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();

            expect(scrollStrat.attach).toHaveBeenCalledTimes(1);
            expect(scrollStrat.initialize).toHaveBeenCalledTimes(1);
            expect(scrollStrat.detach).toHaveBeenCalledTimes(0);
            document.dispatchEvent(new Event('scroll'));
            expect(scrollSpy).toHaveBeenCalledTimes(1);

            overlay.hide('0');
            tick();
            expect(scrollStrat.detach).toHaveBeenCalledTimes(1);
        }));

        it('Should properly initialize Scroll Strategy - Absolute.', fakeAsync(async () => {
            TestBed.overrideComponent(EmptyPageComponent, {
                set: {
                    styles: [`button {
                position: absolute,
                bottom: 200%;
            }`]
                }
            });
            await TestBed.compileComponents();
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            const scrollStrat = new AbsoluteScrollStrategy();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: scrollStrat,
                modal: false,
                closeOnOutsideClick: false
            };
            const overlay = fixture.componentInstance.overlay;
            spyOn(scrollStrat, 'initialize').and.callThrough();
            spyOn(scrollStrat, 'attach').and.callThrough();
            spyOn(scrollStrat, 'detach').and.callThrough();
            const scrollSpy = spyOn<any>(scrollStrat, 'onScroll').and.callThrough();
            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();

            expect(scrollStrat.attach).toHaveBeenCalledTimes(1);
            expect(scrollStrat.initialize).toHaveBeenCalledTimes(1);
            expect(scrollStrat.detach).toHaveBeenCalledTimes(0);
            document.dispatchEvent(new Event('scroll'));
            expect(scrollSpy).toHaveBeenCalledTimes(1);
            overlay.hide('0');
            tick();
            expect(scrollStrat.detach).toHaveBeenCalledTimes(1);
        }));

        it('Should only call reposition once on scroll - Absolute.', fakeAsync(async () => {
            TestBed.overrideComponent(EmptyPageComponent, {
                set: {
                    styles: [`button {
                position: absolute,
                bottom: 200%;
            }`]
                }
            });
            await TestBed.compileComponents();
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            const scrollStrat = new AbsoluteScrollStrategy();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: scrollStrat,
                modal: false,
                closeOnOutsideClick: false
            };
            const overlay = fixture.componentInstance.overlay;
            const scrollSpy = spyOn<any>(scrollStrat, 'onScroll').and.callThrough();
            spyOn(overlay, 'reposition');
            const id = overlay.attach(SimpleDynamicComponent, overlaySettings);
            overlay.show(id, overlaySettings);
            tick();

            const content = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
            content.children[0].dispatchEvent(new Event('scroll'));
            expect(scrollSpy).toHaveBeenCalledTimes(1);
            expect(overlay.reposition).not.toHaveBeenCalled();

            document.dispatchEvent(new Event('scroll'));
            expect(scrollSpy).toHaveBeenCalledTimes(2);
            expect(overlay.reposition).toHaveBeenCalledTimes(1);
            expect(overlay.reposition).toHaveBeenCalledWith(id);

            overlay.hide(id);
        }));

        it('Should properly initialize Scroll Strategy - Close.', fakeAsync(async () => {
            TestBed.overrideComponent(EmptyPageComponent, {
                set: {
                    styles: [`button {
                position: absolute,
                bottom: 200%;
            }`]
                }
            });
            await TestBed.compileComponents();
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            const scrollStrat = new CloseScrollStrategy();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: scrollStrat,
                modal: false,
                closeOnOutsideClick: false
            };
            const overlay = fixture.componentInstance.overlay;
            spyOn(scrollStrat, 'initialize').and.callThrough();
            spyOn(scrollStrat, 'attach').and.callThrough();
            spyOn(scrollStrat, 'detach').and.callThrough();
            const scrollSpy = spyOn<any>(scrollStrat, 'onScroll').and.callThrough();
            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();

            expect(scrollStrat.attach).toHaveBeenCalledTimes(1);
            expect(scrollStrat.initialize).toHaveBeenCalledTimes(1);
            expect(scrollStrat.detach).toHaveBeenCalledTimes(0);
            document.dispatchEvent(new Event('scroll'));

            expect(scrollSpy).toHaveBeenCalledTimes(1);
            overlay.hide('0');
            tick();
            expect(scrollStrat.detach).toHaveBeenCalledTimes(1);
        }));
    });

    describe('Integration tests: ', () => {
        configureTestSuite();
        beforeEach(async(() => {
            TestBed.configureTestingModule({
                imports: [IgxToggleModule, DynamicModule, NoopAnimationsModule],
                declarations: DIRECTIVE_COMPONENTS
            }).compileComponents();
        }));

        // 1. Positioning Strategies
        // 1.1 Global (show components in the window center - default).
        it('Should correctly render igx-overlay', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            const positionSettings: PositionSettings = {
                horizontalDirection: HorizontalAlignment.Right,
                verticalDirection: VerticalAlignment.Bottom,
                target: fixture.componentInstance.buttonElement.nativeElement,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };
            overlaySettings.positionStrategy = new GlobalPositionStrategy(positionSettings);
            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            fixture.detectChanges();
            const overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            const wrapper = overlayDiv.children[0];
            expect(wrapper.classList).toContain(CLASS_OVERLAY_WRAPPER);
        }));

        it('Should cover the whole window 100% width and height.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            fixture.componentInstance.buttonElement.nativeElement.click();
            tick();

            fixture.detectChanges();
            const overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            const overlayWrapper = overlayDiv.children[0];
            const overlayRect = overlayWrapper.getBoundingClientRect();
            expect(overlayRect.width).toEqual(window.innerWidth);
            expect(overlayRect.height).toEqual(window.innerHeight);
            expect(overlayRect.left).toEqual(0);
            expect(overlayRect.top).toEqual(0);
        }));

        it('Should show the component inside the igx-overlay wrapper as a content last child.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            const overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            const overlayWrapper = overlayDiv.children[0];
            const content = overlayWrapper.firstChild;
            const componentEl = content.lastChild.lastChild; // wrapped in 'NG-COMPONENT'

            expect(overlayWrapper.nodeName).toEqual('DIV');
            expect(overlayWrapper.firstChild.nodeName).toEqual('DIV');
            expect(componentEl.nodeName).toEqual('DIV');
        }));

        it('Should apply the corresponding inline css to the overlay wrapper div element for each alignment.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            const positionSettings: PositionSettings = {
                target: new Point(0, 0),
                horizontalDirection: HorizontalAlignment.Left,
                verticalDirection: VerticalAlignment.Top,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };

            const horAl = Object.keys(HorizontalAlignment).filter(key => !isNaN(Number(HorizontalAlignment[key])));
            const verAl = Object.keys(VerticalAlignment).filter(key => !isNaN(Number(VerticalAlignment[key])));
            const cssStyles: Array<string> = ['flex-start', 'center', 'flex-end'];

            for (let i = 0; i < horAl.length; i++) {
                positionSettings.horizontalDirection = HorizontalAlignment[horAl[i]];
                for (let j = 0; j < verAl.length; j++) {
                    positionSettings.verticalDirection = VerticalAlignment[verAl[j]];
                    overlaySettings.positionStrategy = new GlobalPositionStrategy(positionSettings);
                    fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                    tick();

                    const overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
                    const overlayWrapper = overlayDiv.children[i * 3 + j] as HTMLDivElement;
                    expect(overlayWrapper.style.justifyContent).toBe(cssStyles[i]);
                    expect(overlayWrapper.style.alignItems).toBe(cssStyles[j]);
                }
            }
        }));

        it('Should center the shown component in the igx-overlay (visible window) - default.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            fixture.componentInstance.overlay.show(SimpleDynamicComponent);
            tick();
            const overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            const overlayWrapper = overlayDiv.children[0] as HTMLElement;
            const componentEl = overlayWrapper.children[0].children[0];
            const componentRect = componentEl.getBoundingClientRect();
            expect((window.innerWidth - componentRect.width) / 2).toEqual(componentRect.left);
            expect((window.innerHeight - componentRect.height) / 2).toEqual(componentRect.top);
        }));

        it('Should display a new instance of the same component/options exactly on top of the previous one.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            fixture.componentInstance.overlay.show(SimpleDynamicComponent);
            fixture.componentInstance.overlay.show(SimpleDynamicComponent);
            tick();
            const overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            const overlayWrapper_1 = overlayDiv.children[0];
            const componentEl_1 = overlayWrapper_1.children[0].children[0];
            const overlayWrapper_2 = overlayDiv.children[1];
            const componentEl_2 = overlayWrapper_2.children[0].children[0];
            const componentRect_1 = componentEl_1.getBoundingClientRect();
            const componentRect_2 = componentEl_2.getBoundingClientRect();
            expect(componentRect_1.left).toEqual(componentRect_2.left);
            expect(componentRect_1.top).toEqual(componentRect_2.top);
            expect(componentRect_1.width).toEqual(componentRect_2.width);
            expect(componentRect_1.height).toEqual(componentRect_2.height);
        }));

        it('Should show a component bigger than the visible window as centered.', fakeAsync(() => {

            // overlay div is forced to has width and height equal to 0. This will prevent body
            // to show any scrollbars whatever the size of the component is.
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            fixture.componentInstance.overlay.show(SimpleBigSizeComponent);
            tick();
            const overlayDiv = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            const overlayWrapper = overlayDiv.children[0];
            const componentEl = overlayWrapper.children[0].children[0].lastElementChild; // Wrapped in 'NG-COMPONENT'
            const componentRect = componentEl.getBoundingClientRect();

            expect(componentRect.left).toBe((overlayWrapper.clientWidth - componentRect.width) / 2);
            expect(componentRect.top).toBe((overlayWrapper.clientHeight - componentRect.height) / 2);
        }));

        // 1.1.1 Global Css
        it('Should apply the css class on igx-overlay component div wrapper.' +
            'Test defaults: When no positionStrategy is passed use GlobalPositionStrategy with default PositionSettings and css class.',
            fakeAsync(() => {
                const fixture = TestBed.createComponent(EmptyPageComponent);
                fixture.detectChanges();
                fixture.componentInstance.overlay.show(SimpleDynamicComponent);
                tick();
                fixture.detectChanges();

                // overlay container IS NOT a child of the debugElement (attached to body, not app-root)
                const overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER_MODAL)[0];
                expect(overlayWrapper).toBeTruthy();
                expect(overlayWrapper.localName).toEqual('div');
            })
        );

        it('Should apply css class on igx-overlay component inner div wrapper.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            fixture.detectChanges();
            const content = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
            expect(content).toBeTruthy();
            expect(content.localName).toEqual('div');
        }));

        // 1.2 ConnectedPositioningStrategy(show components based on a specified position base point, horizontal and vertical alignment)
        it('Should correctly render igx-overlay', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new ConnectedPositioningStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            const positionSettings: PositionSettings = {
                horizontalDirection: HorizontalAlignment.Right,
                verticalDirection: VerticalAlignment.Bottom,
                target: fixture.componentInstance.buttonElement.nativeElement,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };
            overlaySettings.positionStrategy = new ConnectedPositioningStrategy(positionSettings);
            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            const wrapper = document.getElementsByClassName(CLASS_OVERLAY_MAIN)[0];
            expect(wrapper).toBeDefined();
            expect(wrapper.classList).toContain(CLASS_OVERLAY_MAIN);
        }));

        it('Should cover the whole window 100% width and height.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            const positionSettings: PositionSettings = {
                horizontalDirection: HorizontalAlignment.Right,
                verticalDirection: VerticalAlignment.Bottom,
                target: fixture.componentInstance.buttonElement.nativeElement,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };
            overlaySettings.positionStrategy = new ConnectedPositioningStrategy(positionSettings);
            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            const wrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            expect(wrapper.clientHeight).toEqual(window.innerHeight);
            expect(wrapper.clientWidth).toEqual(window.innerWidth);
        }));

        it('It should position the shown component inside the igx-overlay wrapper as a content last child.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            overlaySettings.positionStrategy = new ConnectedPositioningStrategy();

            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            const overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            const content = overlayWrapper.firstChild;
            const componentEl = content.lastChild.lastChild; // wrapped in 'NG-COMPONENT'
            expect(overlayWrapper.nodeName).toEqual('DIV');
            expect(overlayWrapper.firstChild.nodeName).toEqual('DIV');
            expect(componentEl.nodeName).toEqual('DIV');
        }));

        it(`Should use StartPoint:Left/Bottom, Direction Right/Bottom and openAnimation: scaleInVerTop, closeAnimation: scaleOutVerTop
            as default options when using a ConnectedPositioningStrategy without passing other but target element options.`, () => {
                const targetEl: HTMLElement = <HTMLElement>document.getElementsByClassName('300_button')[0];
                const positionSettings2 = {
                    target: targetEl
                };

                const strategy = new ConnectedPositioningStrategy(positionSettings2);

                const expectedDefaults = {
                    target: targetEl,
                    horizontalDirection: HorizontalAlignment.Right,
                    verticalDirection: VerticalAlignment.Bottom,
                    horizontalStartPoint: HorizontalAlignment.Left,
                    verticalStartPoint: VerticalAlignment.Bottom,
                    openAnimation: scaleInVerTop,
                    closeAnimation: scaleOutVerTop,
                    minSize: { width: 0, height: 0 }
                };

                expect(strategy.settings).toEqual(expectedDefaults);
            });

        it(`Should use target: null StartPoint:Left/Bottom, Direction Right/Bottom and openAnimation: scaleInVerTop,
            closeAnimation: scaleOutVerTop as default options when using a ConnectedPositioningStrategy without passing options.`, () => {
                const strategy = new ConnectedPositioningStrategy();

                const expectedDefaults = {
                    target: null,
                    horizontalDirection: HorizontalAlignment.Right,
                    verticalDirection: VerticalAlignment.Bottom,
                    horizontalStartPoint: HorizontalAlignment.Left,
                    verticalStartPoint: VerticalAlignment.Bottom,
                    openAnimation: scaleInVerTop,
                    closeAnimation: scaleOutVerTop,
                    minSize: { width: 0, height: 0 }
                };

                expect(strategy.settings).toEqual(expectedDefaults);
            });

        // adding more than one component to show in igx-overlay:
        it('Should render the component exactly on top of the previous one when adding a new instance with default settings.', () => {
            const fixture = TestBed.createComponent(TopLeftOffsetComponent);
            const overlaySettings: OverlaySettings = {
                positionStrategy: new ConnectedPositioningStrategy()
            };
            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            fixture.detectChanges();

            const overlayWrapper_1 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER_MODAL)[0];
            const componentEl_1 = overlayWrapper_1.children[0].children[0];
            const overlayWrapper_2 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER_MODAL)[1];
            const componentEl_2 = overlayWrapper_2.children[0].children[0];
            const componentRect_1 = componentEl_1.getBoundingClientRect();
            const componentRect_2 = componentEl_2.getBoundingClientRect();
            expect(componentRect_1.left).toEqual(0);
            expect(componentRect_1.left).toEqual(componentRect_2.left);
            expect(componentRect_1.top).toEqual(0);
            expect(componentRect_1.top).toEqual(componentRect_2.top);
            expect(componentRect_1.width).toEqual(componentRect_2.width);
            expect(componentRect_1.height).toEqual(componentRect_2.height);
        });

        it('Should render the component exactly on top of the previous one when adding a new instance with the same options.', () => {
            const fixture = TestBed.createComponent(TopLeftOffsetComponent);
            const x = 200;
            const y = 300;
            const positionSettings: PositionSettings = {
                target: new Point(x, y),
                horizontalDirection: HorizontalAlignment.Left,
                verticalDirection: VerticalAlignment.Top,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Bottom,
            };
            const overlaySettings: OverlaySettings = {
                positionStrategy: new ConnectedPositioningStrategy(positionSettings)
            };
            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            fixture.detectChanges();

            const overlayWrapper_1 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER_MODAL)[0];
            const componentEl_1 = overlayWrapper_1.children[0].children[0];
            const overlayWrapper_2 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER_MODAL)[1];
            const componentEl_2 = overlayWrapper_2.children[0].children[0];
            const componentRect_1 = componentEl_1.getBoundingClientRect();
            const componentRect_2 = componentEl_2.getBoundingClientRect();
            expect(componentRect_1.left).toEqual(x - componentRect_1.width);
            expect(componentRect_1.left).toEqual(componentRect_2.left);
            expect(componentRect_1.top).toEqual(y - componentRect_1.height);
            expect(componentRect_1.top).toEqual(componentRect_2.top);
            expect(componentRect_1.width).toEqual(componentRect_2.width);
            expect(componentRect_1.height).toEqual(componentRect_2.height);
        });

        it(`Should change the state of the component to closed when reaching threshold and closing scroll strategy is used.`,
            fakeAsync(() => {
                const fixture = TestBed.createComponent(EmptyPageComponent);

                //  add one div far away to the right and to the bottom in order scrollbars to appear on page
                addScrollDivToElement(fixture.nativeElement);

                const scrollStrat = new CloseScrollStrategy();
                fixture.detectChanges();
                const overlaySettings: OverlaySettings = {
                    positionStrategy: new GlobalPositionStrategy(),
                    scrollStrategy: scrollStrat,
                    modal: false,
                    closeOnOutsideClick: false
                };
                const overlay = fixture.componentInstance.overlay;
                overlay.show(SimpleDynamicComponent, overlaySettings);
                tick();

                expect(document.documentElement.scrollTop).toEqual(0);
                document.documentElement.scrollTop += 9;
                document.dispatchEvent(new Event('scroll'));
                tick();
                expect(document.documentElement.scrollTop).toEqual(9);
                expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(1);
                document.documentElement.scrollTop += 25;
                document.dispatchEvent(new Event('scroll'));
                tick();
                expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(0);
            }));

        it('Should scroll component with the scrolling container when absolute scroll strategy is used.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);

            //  add one div far away to the right and to the bottom in order scrollbars to appear on page
            addScrollDivToElement(fixture.nativeElement);
            const scrollStrat = new AbsoluteScrollStrategy();
            fixture.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new ConnectedPositioningStrategy(),
                scrollStrategy: scrollStrat,
                modal: false,
                closeOnOutsideClick: false
            };
            const buttonElement = fixture.componentInstance.buttonElement.nativeElement;
            const overlay = fixture.componentInstance.overlay;
            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            expect(document.documentElement.scrollTop).toEqual(0);
            let overlayElement = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0] as HTMLElement;
            let overlayChildPosition: DOMRect = overlayElement.lastElementChild.getBoundingClientRect() as DOMRect;
            expect(overlayChildPosition.y).toEqual(0);
            expect(buttonElement.getBoundingClientRect().y).toEqual(0);
            document.dispatchEvent(new Event('scroll'));
            tick();
            expect(document.documentElement.scrollTop).toEqual(0);

            document.documentElement.scrollTop += 25;
            document.dispatchEvent(new Event('scroll'));
            tick();
            expect(document.documentElement.scrollTop).toEqual(25);
            overlayElement = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0] as HTMLElement;
            overlayChildPosition = overlayElement.lastElementChild.getBoundingClientRect() as DOMRect;
            expect(overlayChildPosition.y).toEqual(0);
            expect(buttonElement.getBoundingClientRect().y).toEqual(-25);

            document.documentElement.scrollTop += 500;
            document.dispatchEvent(new Event('scroll'));
            tick();
            overlayElement = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0] as HTMLElement;
            overlayChildPosition = overlayElement.lastElementChild.getBoundingClientRect() as DOMRect;
            expect(overlayChildPosition.y).toEqual(0);
            expect(buttonElement.getBoundingClientRect().y).toEqual(-525);
            expect(document.documentElement.scrollTop).toEqual(525);
            expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(1);
            scrollStrat.detach();
            document.documentElement.scrollTop = 0;
        }));

        // 1.2.1 Connected Css
        it('Should apply css class on igx-overlay component div wrapper.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new ConnectedPositioningStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };

            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();

            // overlay container IS NOT a child of the debugElement (attached to body, not app-root)
            const overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
            expect(overlayWrapper).toBeTruthy();
            expect(overlayWrapper.localName).toEqual('div');
        }));

        // 1.2.2 Connected strategy position method
        it('Should position component based on Point only when connected position strategy is used.', () => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            // for a Point(300,300);
            const expectedTopForPoint: number[] = [240, 270, 300];  // top/middle/bottom/
            const expectedLeftForPoint: number[] = [240, 270, 300]; // left/center/right/

            const size = { width: 60, height: 60 };
            const compElement = document.createElement('div');
            compElement.setAttribute('style', 'width:60px; height:60px; color:green;');
            const contentElement = document.createElement('div');
            contentElement.setAttribute('style', 'position: absolute; color:gray;');
            contentElement.classList.add('contentWrapper');
            contentElement.appendChild(compElement);
            const wrapperElement = document.createElement('div');
            wrapperElement.setAttribute('style', 'position: fixed; width: 100%; height: 100%; top: 0; left: 0');
            wrapperElement.appendChild(contentElement);
            document.body.appendChild(wrapperElement);

            const horAl = Object.keys(HorizontalAlignment).filter(key => !isNaN(Number(HorizontalAlignment[key])));
            const verAl = Object.keys(VerticalAlignment).filter(key => !isNaN(Number(VerticalAlignment[key])));

            fixture.detectChanges();
            for (let horizontalDirection = 0; horizontalDirection < horAl.length; horizontalDirection++) {
                for (let verticalDirection = 0; verticalDirection < verAl.length; verticalDirection++) {

                    // start Point is static Top/Left at 300/300
                    const positionSettings2 = {
                        target: new Point(300, 300),
                        horizontalDirection: HorizontalAlignment[horAl[horizontalDirection]],
                        verticalDirection: VerticalAlignment[verAl[verticalDirection]],
                        element: null,
                        horizontalStartPoint: HorizontalAlignment.Left,
                        verticalStartPoint: VerticalAlignment.Top
                    };

                    const strategy = new ConnectedPositioningStrategy(positionSettings2);
                    strategy.position(contentElement, size);
                    fixture.detectChanges();

                    const left = expectedLeftForPoint[horizontalDirection];
                    const top = expectedTopForPoint[verticalDirection];
                    const contentElementRect = contentElement.getBoundingClientRect();
                    expect(contentElementRect.left).toBe(left);
                    expect(contentElementRect.top).toBe(top);
                }
            }
            document.body.removeChild(wrapperElement);
        });

        it('Should position component based on element and start point when connected position strategy is used.', () => {
            const fixture = TestBed.createComponent(TopLeftOffsetComponent);
            fixture.detectChanges();

            // for a Point(300,300);
            const expectedTopForPoint: Array<number> = [240, 270, 300];  // top/middle/bottom/
            const expectedLeftForPoint: Array<number> = [240, 270, 300]; // left/center/right/

            const size = { width: 60, height: 60 };
            const compElement = document.createElement('div');
            compElement.setAttribute('style', 'width:60px; height:60px; color:green;');
            const contentElement = document.createElement('div');
            contentElement.setAttribute('style', 'color:gray; position: absolute;');
            contentElement.classList.add('contentWrapper');
            contentElement.appendChild(compElement);
            const wrapperElement = document.createElement('div');
            wrapperElement.setAttribute('style', 'position: fixed; width: 100%; height: 100%; top: 0; left: 0');
            wrapperElement.appendChild(contentElement);
            document.body.appendChild(wrapperElement);

            const horAl = Object.keys(HorizontalAlignment).filter(key => !isNaN(Number(HorizontalAlignment[key])));
            const verAl = Object.keys(VerticalAlignment).filter(key => !isNaN(Number(VerticalAlignment[key])));
            const targetEl: HTMLElement = <HTMLElement>document.getElementsByClassName('300_button')[0];

            fixture.detectChanges();

            // loop trough and test all possible combinations (count 81) for StartPoint and Direction.
            for (let horizontalStartPoint = 0; horizontalStartPoint < horAl.length; horizontalStartPoint++) {
                for (let verticalStartPoint = 0; verticalStartPoint < verAl.length; verticalStartPoint++) {
                    for (let horizontalDirection = 0; horizontalDirection < horAl.length; horizontalDirection++) {
                        for (let verticalDirection = 0; verticalDirection < verAl.length; verticalDirection++) {
                            // TODO: add additional check for different start points
                            // start Point is static Top/Left at 300/300
                            const positionSettings = {
                                target: targetEl,
                                horizontalDirection: HorizontalAlignment[horAl[horizontalDirection]],
                                verticalDirection: VerticalAlignment[verAl[verticalDirection]],
                                element: null,
                                horizontalStartPoint: HorizontalAlignment[horAl[horizontalStartPoint]],
                                verticalStartPoint: VerticalAlignment[verAl[verticalStartPoint]],
                            };
                            const strategy = new ConnectedPositioningStrategy(positionSettings);
                            strategy.position(contentElement, size);
                            fixture.detectChanges();
                            const left = expectedLeftForPoint[horizontalDirection] + 50 * horizontalStartPoint;
                            const top = expectedTopForPoint[verticalDirection] + 30 * verticalStartPoint;
                            const contentElementRect = contentElement.getBoundingClientRect();
                            expect(contentElementRect.left).toBe(left);
                            expect(contentElementRect.top).toBe(top);
                        }
                    }
                }
            }
            document.body.removeChild(wrapperElement);
        });

        // 1.3 AutoPosition (fit the shown component into the visible window.)
        it('Should correctly render igx-overlay', fakeAsync(() => {
            const fix = TestBed.createComponent(EmptyPageComponent);
            fix.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new AutoPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };

            const positionSettings: PositionSettings = {
                horizontalDirection: HorizontalAlignment.Right,
                verticalDirection: VerticalAlignment.Bottom,
                target: fix.componentInstance.buttonElement.nativeElement,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };
            overlaySettings.positionStrategy = new AutoPositionStrategy(positionSettings);
            fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            fix.detectChanges();
            const wrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            expect(wrapper).toBeDefined();
            expect(wrapper.classList).toContain(CLASS_OVERLAY_WRAPPER);
        }));

        it('Should cover the whole window 100% width and height.', fakeAsync(() => {
            const fix = TestBed.createComponent(EmptyPageComponent);
            fix.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            const positionSettings: PositionSettings = {
                horizontalDirection: HorizontalAlignment.Right,
                verticalDirection: VerticalAlignment.Bottom,
                target: fix.componentInstance.buttonElement.nativeElement,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };
            overlaySettings.positionStrategy = new AutoPositionStrategy(positionSettings);
            fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            fix.detectChanges();
            const wrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            expect(wrapper.clientHeight).toEqual(window.innerHeight);
            expect(wrapper.clientWidth).toEqual(window.innerWidth);
        }));

        it('Should append the shown component inside the igx-overlay as a last child.', fakeAsync(() => {
            const fix = TestBed.createComponent(EmptyPageComponent);
            fix.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            const positionSettings: PositionSettings = {
                horizontalDirection: HorizontalAlignment.Right,
                verticalDirection: VerticalAlignment.Bottom,
                target: fix.componentInstance.buttonElement.nativeElement,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };
            overlaySettings.positionStrategy = new AutoPositionStrategy(positionSettings);
            fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();

            fix.detectChanges();
            const wrappers = document.getElementsByClassName(CLASS_OVERLAY_CONTENT);
            const wrapperContent = wrappers[wrappers.length - 1].lastElementChild; // wrapped in NG-COMPONENT
            expect(wrapperContent.children.length).toEqual(1);
            expect(wrapperContent.lastElementChild.getAttribute('style'))
                .toEqual('width:100px; height: 100px; background-color: red');
        }));

        it('Should show the component inside of the viewport if it would normally be outside of bounds, BOTTOM + RIGHT.', fakeAsync(() => {
            const fix = TestBed.createComponent(DownRightButtonComponent);
            fix.detectChanges();

            fix.componentInstance.positionStrategy = new AutoPositionStrategy();
            const currentElement = fix.componentInstance;
            const buttonElement = fix.componentInstance.buttonElement.nativeElement;
            fix.detectChanges();
            currentElement.ButtonPositioningSettings.horizontalDirection = HorizontalAlignment.Right;
            currentElement.ButtonPositioningSettings.verticalDirection = VerticalAlignment.Bottom;
            currentElement.ButtonPositioningSettings.verticalStartPoint = VerticalAlignment.Bottom;
            currentElement.ButtonPositioningSettings.horizontalStartPoint = HorizontalAlignment.Right;
            currentElement.ButtonPositioningSettings.target = buttonElement;
            buttonElement.click();
            fix.detectChanges();
            tick();

            fix.detectChanges();
            const wrappers = document.getElementsByClassName(CLASS_OVERLAY_CONTENT);
            const wrapperContent = wrappers[wrappers.length - 1] as HTMLElement; // wrapped in NG-COMPONENT
            const expectedStyle = 'width:100px; height: 100px; background-color: red';
            expect(wrapperContent.lastElementChild.lastElementChild.getAttribute('style')).toEqual(expectedStyle);
            const buttonLeft = buttonElement.offsetLeft;
            const buttonTop = buttonElement.offsetTop;
            const expectedLeft = buttonLeft - wrapperContent.lastElementChild.lastElementChild.clientWidth;
            const expectedTop = buttonTop - wrapperContent.lastElementChild.lastElementChild.clientHeight;
            const wrapperLeft = wrapperContent.getBoundingClientRect().left;
            const wrapperTop = wrapperContent.getBoundingClientRect().top;
            expect(wrapperTop).toEqual(expectedTop);
            expect(wrapperLeft).toEqual(expectedLeft);
        }));

        it('Should display each shown component based on the options specified if the component fits into the visible window.',
            fakeAsync(() => {
                const fix = TestBed.createComponent(EmptyPageComponent);
                fix.detectChanges();
                const button = fix.componentInstance.buttonElement.nativeElement;
                button.style.left = '150px';
                button.style.top = '150px';
                button.style.position = 'relative';

                const hAlignmentArray = Object.keys(HorizontalAlignment).filter(key => !isNaN(Number(HorizontalAlignment[key])));
                const vAlignmentArray = Object.keys(VerticalAlignment).filter(key => !isNaN(Number(VerticalAlignment[key])));
                hAlignmentArray.forEach(function (horizontalStartPoint) {
                    vAlignmentArray.forEach(function (verticalStartPoint) {
                        hAlignmentArray.forEach(function (horizontalDirection) {
                            //  do not check Center as we do nothing here
                            if (horizontalDirection === 'Center') { return; }
                            vAlignmentArray.forEach(function (verticalDirection) {
                                //  do not check Middle as we do nothing here
                                if (verticalDirection === 'Middle') { return; }
                                const positionSettings: PositionSettings = {
                                    target: button
                                };
                                positionSettings.horizontalStartPoint = HorizontalAlignment[horizontalStartPoint];
                                positionSettings.verticalStartPoint = VerticalAlignment[verticalStartPoint];
                                positionSettings.horizontalDirection = HorizontalAlignment[horizontalDirection];
                                positionSettings.verticalDirection = VerticalAlignment[verticalDirection];

                                const overlaySettings: OverlaySettings = {
                                    positionStrategy: new AutoPositionStrategy(positionSettings),
                                    modal: false,
                                    closeOnOutsideClick: false
                                };

                                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                                tick();
                                fix.detectChanges();

                                const targetRect: ClientRect = (<HTMLElement>positionSettings.target).getBoundingClientRect() as ClientRect;
                                const overlayWrapperElement = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
                                const overlayWrapperRect: ClientRect =
                                    overlayWrapperElement.firstElementChild.getBoundingClientRect() as ClientRect;
                                const screenRect: ClientRect = {
                                    left: 0,
                                    top: 0,
                                    right: window.innerWidth,
                                    bottom: window.innerHeight,
                                    width: window.innerWidth,
                                    height: window.innerHeight,
                                };

                                const location = getOverlayWrapperLocation(positionSettings, targetRect, overlayWrapperRect, screenRect);
                                expect(overlayWrapperRect.top.toFixed(1)).toEqual(location.y.toFixed(1));
                                expect(overlayWrapperRect.left.toFixed(1)).toEqual(location.x.toFixed(1));
                                expect(document.body.scrollHeight > document.body.clientHeight).toBeFalsy(); // check scrollbar
                                fix.componentInstance.overlay.hideAll();
                                tick();
                                fix.detectChanges();
                            });
                        });
                    });
                });
            }));

        it(`Should reposition the component and render it correctly in the window, even when the rendering options passed
            should result in otherwise a partially hidden component. No scrollbars should appear.`,
            fakeAsync(() => {
                const fix = TestBed.createComponent(EmptyPageComponent);
                fix.detectChanges();
                const button = fix.componentInstance.buttonElement.nativeElement;
                button.style.position = 'relative';
                button.style.width = '50px';
                button.style.height = '50px';
                const buttonLocations = [
                    { left: `0px`, top: `0px` }, // topLeft
                    { left: `${window.innerWidth - 200}px`, top: `0px` }, // topRight
                    { left: `0px`, top: `${window.innerHeight - 200}px` }, // bottomLeft
                    { left: `${window.innerWidth - 200}px`, top: `${window.innerHeight - 200}px` } // bottomRight
                ];
                const hAlignmentArray = Object.keys(HorizontalAlignment).filter(key => !isNaN(Number(HorizontalAlignment[key])));
                const vAlignmentArray = Object.keys(VerticalAlignment).filter(key => !isNaN(Number(VerticalAlignment[key])));
                for (const buttonLocation of buttonLocations) {
                    for (const horizontalStartPoint of hAlignmentArray) {
                        for (const verticalStartPoint of vAlignmentArray) {
                            for (const horizontalDirection of hAlignmentArray) {
                                for (const verticalDirection of vAlignmentArray) {

                                    const positionSettings: PositionSettings = {
                                        target: button
                                    };
                                    button.style.left = buttonLocation.left;
                                    button.style.top = buttonLocation.top;

                                    positionSettings.horizontalStartPoint = HorizontalAlignment[horizontalStartPoint];
                                    positionSettings.verticalStartPoint = VerticalAlignment[verticalStartPoint];
                                    positionSettings.horizontalDirection = HorizontalAlignment[horizontalDirection];
                                    positionSettings.verticalDirection = VerticalAlignment[verticalDirection];

                                    const overlaySettings: OverlaySettings = {
                                        positionStrategy: new AutoPositionStrategy(positionSettings),
                                        modal: false,
                                        closeOnOutsideClick: false
                                    };

                                    fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                                    tick();
                                    fix.detectChanges();

                                    const targetRect = (<HTMLElement>positionSettings.target).getBoundingClientRect() as ClientRect;
                                    const overlayWrapperElement = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
                                    const overlayWrapperRect =
                                        overlayWrapperElement.getBoundingClientRect() as ClientRect;
                                    const screenRect: ClientRect = {
                                        left: 0,
                                        top: 0,
                                        right: window.innerWidth,
                                        bottom: window.innerHeight,
                                        width: window.innerWidth,
                                        height: window.innerHeight,
                                    };

                                    const loc = getOverlayWrapperLocation(positionSettings, targetRect, overlayWrapperRect, screenRect);
                                    expect(overlayWrapperRect.top.toFixed(1))
                                        .withContext(`YYY HD: ${horizontalDirection}; VD: ${verticalDirection}; ` +
                                            `HSP: ${horizontalStartPoint}; VSP: ${verticalStartPoint}; ` +
                                            `BL: ${buttonLocation.left}; BT: ${buttonLocation.top}; ` +
                                            `STYLE: ${overlayWrapperElement.getAttribute('style')};`)
                                        .toEqual(loc.y.toFixed(1));
                                    expect(overlayWrapperRect.left.toFixed(1))
                                        .withContext(`XXX HD: ${horizontalDirection}; VD: ${verticalDirection}; ` +
                                            `HSP: ${horizontalStartPoint}; VSP: ${verticalStartPoint}; ` +
                                            `BL: ${buttonLocation.left}; BT: ${buttonLocation.top}; ` +
                                            `STYLE: ${overlayWrapperElement.getAttribute('style')};`)
                                        .toEqual(loc.x.toFixed(1));
                                    expect(document.body.scrollHeight > document.body.clientHeight).toBeFalsy(); // check scrollbar
                                    fix.componentInstance.overlay.hideAll();
                                    tick();
                                    fix.detectChanges();
                                }
                            }
                        }
                    }
                }
            }));

        it('Should render margins correctly.', fakeAsync(() => {
            const expectedMargin = '0px';
            const fix = TestBed.createComponent(EmptyPageComponent);
            fix.detectChanges();
            const button = fix.componentInstance.buttonElement.nativeElement;
            const positionSettings: PositionSettings = {
                target: button
            };
            const overlaySettings: OverlaySettings = {
                positionStrategy: new AutoPositionStrategy(positionSettings),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            const hAlignmentArray = Object.keys(HorizontalAlignment).filter(key => !isNaN(Number(HorizontalAlignment[key])));
            const vAlignmentArray = Object.keys(VerticalAlignment).filter(key => !isNaN(Number(VerticalAlignment[key])));

            hAlignmentArray.forEach(function (hDirection) {
                vAlignmentArray.forEach(function (vDirection) {
                    hAlignmentArray.forEach(function (hAlignment) {
                        vAlignmentArray.forEach(function (vAlignment) {
                            verifyOverlayMargins(hDirection, vDirection, hAlignment, vAlignment);
                        });
                    });
                });
            });

            function verifyOverlayMargins(horizontalDirection, verticalDirection, horizontalAlignment, verticalAlignment) {
                positionSettings.horizontalDirection = horizontalDirection;
                positionSettings.verticalDirection = verticalDirection;
                positionSettings.horizontalStartPoint = horizontalAlignment;
                positionSettings.verticalStartPoint = verticalAlignment;
                overlaySettings.positionStrategy = new AutoPositionStrategy(positionSettings);
                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                tick();
                fix.detectChanges();
                const overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
                const overlayContent = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
                const overlayElement = overlayContent.children[0];
                const wrapperMargin = window.getComputedStyle(overlayWrapper, null).getPropertyValue('margin');
                const contentMargin = window.getComputedStyle(overlayContent, null).getPropertyValue('margin');
                const elementMargin = window.getComputedStyle(overlayElement, null).getPropertyValue('margin');
                expect(wrapperMargin).toEqual(expectedMargin);
                expect(contentMargin).toEqual(expectedMargin);
                expect(elementMargin).toEqual(expectedMargin);
                fix.componentInstance.overlay.hideAll();
            }
        }));

        // When adding more than one component to show in igx-overlay:
        it('When the options used to fit the component in the window - adding a new instance of the component with the ' +
            ' same options will render it on top of the previous one.', fakeAsync(() => {
                const fix = TestBed.createComponent(EmptyPageComponent);
                fix.detectChanges();
                const button = fix.componentInstance.buttonElement.nativeElement;
                const positionSettings: PositionSettings = {
                    horizontalDirection: HorizontalAlignment.Right,
                    verticalDirection: VerticalAlignment.Bottom,
                    target: button,
                    horizontalStartPoint: HorizontalAlignment.Center,
                    verticalStartPoint: VerticalAlignment.Bottom
                };
                const overlaySettings: OverlaySettings = {
                    positionStrategy: new AutoPositionStrategy(positionSettings),
                    scrollStrategy: new NoOpScrollStrategy(),
                    modal: false,
                    closeOnOutsideClick: false
                };
                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                fix.detectChanges();
                tick();

                const buttonRect = button.getBoundingClientRect();
                const overlayWrapper_1 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
                const componentEl_1 = overlayWrapper_1.children[0].children[0];
                const overlayWrapper_2 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[1];
                const componentEl_2 = overlayWrapper_2.children[0].children[0];
                const componentRect_1 = componentEl_1.getBoundingClientRect();
                const componentRect_2 = componentEl_2.getBoundingClientRect();
                expect(componentRect_1.left.toFixed(1)).toEqual((buttonRect.left + buttonRect.width / 2).toFixed(1));
                expect(componentRect_1.left.toFixed(1)).toEqual(componentRect_2.left.toFixed(1));
                expect(componentRect_1.top.toFixed(1)).toEqual((buttonRect.top + buttonRect.height).toFixed(1));
                expect(componentRect_1.top.toFixed(1)).toEqual(componentRect_2.top.toFixed(1));
                expect(componentRect_1.width.toFixed(1)).toEqual(componentRect_2.width.toFixed(1));
                expect(componentRect_1.height.toFixed(1)).toEqual(componentRect_2.height.toFixed(1));
            }));

        // When adding more than one component to show in igx-overlay and the options used will not fit the component in the
        // window, so AutoPosition is used.
        it('When adding a new instance of the component with the same options, will render it on top of the previous one.',
            fakeAsync(() => {
                const fix = TestBed.createComponent(EmptyPageComponent);
                fix.detectChanges();
                const button = fix.componentInstance.buttonElement.nativeElement;
                const positionSettings: PositionSettings = {
                    horizontalDirection: HorizontalAlignment.Left,
                    verticalDirection: VerticalAlignment.Top,
                    target: button,
                    horizontalStartPoint: HorizontalAlignment.Left,
                    verticalStartPoint: VerticalAlignment.Top
                };
                const overlaySettings: OverlaySettings = {
                    positionStrategy: new AutoPositionStrategy(positionSettings),
                    scrollStrategy: new NoOpScrollStrategy(),
                    modal: false,
                    closeOnOutsideClick: false
                };
                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                fix.detectChanges();
                tick();
                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                fix.detectChanges();
                tick();
                const buttonRect = button.getBoundingClientRect();
                const overlayWrapper_1 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
                const componentEl_1 = overlayWrapper_1.children[0].children[0];
                const overlayWrapper_2 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[1];
                const componentEl_2 = overlayWrapper_2.children[0].children[0];
                const componentRect_1 = componentEl_1.getBoundingClientRect();
                const componentRect_2 = componentEl_2.getBoundingClientRect();
                // Will be positioned on the right of the button
                expect(Math.round(componentRect_1.left)).toEqual(Math.round(buttonRect.right));
                expect(Math.round(componentRect_1.left)).toEqual(Math.round(componentRect_2.left)); // Are on the same spot
                // expect(componentRect_1.top).toEqual(buttonRect.top - componentEl_1.clientHeight); // Will be positioned on top of button
                expect(Math.round(componentRect_1.top)).toEqual(Math.round(componentRect_2.top)); // Will have the same top
                expect(Math.round(componentRect_1.width)).toEqual(Math.round(componentRect_2.width)); // Will have the same width
                expect(Math.round(componentRect_1.height)).toEqual(Math.round(componentRect_2.height)); // Will have the same height
            }));

        it(`Should persist the component's open state when scrolling, when scrolling and noOP scroll strategy is used
        (expanded DropDown remains expanded).`, fakeAsync(() => {
            // TO DO replace Spies with css class and/or getBoundingClientRect.
            const fixture = TestBed.createComponent(EmptyPageComponent);
            const scrollTolerance = 10;
            const scrollStrategy = new BlockScrollStrategy();
            const overlay = fixture.componentInstance.overlay;
            const overlaySettings: OverlaySettings = {
                modal: false,
                scrollStrategy: scrollStrategy,
                positionStrategy: new GlobalPositionStrategy()
            };

            spyOn(scrollStrategy, 'initialize').and.callThrough();
            spyOn(scrollStrategy, 'attach').and.callThrough();
            spyOn(scrollStrategy, 'detach').and.callThrough();
            spyOn(overlay, 'hide').and.callThrough();

            const scrollSpy = spyOn<any>(scrollStrategy, 'onScroll').and.callThrough();

            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            expect(scrollStrategy.initialize).toHaveBeenCalledTimes(1);
            expect(scrollStrategy.attach).toHaveBeenCalledTimes(1);
            expect(scrollStrategy.detach).toHaveBeenCalledTimes(0);
            expect(overlay.hide).toHaveBeenCalledTimes(0);
            document.documentElement.scrollTop += scrollTolerance;
            document.dispatchEvent(new Event('scroll'));
            tick();
            expect(scrollSpy).toHaveBeenCalledTimes(1);
            expect(overlay.hide).toHaveBeenCalledTimes(0);
            expect(scrollStrategy.detach).toHaveBeenCalledTimes(0);
        }));

        it('Should persist the component open state when scrolling and absolute scroll strategy is used.', fakeAsync(() => {
            // TO DO replace Spies with css class and/or getBoundingClientRect.
            const fixture = TestBed.createComponent(EmptyPageComponent);
            const scrollTolerance = 10;
            const scrollStrategy = new AbsoluteScrollStrategy();
            const overlay = fixture.componentInstance.overlay;
            const overlaySettings: OverlaySettings = {
                closeOnOutsideClick: false,
                modal: false,
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: scrollStrategy
            };

            spyOn(scrollStrategy, 'initialize').and.callThrough();
            spyOn(scrollStrategy, 'attach').and.callThrough();
            spyOn(scrollStrategy, 'detach').and.callThrough();
            spyOn(overlay, 'hide').and.callThrough();

            const scrollSpy = spyOn<any>(scrollStrategy, 'onScroll').and.callThrough();

            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            expect(scrollStrategy.initialize).toHaveBeenCalledTimes(1);
            expect(scrollStrategy.attach).toHaveBeenCalledTimes(1);

            document.documentElement.scrollTop += scrollTolerance;
            document.dispatchEvent(new Event('scroll'));
            tick();
            expect(scrollSpy).toHaveBeenCalledTimes(1);
            expect(scrollStrategy.detach).toHaveBeenCalledTimes(0);
            expect(overlay.hide).toHaveBeenCalledTimes(0);
        }));

        // 1.4 ElasticPosition (resize shown component to fit into visible window)
        it('Should correctly render igx-overlay', fakeAsync(() => {
            const fix = TestBed.createComponent(EmptyPageComponent);
            fix.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new ElasticPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };

            const positionSettings: PositionSettings = {
                horizontalDirection: HorizontalAlignment.Right,
                verticalDirection: VerticalAlignment.Bottom,
                target: fix.componentInstance.buttonElement.nativeElement,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };
            overlaySettings.positionStrategy = new ElasticPositionStrategy(positionSettings);
            fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            fix.detectChanges();
            const wrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            expect(wrapper).toBeDefined();
            expect(wrapper.classList).toContain(CLASS_OVERLAY_WRAPPER);
        }));

        it('Should cover the whole window 100% width and height.', fakeAsync(() => {
            const fix = TestBed.createComponent(EmptyPageComponent);
            fix.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            const positionSettings: PositionSettings = {
                horizontalDirection: HorizontalAlignment.Right,
                verticalDirection: VerticalAlignment.Bottom,
                target: fix.componentInstance.buttonElement.nativeElement,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };
            overlaySettings.positionStrategy = new ElasticPositionStrategy(positionSettings);
            fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            fix.detectChanges();
            const wrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            expect(wrapper.clientHeight).toEqual(window.innerHeight);
            expect(wrapper.clientWidth).toEqual(window.innerWidth);
        }));

        it('Should append the shown component inside the igx-overlay as a last child.', fakeAsync(() => {
            const fix = TestBed.createComponent(EmptyPageComponent);
            fix.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new ElasticPositionStrategy(),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            const positionSettings: PositionSettings = {
                horizontalDirection: HorizontalAlignment.Right,
                verticalDirection: VerticalAlignment.Bottom,
                target: fix.componentInstance.buttonElement.nativeElement,
                horizontalStartPoint: HorizontalAlignment.Left,
                verticalStartPoint: VerticalAlignment.Top
            };
            overlaySettings.positionStrategy = new ElasticPositionStrategy(positionSettings);
            fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();

            fix.detectChanges();
            const wrappers = document.getElementsByClassName(CLASS_OVERLAY_CONTENT);
            const wrapperContent = wrappers[wrappers.length - 1].lastElementChild; // wrapped in NG-COMPONENT
            expect(wrapperContent.children.length).toEqual(1);
            expect(wrapperContent.lastElementChild.getAttribute('style'))
                .toEqual('width:100px; height: 100px; background-color: red');
        }));

        it('Should show the component inside of the viewport if it would normally be outside of bounds, BOTTOM + RIGHT.', fakeAsync(() => {
            const fix = TestBed.createComponent(DownRightButtonComponent);
            fix.detectChanges();

            fix.componentInstance.positionStrategy = new ElasticPositionStrategy();
            const component = fix.componentInstance;
            const buttonElement = fix.componentInstance.buttonElement.nativeElement;
            component.ButtonPositioningSettings.horizontalDirection = HorizontalAlignment.Right;
            component.ButtonPositioningSettings.verticalDirection = VerticalAlignment.Bottom;
            component.ButtonPositioningSettings.verticalStartPoint = VerticalAlignment.Bottom;
            component.ButtonPositioningSettings.horizontalStartPoint = HorizontalAlignment.Right;
            component.ButtonPositioningSettings.target = buttonElement;
            component.ButtonPositioningSettings.minSize = { width: 80, height: 80 };
            buttonElement.click();
            tick();
            fix.detectChanges();

            const wrappers = document.getElementsByClassName(CLASS_OVERLAY_CONTENT);
            const wrapperContent = wrappers[wrappers.length - 1] as HTMLElement; // wrapped in NG-COMPONENT
            const rect = wrapperContent.getBoundingClientRect();
            expect(rect.width).toEqual(80);
            expect(rect.height).toEqual(80);
            const expectedLeft = buttonElement.offsetLeft + buttonElement.offsetWidth;
            const expectedTop = buttonElement.offsetTop + buttonElement.offsetHeight;
            expect(rect.top).toEqual(expectedTop);
            expect(rect.left).toEqual(expectedLeft);
        }));

        it('Should display each shown component based on the options specified if the component fits into the visible window.',
            fakeAsync(() => {
                const fix = TestBed.createComponent(EmptyPageComponent);
                fix.detectChanges();
                const button = fix.componentInstance.buttonElement.nativeElement;
                button.style.left = '150px';
                button.style.top = '150px';
                button.style.position = 'relative';

                const hAlignmentArray = Object.keys(HorizontalAlignment).filter(key => !isNaN(Number(HorizontalAlignment[key])));
                const vAlignmentArray = Object.keys(VerticalAlignment).filter(key => !isNaN(Number(VerticalAlignment[key])));
                hAlignmentArray.forEach(function (horizontalStartPoint) {
                    vAlignmentArray.forEach(function (verticalStartPoint) {
                        hAlignmentArray.forEach(function (horizontalDirection) {
                            vAlignmentArray.forEach(function (verticalDirection) {
                                const positionSettings: PositionSettings = {
                                    target: button
                                };
                                positionSettings.horizontalStartPoint = HorizontalAlignment[horizontalStartPoint];
                                positionSettings.verticalStartPoint = VerticalAlignment[verticalStartPoint];
                                positionSettings.horizontalDirection = HorizontalAlignment[horizontalDirection];
                                positionSettings.verticalDirection = VerticalAlignment[verticalDirection];
                                positionSettings.minSize = { width: 80, height: 80 };

                                const overlaySettings: OverlaySettings = {
                                    positionStrategy: new ElasticPositionStrategy(positionSettings),
                                    modal: false,
                                    closeOnOutsideClick: false
                                };

                                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                                tick();
                                fix.detectChanges();

                                const targetRect: ClientRect = (<HTMLElement>positionSettings.target).getBoundingClientRect() as ClientRect;
                                //  we need original rect of the wrapper element. After it was shown in overlay elastic may
                                //  set width and/or height. To get original rect remove width and height, get the rect and
                                //  restore width and height;
                                const overlayWrapperElement: Element = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
                                const width = (<any>overlayWrapperElement).style.width;
                                (<any>overlayWrapperElement).style.width = '';
                                const height = (<any>overlayWrapperElement).style.height;
                                (<any>overlayWrapperElement).style.height = '';
                                let overlayWrapperRect = overlayWrapperElement.getBoundingClientRect() as ClientRect;
                                (<any>overlayWrapperElement).style.width = width;
                                (<any>overlayWrapperElement).style.height = height;
                                const screenRect: ClientRect = {
                                    left: 0,
                                    top: 0,
                                    right: window.innerWidth,
                                    bottom: window.innerHeight,
                                    width: window.innerWidth,
                                    height: window.innerHeight,
                                };

                                const location =
                                    getOverlayWrapperLocation(positionSettings, targetRect, overlayWrapperRect, screenRect, true);
                                //  now get the wrapper rect as it is after elastic was applied
                                overlayWrapperRect = overlayWrapperElement.getBoundingClientRect() as ClientRect;
                                expect(overlayWrapperRect.top.toFixed(1))
                                    .withContext(`HD: ${horizontalDirection}; HSP: ${horizontalStartPoint};` +
                                        `VD: ${verticalDirection}; VSP: ${verticalStartPoint};` +
                                        `STYLE: ${overlayWrapperElement.getAttribute('style')};`)
                                    .toEqual(location.y.toFixed(1));
                                expect(overlayWrapperRect.left.toFixed(1))
                                    .withContext(`HD: ${horizontalDirection}; HSP: ${horizontalStartPoint};` +
                                        `VD: ${verticalDirection}; VSP: ${verticalStartPoint};` +
                                        `STYLE: ${overlayWrapperElement.getAttribute('style')};`)
                                    .toEqual(location.x.toFixed(1));
                                fix.componentInstance.overlay.hideAll();
                                tick();
                                fix.detectChanges();
                            });
                        });
                    });
                });
            }));

        it(`Should reposition the component and render it correctly in the window, even when the rendering options passed
        should result in otherwise a partially hidden component.No scrollbars should appear.`,
            fakeAsync(() => {
                const fix = TestBed.createComponent(EmptyPageComponent);
                fix.detectChanges();
                const button = fix.componentInstance.buttonElement.nativeElement;
                button.style.position = 'relative';
                button.style.width = '50px';
                button.style.height = '50px';
                const buttonLocations = [
                    { left: `0px`, top: `0px` }, // topLeft
                    { left: `${window.innerWidth - button.width} px`, top: `0px` }, // topRight
                    { left: `0px`, top: `${window.innerHeight - button.height} px` }, // bottomLeft
                    { left: `${window.innerWidth - button.width} px`, top: `${window.innerHeight - button.height} px` } // bottomRight
                ];
                const hAlignmentArray = Object.keys(HorizontalAlignment).filter(key => !isNaN(Number(HorizontalAlignment[key])));
                const vAlignmentArray = Object.keys(VerticalAlignment).filter(key => !isNaN(Number(VerticalAlignment[key])));
                for (const buttonLocation of buttonLocations) {
                    for (const horizontalStartPoint of hAlignmentArray) {
                        for (const verticalStartPoint of vAlignmentArray) {
                            for (const horizontalDirection of hAlignmentArray) {
                                for (const verticalDirection of vAlignmentArray) {
                                    const positionSettings: PositionSettings = {
                                        target: button
                                    };
                                    button.style.left = buttonLocation.left;
                                    button.style.top = buttonLocation.top;

                                    positionSettings.horizontalStartPoint = HorizontalAlignment[horizontalStartPoint];
                                    positionSettings.verticalStartPoint = VerticalAlignment[verticalStartPoint];
                                    positionSettings.horizontalDirection = HorizontalAlignment[horizontalDirection];
                                    positionSettings.verticalDirection = VerticalAlignment[verticalDirection];
                                    positionSettings.minSize = { width: 80, height: 80 };

                                    const overlaySettings: OverlaySettings = {
                                        positionStrategy: new ElasticPositionStrategy(positionSettings),
                                        modal: false,
                                        closeOnOutsideClick: false
                                    };

                                    fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                                    tick();
                                    fix.detectChanges();

                                    const targetRect = (<HTMLElement>positionSettings.target).getBoundingClientRect() as ClientRect;
                                    //  we need original rect of the wrapper element. After it was shown in overlay elastic may
                                    //  set width and/or height. To get original rect remove width and height, get the rect and
                                    //  restore width and height;
                                    const overlayWrapperElement: Element = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
                                    const width = (<any>overlayWrapperElement).style.width;
                                    (<any>overlayWrapperElement).style.width = '';
                                    const height = (<any>overlayWrapperElement).style.height;
                                    (<any>overlayWrapperElement).style.height = '';
                                    let overlayWrapperRect = overlayWrapperElement.getBoundingClientRect() as ClientRect;
                                    (<any>overlayWrapperElement).style.width = width;
                                    (<any>overlayWrapperElement).style.height = height;
                                    const screenRect: ClientRect = {
                                        left: 0,
                                        top: 0,
                                        right: window.innerWidth,
                                        bottom: window.innerHeight,
                                        width: window.innerWidth,
                                        height: window.innerHeight,
                                    };

                                    const loc =
                                        getOverlayWrapperLocation(positionSettings, targetRect, overlayWrapperRect, screenRect, true);
                                    //  now get the wrapper rect as it is after elastic was applied
                                    overlayWrapperRect = overlayWrapperElement.getBoundingClientRect() as ClientRect;
                                    expect(overlayWrapperRect.top.toFixed(1))
                                        .withContext(`HD: ${horizontalDirection}; HSP: ${horizontalStartPoint};` +
                                            `VD: ${verticalDirection}; VSP: ${verticalStartPoint};` +
                                            `STYLE: ${overlayWrapperElement.getAttribute('style')};`)
                                        .toEqual(loc.y.toFixed(1));
                                    expect(overlayWrapperRect.left.toFixed(1))
                                        .withContext(`HD: ${horizontalDirection}; HSP: ${horizontalStartPoint};` +
                                            `VD: ${verticalDirection}; VSP: ${verticalStartPoint}` +
                                            `STYLE: ${overlayWrapperElement.getAttribute('style')};`)
                                        .toEqual(loc.x.toFixed(1));
                                    expect(document.body.scrollHeight > document.body.clientHeight).toBeFalsy(); // check scrollbars
                                    fix.componentInstance.overlay.hideAll();
                                    tick();
                                    fix.detectChanges();
                                }
                            }
                        }
                    }
                }
            }));

        it('Should render margins correctly.', fakeAsync(() => {
            const expectedMargin = '0px';
            const fix = TestBed.createComponent(EmptyPageComponent);
            fix.detectChanges();
            const button = fix.componentInstance.buttonElement.nativeElement;
            const positionSettings: PositionSettings = {
                target: button
            };
            const overlaySettings: OverlaySettings = {
                positionStrategy: new ElasticPositionStrategy(positionSettings),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            const hAlignmentArray = Object.keys(HorizontalAlignment).filter(key => !isNaN(Number(HorizontalAlignment[key])));
            const vAlignmentArray = Object.keys(VerticalAlignment).filter(key => !isNaN(Number(VerticalAlignment[key])));

            hAlignmentArray.forEach(function (hDirection) {
                vAlignmentArray.forEach(function (vDirection) {
                    hAlignmentArray.forEach(function (hAlignment) {
                        vAlignmentArray.forEach(function (vAlignment) {
                            verifyOverlayMargins(hDirection, vDirection, hAlignment, vAlignment);
                        });
                    });
                });
            });

            function verifyOverlayMargins(horizontalDirection, verticalDirection, horizontalAlignment, verticalAlignment) {
                positionSettings.horizontalDirection = horizontalDirection;
                positionSettings.verticalDirection = verticalDirection;
                positionSettings.horizontalStartPoint = horizontalAlignment;
                positionSettings.verticalStartPoint = verticalAlignment;
                overlaySettings.positionStrategy = new ElasticPositionStrategy(positionSettings);
                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                tick();
                fix.detectChanges();
                const overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
                const overlayContent = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
                const overlayElement = overlayContent.children[0];
                const wrapperMargin = window.getComputedStyle(overlayWrapper, null).getPropertyValue('margin');
                const contentMargin = window.getComputedStyle(overlayContent, null).getPropertyValue('margin');
                const elementMargin = window.getComputedStyle(overlayElement, null).getPropertyValue('margin');
                expect(wrapperMargin).toEqual(expectedMargin);
                expect(contentMargin).toEqual(expectedMargin);
                expect(elementMargin).toEqual(expectedMargin);
                fix.componentInstance.overlay.hideAll();
            }
        }));

        // When adding more than one component to show in igx-overlay:
        it('When the options used to fit the component in the window - adding a new instance of the component with the ' +
            ' same options will render it on top of the previous one.', fakeAsync(() => {
                const fix = TestBed.createComponent(EmptyPageComponent);
                fix.detectChanges();
                const button = fix.componentInstance.buttonElement.nativeElement;
                const positionSettings: PositionSettings = {
                    horizontalDirection: HorizontalAlignment.Right,
                    verticalDirection: VerticalAlignment.Bottom,
                    target: button,
                    horizontalStartPoint: HorizontalAlignment.Center,
                    verticalStartPoint: VerticalAlignment.Bottom
                };
                const overlaySettings: OverlaySettings = {
                    positionStrategy: new ElasticPositionStrategy(positionSettings),
                    scrollStrategy: new NoOpScrollStrategy(),
                    modal: false,
                    closeOnOutsideClick: false
                };
                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                fix.detectChanges();
                tick();

                const buttonRect = button.getBoundingClientRect();
                const overlayWrapper_1 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
                const componentEl_1 = overlayWrapper_1.children[0].children[0];
                const overlayWrapper_2 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[1];
                const componentEl_2 = overlayWrapper_2.children[0].children[0];
                const componentRect_1 = componentEl_1.getBoundingClientRect();
                const componentRect_2 = componentEl_2.getBoundingClientRect();
                expect(componentRect_1.left.toFixed(1)).toEqual((buttonRect.left + buttonRect.width / 2).toFixed(1));
                expect(componentRect_1.left.toFixed(1)).toEqual(componentRect_2.left.toFixed(1));
                expect(componentRect_1.top.toFixed(1)).toEqual((buttonRect.top + buttonRect.height).toFixed(1));
                expect(componentRect_1.top.toFixed(1)).toEqual(componentRect_2.top.toFixed(1));
                expect(componentRect_1.width.toFixed(1)).toEqual(componentRect_2.width.toFixed(1));
                expect(componentRect_1.height.toFixed(1)).toEqual(componentRect_2.height.toFixed(1));
            }));

        // When adding more than one component to show in igx-overlay and the options used will not fit the component in the
        // window, so element is resized.
        it('When adding a new instance of the component with the same options, will render it on top of the previous one.',
            fakeAsync(() => {
                const fix = TestBed.createComponent(EmptyPageComponent);
                fix.detectChanges();
                const button = fix.componentInstance.buttonElement.nativeElement;
                const positionSettings: PositionSettings = {
                    horizontalDirection: HorizontalAlignment.Left,
                    verticalDirection: VerticalAlignment.Top,
                    target: button,
                    horizontalStartPoint: HorizontalAlignment.Left,
                    verticalStartPoint: VerticalAlignment.Top,
                    minSize: { width: 80, height: 80 }
                };
                const overlaySettings: OverlaySettings = {
                    positionStrategy: new ElasticPositionStrategy(positionSettings),
                    scrollStrategy: new NoOpScrollStrategy(),
                    modal: false,
                    closeOnOutsideClick: false
                };
                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                fix.detectChanges();
                tick();

                fix.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
                fix.detectChanges();
                tick();

                const buttonRect = button.getBoundingClientRect();
                const overlayWrapper_1 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
                const componentEl_1 = overlayWrapper_1.children[0].children[0];
                const overlayWrapper_2 = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[1];
                const componentEl_2 = overlayWrapper_2.children[0].children[0];
                const componentRect_1 = componentEl_1.getBoundingClientRect();
                const componentRect_2 = componentEl_2.getBoundingClientRect();
                expect(componentRect_1.left).toEqual(buttonRect.left - positionSettings.minSize.width);
                expect(componentRect_1.left).toEqual(componentRect_2.left);
                expect(componentRect_1.top).toEqual(componentRect_2.top);
                expect(componentRect_1.width).toEqual(componentRect_2.width);
                expect(componentRect_1.height).toEqual(componentRect_2.height);
            }));

        it(`Should persist the component's open state when scrolling, when scrolling and noOP scroll strategy is used
            (expanded DropDown remains expanded).`, fakeAsync(() => {
            // TO DO replace Spies with css class and/or getBoundingClientRect.
            const fixture = TestBed.createComponent(EmptyPageComponent);
            const scrollTolerance = 10;
            const scrollStrategy = new BlockScrollStrategy();
            const overlay = fixture.componentInstance.overlay;
            const overlaySettings: OverlaySettings = {
                modal: false,
                scrollStrategy: scrollStrategy,
                positionStrategy: new ElasticPositionStrategy()
            };

            spyOn(scrollStrategy, 'initialize').and.callThrough();
            spyOn(scrollStrategy, 'attach').and.callThrough();
            spyOn(scrollStrategy, 'detach').and.callThrough();
            spyOn(overlay, 'hide').and.callThrough();

            const scrollSpy = spyOn<any>(scrollStrategy, 'onScroll').and.callThrough();

            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            expect(scrollStrategy.initialize).toHaveBeenCalledTimes(1);
            expect(scrollStrategy.attach).toHaveBeenCalledTimes(1);
            expect(scrollStrategy.detach).toHaveBeenCalledTimes(0);
            expect(overlay.hide).toHaveBeenCalledTimes(0);
            document.documentElement.scrollTop += scrollTolerance;
            document.dispatchEvent(new Event('scroll'));
            tick();
            expect(scrollSpy).toHaveBeenCalledTimes(1);
            expect(overlay.hide).toHaveBeenCalledTimes(0);
            expect(scrollStrategy.detach).toHaveBeenCalledTimes(0);
        }));

        it('Should persist the component open state when scrolling and absolute scroll strategy is used.', fakeAsync(() => {
            // TO DO replace Spies with css class and/or getBoundingClientRect.
            const fixture = TestBed.createComponent(EmptyPageComponent);
            const scrollTolerance = 10;
            const scrollStrategy = new AbsoluteScrollStrategy();
            const overlay = fixture.componentInstance.overlay;
            const overlaySettings: OverlaySettings = {
                closeOnOutsideClick: false,
                modal: false,
                positionStrategy: new ElasticPositionStrategy(),
                scrollStrategy: scrollStrategy
            };

            spyOn(scrollStrategy, 'initialize').and.callThrough();
            spyOn(scrollStrategy, 'attach').and.callThrough();
            spyOn(scrollStrategy, 'detach').and.callThrough();
            spyOn(overlay, 'hide').and.callThrough();

            const scrollSpy = spyOn<any>(scrollStrategy, 'onScroll').and.callThrough();

            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            expect(scrollStrategy.initialize).toHaveBeenCalledTimes(1);
            expect(scrollStrategy.attach).toHaveBeenCalledTimes(1);

            document.documentElement.scrollTop += scrollTolerance;
            document.dispatchEvent(new Event('scroll'));
            tick();
            expect(scrollSpy).toHaveBeenCalledTimes(1);
            expect(scrollStrategy.detach).toHaveBeenCalledTimes(0);
            expect(overlay.hide).toHaveBeenCalledTimes(0);
        }));

        // 1.5 GlobalContainer.
        it('Should center the shown component in the outlet.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);

            const outlet = fixture.componentInstance.divElement;
            const outletElement = outlet.nativeElement;
            outletElement.style.width = '800px';
            outletElement.style.height = '600px';
            outletElement.style.position = 'fixed';
            outletElement.style.top = '100px';
            outletElement.style.left = '200px';
            outletElement.style.overflow = 'hidden';

            fixture.detectChanges();
            const overlaySettings: OverlaySettings = {
                outlet: outlet,
                positionStrategy: new ContainerPositionStrategy()
            };

            const id = fixture.componentInstance.overlay.attach(SimpleDynamicComponent);
            fixture.componentInstance.overlay.show(id, overlaySettings);
            tick();

            const overlayDiv = outletElement.children[0];
            const overlayDivRect = overlayDiv.getBoundingClientRect();
            expect(overlayDivRect.width).toEqual(800);
            expect(overlayDivRect.height).toEqual(600);

            const overlayWrapper = overlayDiv.children[0] as HTMLElement;
            const componentEl = overlayWrapper.children[0].children[0];
            const componentRect = componentEl.getBoundingClientRect();

            // left = outletLeft + (outletWidth - componentWidth) / 2
            // left = 200        + (800         - 100           ) / 2
            expect(componentRect.left).toEqual(550);
            // top = outletTop + (outletHeight - componentHeight) / 2
            // top = 100       + (600          - 100            ) / 2
            expect(componentRect.top).toEqual(350);
        }));

        // 3. Interaction
        // 3.1 Modal
        it('Should apply a greyed-out mask layers when is modal.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            const overlaySettings: OverlaySettings = {
                modal: true,
            };

            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            const overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER_MODAL)[0];
            tick();
            const styles = css(overlayWrapper);
            const expectedBackgroundColor = 'background: rgba(0, 0, 0, 0.38)';
            const appliedBackgroundStyles = styles[2];
            expect(appliedBackgroundStyles).toContain(expectedBackgroundColor);
        }));

        it('Should allow interaction only for the shown component when is modal.', fakeAsync(() => {

            // Utility handler meant for later detachment
            // TO DO replace Spies with css class and/or getBoundingClientRect.
            function _handler(event) {
                if (event.which === 1) {
                    fixture.detectChanges();
                    tick();
                    expect(button.click).toHaveBeenCalledTimes(0);
                    expect(button.onclick).toHaveBeenCalledTimes(0);
                    document.removeEventListener('click', _handler);
                    dummy.remove();
                }

                return event;
            }
            const fixture = TestBed.createComponent(EmptyPageComponent);
            const overlay = fixture.componentInstance.overlay;
            const overlaySettings: OverlaySettings = {
                modal: true,
                closeOnOutsideClick: false,
                positionStrategy: new GlobalPositionStrategy()
            };
            const dummy = document.createElement('button');
            dummy.setAttribute('id', 'dummyButton');
            document.body.appendChild(dummy);
            const button = document.getElementById('dummyButton');

            button.addEventListener('click', _handler);

            spyOn(button, 'click').and.callThrough();
            spyOn(button, 'onclick').and.callThrough();
            spyOn(overlay, 'show').and.callThrough();
            spyOn(overlay, 'hide').and.callThrough();

            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            expect(overlay.show).toHaveBeenCalledTimes(1);
            expect(overlay.hide).toHaveBeenCalledTimes(0);

            button.dispatchEvent(new MouseEvent('click'));
        }));

        it('Should closes the component when esc key is pressed.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            const overlay = fixture.componentInstance.overlay;
            const overlaySettings: OverlaySettings = {
                modal: true,
                positionStrategy: new GlobalPositionStrategy()
            };

            const targetButton = 'Escape';
            const escEvent = new KeyboardEvent('keydown', {
                key: targetButton
            });

            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();

            let overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER_MODAL)[0];
            overlayWrapper.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === targetButton) {
                    overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER_MODAL)[0];
                }
            });
            tick();
            expect(overlayWrapper).toBeTruthy();
            overlayWrapper.dispatchEvent(escEvent);
            tick();
        }));

        // Test #1883 #1820
        it('It should close the component when esc key is pressed and there were other keys pressed prior to esc.', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            const overlay = fixture.componentInstance.overlay;
            const overlaySettings: OverlaySettings = {
                modal: true,
                positionStrategy: new GlobalPositionStrategy()
            };

            const escEvent = new KeyboardEvent('keydown', {
                key: 'Escape'
            });
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter'
            });
            const arrowUpEvent = new KeyboardEvent('keydown', {
                key: 'ArrowUp'
            });
            const aEvent = new KeyboardEvent('keydown', {
                key: 'a'
            });

            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();

            let overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER_MODAL)[0];
            overlayWrapper.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER_MODAL)[0];
                    expect(overlayWrapper).toBeFalsy();
                }
            });
            tick();
            expect(overlayWrapper).toBeTruthy();

            overlayWrapper.dispatchEvent(enterEvent);
            overlayWrapper.dispatchEvent(aEvent);
            overlayWrapper.dispatchEvent(arrowUpEvent);
            overlayWrapper.dispatchEvent(escEvent);
        }));

        // 3.2 Non - Modal
        it('Should not apply a greyed-out mask layer when is not modal', fakeAsync(() => {
            const fixture = TestBed.createComponent(EmptyPageComponent);
            const overlaySettings: OverlaySettings = {
                modal: false,
            };

            fixture.componentInstance.overlay.show(SimpleDynamicComponent, overlaySettings);
            const overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            tick();
            const styles = css(overlayWrapper);
            const expectedBackgroundColor = 'background-color: rgba(0, 0, 0, 0.38)';
            const appliedBackgroundStyles = styles[3];
            expect(appliedBackgroundStyles).not.toContain(expectedBackgroundColor);
        }));

        it('Should not close when esc key is pressed and is not modal (DropDown, Dialog, etc.).', fakeAsync(() => {

            // Utility handler meant for later detachment
            function _handler(event) {
                if (event.key === targetButton) {
                    overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
                    expect(overlayWrapper).toBeTruthy();
                    document.removeEventListener(targetEvent, _handler);
                }

                return event;
            }

            const fixture = TestBed.createComponent(EmptyPageComponent);
            const overlay = fixture.componentInstance.overlay;
            const overlaySettings: OverlaySettings = {
                modal: false,
                positionStrategy: new GlobalPositionStrategy()
            };
            const targetEvent = 'keydown';
            const targetButton = 'Escape';
            const escEvent = new KeyboardEvent(targetEvent, {
                key: targetButton
            });

            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            let overlayWrapper = document.getElementsByClassName(CLASS_OVERLAY_WRAPPER)[0];
            overlayWrapper.addEventListener(targetEvent, _handler);

            expect(overlayWrapper).toBeTruthy();
            overlayWrapper.dispatchEvent(escEvent);
        }));

        // 4. Css
        it('Should use component initial container\'s properties when is with 100% width and show in overlay element',
            fakeAsync(() => {
                const fixture = TestBed.createComponent(WidthTestOverlayComponent);
                fixture.detectChanges();
                expect(fixture.componentInstance.customComponent).toBeDefined();
                expect(fixture.componentInstance.customComponent.nativeElement.style.width).toEqual('100%');
                expect(fixture.componentInstance.customComponent.nativeElement.getBoundingClientRect().width).toEqual(420);
                expect(fixture.componentInstance.customComponent.nativeElement.style.height).toEqual('100%');
                expect(fixture.componentInstance.customComponent.nativeElement.getBoundingClientRect().height).toEqual(280);
                fixture.componentInstance.buttonElement.nativeElement.click();
                tick();
                const overlayContent = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0] as HTMLElement;
                const overlayChild = overlayContent.lastElementChild as HTMLElement;
                expect(overlayChild).toBeDefined();
                expect(overlayChild.style.width).toEqual('100%');
                expect(overlayChild.getBoundingClientRect().width).toEqual(420);
                // content element has no height, so the shown element will calculate its own height by itself
                // expect(overlayChild.style.height).toEqual('100%');
                // expect(overlayChild.getBoundingClientRect().height).toEqual(280);
                fixture.componentInstance.overlay.hideAll();
            }));
    });

    describe('Integration tests - Scroll Strategies: ', () => {
        beforeEach(async(() => {
            TestBed.configureTestingModule({
                imports: [IgxToggleModule, DynamicModule, NoopAnimationsModule],
                declarations: DIRECTIVE_COMPONENTS
            });
        }));
        // If adding a component near the visible window borders(left,right,up,down)
        // it should be partially hidden and based on scroll strategy:
        it('Should not allow scrolling with scroll strategy is not passed.', fakeAsync(async () => {
            TestBed.overrideComponent(EmptyPageComponent, {
                set: {
                    styles: [`button {
            position: absolute;
            top: 850px;
            left: -30px;
            width: 100px;
            height: 60px;
        } `]
                }
            });
            await TestBed.compileComponents();
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            const dummy = document.createElement('div');
            dummy.setAttribute('style',
                'width:60px; height:60px; color:green; position: absolute; top: 3000px; left: 3000px;');
            document.body.appendChild(dummy);

            const targetEl: HTMLElement = <HTMLElement>document.getElementsByClassName('button')[0];
            const positionSettings2 = {
                target: targetEl
            };

            const overlaySettings: OverlaySettings = {
                positionStrategy: new ConnectedPositioningStrategy(positionSettings2),
                scrollStrategy: new NoOpScrollStrategy(),
                modal: false,
                closeOnOutsideClick: false
            };
            const overlay = fixture.componentInstance.overlay;

            overlay.show(SimpleDynamicComponent, overlaySettings);

            tick();
            const contentWrapper = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
            const element = contentWrapper.firstChild as HTMLElement;
            const elementRect = element.getBoundingClientRect();

            document.documentElement.scrollTop = 100;
            document.documentElement.scrollLeft = 50;
            document.dispatchEvent(new Event('scroll'));
            tick();

            expect(elementRect).toEqual(element.getBoundingClientRect());
            expect(document.documentElement.scrollTop).toEqual(100);
            expect(document.documentElement.scrollLeft).toEqual(50);
            document.body.removeChild(dummy);
        }));

        it('Should retain the component state when scrolling and block scroll strategy is used.', fakeAsync(async () => {
            TestBed.overrideComponent(EmptyPageComponent, {
                set: {
                    styles: [`button { position: absolute, bottom: -2000px; } `]
                }
            });
            await TestBed.compileComponents();
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            const scrollStrat = new BlockScrollStrategy();
            fixture.detectChanges();
            const overlaySettings: OverlaySettings = {
                positionStrategy: new ConnectedPositioningStrategy(),
                scrollStrategy: scrollStrat,
                modal: false,
                closeOnOutsideClick: false
            };
            const overlay = fixture.componentInstance.overlay;
            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            expect(document.documentElement.scrollTop).toEqual(0);
            document.dispatchEvent(new Event('scroll'));
            tick();
            expect(document.documentElement.scrollTop).toEqual(0);

            document.documentElement.scrollTop += 25;
            document.dispatchEvent(new Event('scroll'));
            tick();
            expect(document.documentElement.scrollTop).toEqual(0);

            document.documentElement.scrollTop += 1000;
            document.dispatchEvent(new Event('scroll'));
            tick();
            expect(document.documentElement.scrollTop).toEqual(0);
            expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(1);
            scrollStrat.detach();
        }));

        it(`Should show the component, AutoPositionStrategy, inside of the viewport if it would normally be outside of bounds,
            TOP + LEFT.`, fakeAsync(async () => {
            TestBed.overrideComponent(DownRightButtonComponent, {
                set: {
                    styles: [`button {
            position: absolute;
            top: 16px;
            left: 16px;
            width: 84px;
            height: 84px;
            padding: 0px;
            margin: 0px;
            border: 0px;
        } `]
                }
            });
            await TestBed.compileComponents();
            const fix = TestBed.createComponent(DownRightButtonComponent);
            fix.detectChanges();

            fix.componentInstance.positionStrategy = new AutoPositionStrategy();
            UIInteractions.clearOverlay();
            fix.detectChanges();
            const currentElement = fix.componentInstance;
            const buttonElement = fix.componentInstance.buttonElement.nativeElement;
            fix.detectChanges();
            currentElement.ButtonPositioningSettings.horizontalDirection = HorizontalAlignment.Left;
            currentElement.ButtonPositioningSettings.verticalDirection = VerticalAlignment.Top;
            currentElement.ButtonPositioningSettings.verticalStartPoint = VerticalAlignment.Top;
            currentElement.ButtonPositioningSettings.horizontalStartPoint = HorizontalAlignment.Left;
            currentElement.ButtonPositioningSettings.target = buttonElement;
            buttonElement.click();
            fix.detectChanges();
            tick();

            fix.detectChanges();
            const wrappers = document.getElementsByClassName(CLASS_OVERLAY_CONTENT);
            const wrapperContent = wrappers[wrappers.length - 1] as HTMLElement;
            const expectedStyle = 'width:100px; height: 100px; background-color: red';
            expect(wrapperContent.lastElementChild.lastElementChild.getAttribute('style')).toEqual(expectedStyle);
            const buttonLeft = buttonElement.offsetLeft;
            const buttonTop = buttonElement.offsetTop;
            const expectedLeft = buttonLeft + buttonElement.clientWidth; // To the right of the button
            const expectedTop = buttonTop + buttonElement.clientHeight; // Bottom of the button
            const wrapperLeft = wrapperContent.getBoundingClientRect().left;
            const wrapperTop = wrapperContent.getBoundingClientRect().top;
            expect(wrapperTop).toEqual(expectedTop);
            expect(wrapperLeft).toEqual(expectedLeft);
        }));

        it(`Should show the component, AutoPositionStrategy, inside of the viewport if it would normally be outside of bounds,
            TOP + RIGHT.`, fakeAsync(async () => {
            TestBed.overrideComponent(DownRightButtonComponent, {
                set: {
                    styles: [`button {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 84px;
            height: 84px;
            padding: 0px;
            margin: 0px;
            border: 0px;
        } `]
                }
            });
            await TestBed.compileComponents();
            const fix = TestBed.createComponent(DownRightButtonComponent);
            fix.detectChanges();

            fix.componentInstance.positionStrategy = new AutoPositionStrategy();
            UIInteractions.clearOverlay();
            fix.detectChanges();
            const currentElement = fix.componentInstance;
            const buttonElement = fix.componentInstance.buttonElement.nativeElement;
            fix.detectChanges();
            currentElement.ButtonPositioningSettings.horizontalDirection = HorizontalAlignment.Left;
            currentElement.ButtonPositioningSettings.verticalDirection = VerticalAlignment.Top;
            currentElement.ButtonPositioningSettings.verticalStartPoint = VerticalAlignment.Top;
            currentElement.ButtonPositioningSettings.horizontalStartPoint = HorizontalAlignment.Left;
            currentElement.ButtonPositioningSettings.target = buttonElement;
            buttonElement.click();
            fix.detectChanges();
            tick();

            fix.detectChanges();
            const wrappers = document.getElementsByClassName(CLASS_OVERLAY_CONTENT);
            const wrapperContent = wrappers[wrappers.length - 1] as HTMLElement;
            const expectedStyle = 'width:100px; height: 100px; background-color: red';
            expect(wrapperContent.lastElementChild.lastElementChild.getAttribute('style')).toEqual(expectedStyle);
            const buttonLeft = buttonElement.offsetLeft;
            const buttonTop = buttonElement.offsetTop;
            const expectedRight = buttonLeft; // To the left of the button
            const expectedTop = buttonTop + buttonElement.clientHeight; // Bottom of the button
            const wrapperRight = wrapperContent.getBoundingClientRect().right;
            const wrapperTop = wrapperContent.getBoundingClientRect().top;
            expect(wrapperTop).toEqual(expectedTop);
            expect(wrapperRight).toEqual(expectedRight);
        }));

        it(`Should show the component, AutoPositionStrategy, inside of the viewport if it would normally be outside of bounds,
            TOP + RIGHT.`, fakeAsync(async () => {
            TestBed.overrideComponent(DownRightButtonComponent, {
                set: {
                    styles: [`button {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 84px;
            height: 84px;
            padding: 0px;
            margin: 0px;
            border: 0px;
        } `]
                }
            });
            await TestBed.compileComponents();
            const fix = TestBed.createComponent(DownRightButtonComponent);
            fix.detectChanges();

            fix.componentInstance.positionStrategy = new AutoPositionStrategy();
            UIInteractions.clearOverlay();
            fix.detectChanges();
            const currentElement = fix.componentInstance;
            const buttonElement = fix.componentInstance.buttonElement.nativeElement;
            currentElement.ButtonPositioningSettings.horizontalDirection = HorizontalAlignment.Right;
            currentElement.ButtonPositioningSettings.verticalDirection = VerticalAlignment.Top;
            currentElement.ButtonPositioningSettings.verticalStartPoint = VerticalAlignment.Top;
            currentElement.ButtonPositioningSettings.horizontalStartPoint = HorizontalAlignment.Right;
            currentElement.ButtonPositioningSettings.target = buttonElement;
            buttonElement.click();
            fix.detectChanges();
            tick();

            fix.detectChanges();
            const wrappers = document.getElementsByClassName(CLASS_OVERLAY_CONTENT);
            const contentElement = wrappers[wrappers.length - 1] as HTMLElement; // wrapper in NG-COMPONENT
            const expectedStyle = 'width:100px; height: 100px; background-color: red';
            expect(contentElement.lastElementChild.lastElementChild.getAttribute('style')).toEqual(expectedStyle);
            const expectedRight = buttonElement.offsetLeft;
            const expectedTop = buttonElement.offsetTop + buttonElement.clientHeight;
            const contentElementRect = contentElement.getBoundingClientRect();
            const wrapperRight = contentElementRect.right;
            const wrapperTop = contentElementRect.top;
            expect(wrapperTop).toEqual(expectedTop);
            expect(wrapperRight).toEqual(expectedRight);
        }));

        it(`Should show the component, AutoPositionStrategy, inside of the viewport if it would normally be outside of bounds,
            BOTTOM + LEFT.`, fakeAsync(async () => {
            TestBed.overrideComponent(DownRightButtonComponent, {
                set: {
                    styles: [`button {
            position: absolute;
            bottom: 16px;
            left: 16px;
            width: 84px;
            height: 84px;
            padding: 0px;
            margin: 0px;
            border: 0px;
        } `]
                }
            });
            await TestBed.compileComponents();
            const fix = TestBed.createComponent(DownRightButtonComponent);
            fix.detectChanges();

            fix.componentInstance.positionStrategy = new AutoPositionStrategy();
            UIInteractions.clearOverlay();
            fix.detectChanges();
            const currentElement = fix.componentInstance;
            const buttonElement = fix.componentInstance.buttonElement.nativeElement;
            fix.detectChanges();
            currentElement.ButtonPositioningSettings.horizontalDirection = HorizontalAlignment.Left;
            currentElement.ButtonPositioningSettings.verticalDirection = VerticalAlignment.Bottom;
            currentElement.ButtonPositioningSettings.verticalStartPoint = VerticalAlignment.Bottom;
            currentElement.ButtonPositioningSettings.horizontalStartPoint = HorizontalAlignment.Left;
            currentElement.ButtonPositioningSettings.target = buttonElement;
            buttonElement.click();
            tick();
            fix.detectChanges();

            fix.detectChanges();
            const wrappers = document.getElementsByClassName(CLASS_OVERLAY_CONTENT);
            const wrapperContent = wrappers[wrappers.length - 1] as HTMLElement;
            const expectedStyle = 'width:100px; height: 100px; background-color: red';
            expect(wrapperContent.lastElementChild.lastElementChild.getAttribute('style')).toEqual(expectedStyle);
            const buttonLeft = buttonElement.offsetLeft;
            const buttonTop = buttonElement.offsetTop;
            const expectedLeft = buttonLeft + buttonElement.clientWidth; // To the right of the button
            const expectedTop = buttonTop - wrapperContent.lastElementChild.clientHeight; // On top of the button
            const wrapperLeft = wrapperContent.getBoundingClientRect().left;
            const wrapperTop = wrapperContent.getBoundingClientRect().top;
            expect(wrapperTop).toEqual(expectedTop);
            expect(wrapperLeft).toEqual(expectedLeft);
        }));

        it(`Should show the component, ElasticPositionStrategy, inside of the viewport if it would normally be outside of bounds,
            TOP + LEFT.`, fakeAsync(async () => {
            TestBed.overrideComponent(DownRightButtonComponent, {
                set: {
                    styles: [`button {
            position: absolute;
            top: 16px;
            left: 16px;
            width: 84px;
            height: 84px;
            padding: 0px;
            margin: 0px;
            border: 0px;
        } `]
                }
            });
            await TestBed.compileComponents();
            const fix = TestBed.createComponent(DownRightButtonComponent);
            fix.detectChanges();

            fix.componentInstance.positionStrategy = new ElasticPositionStrategy();
            UIInteractions.clearOverlay();
            fix.detectChanges();
            const currentElement = fix.componentInstance;
            const buttonElement = fix.componentInstance.buttonElement.nativeElement;
            currentElement.ButtonPositioningSettings.horizontalDirection = HorizontalAlignment.Left;
            currentElement.ButtonPositioningSettings.verticalDirection = VerticalAlignment.Top;
            currentElement.ButtonPositioningSettings.verticalStartPoint = VerticalAlignment.Top;
            currentElement.ButtonPositioningSettings.horizontalStartPoint = HorizontalAlignment.Left;
            currentElement.ButtonPositioningSettings.target = buttonElement;
            currentElement.ButtonPositioningSettings.minSize = { width: 80, height: 80 };
            buttonElement.click();
            tick();
            fix.detectChanges();

            const wrappers = document.getElementsByClassName(CLASS_OVERLAY_CONTENT);
            const wrapperContent = wrappers[wrappers.length - 1]; // wrapper in NG-COMPONENT
            const expectedRight = buttonElement.offsetLeft;
            const expectedBottom = buttonElement.offsetTop;
            const componentRect = wrapperContent.getBoundingClientRect();
            expect(componentRect.right).toEqual(expectedRight);
            expect(componentRect.bottom).toEqual(expectedBottom);
        }));

        it(`Should show the component, ElasticPositionStrategy, inside of the viewport if it would normally be outside of bounds,
            TOP + RIGHT.`, fakeAsync(async () => {
            TestBed.overrideComponent(DownRightButtonComponent, {
                set: {
                    styles: [`button {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 84px;
            height: 84px;
            padding: 0px;
            margin: 0px;
            border: 0px;
        } `]
                }
            });
            await TestBed.compileComponents();
            const fix = TestBed.createComponent(DownRightButtonComponent);
            fix.detectChanges();

            fix.componentInstance.positionStrategy = new ElasticPositionStrategy();
            UIInteractions.clearOverlay();
            fix.detectChanges();
            const currentElement = fix.componentInstance;
            const buttonElement = fix.componentInstance.buttonElement.nativeElement;
            fix.detectChanges();
            currentElement.ButtonPositioningSettings.horizontalDirection = HorizontalAlignment.Right;
            currentElement.ButtonPositioningSettings.verticalDirection = VerticalAlignment.Top;
            currentElement.ButtonPositioningSettings.verticalStartPoint = VerticalAlignment.Top;
            currentElement.ButtonPositioningSettings.horizontalStartPoint = HorizontalAlignment.Right;
            currentElement.ButtonPositioningSettings.target = buttonElement;
            currentElement.ButtonPositioningSettings.minSize = { width: 80, height: 80 };
            buttonElement.click();
            fix.detectChanges();
            tick();
            fix.detectChanges();

            const wrappers = document.getElementsByClassName(CLASS_OVERLAY_CONTENT);
            const wrapperContent = wrappers[wrappers.length - 1]; // wrapper in NG-COMPONENT
            const expectedLeft = buttonElement.offsetLeft + buttonElement.clientWidth;
            const expectedTop = buttonElement.offsetTop - currentElement.ButtonPositioningSettings.minSize.height;
            const componentRect = wrapperContent.lastElementChild.getBoundingClientRect();
            expect(componentRect.left).toEqual(expectedLeft);
            expect(componentRect.top).toEqual(expectedTop);
        }));

        it(`Should show the component, ElasticPositionStrategy, inside of the viewport if it would normally be outside of bounds,
            BOTTOM + LEFT.`, fakeAsync(async () => {
            TestBed.overrideComponent(DownRightButtonComponent, {
                set: {
                    styles: [`button {
            position: absolute;
            bottom: 16px;
            left: 16px;
            width: 84px;
            height: 84px;
            padding: 0px;
            margin: 0px;
            border: 0px;
        } `]
                }
            });
            await TestBed.compileComponents();
            const fix = TestBed.createComponent(DownRightButtonComponent);
            fix.detectChanges();

            fix.componentInstance.positionStrategy = new ElasticPositionStrategy();
            UIInteractions.clearOverlay();
            fix.detectChanges();
            const currentElement = fix.componentInstance;
            const buttonElement = fix.componentInstance.buttonElement.nativeElement;
            currentElement.ButtonPositioningSettings.horizontalDirection = HorizontalAlignment.Left;
            currentElement.ButtonPositioningSettings.verticalDirection = VerticalAlignment.Bottom;
            currentElement.ButtonPositioningSettings.verticalStartPoint = VerticalAlignment.Bottom;
            currentElement.ButtonPositioningSettings.horizontalStartPoint = HorizontalAlignment.Left;
            currentElement.ButtonPositioningSettings.target = buttonElement;
            currentElement.ButtonPositioningSettings.minSize = { width: 80, height: 80 };
            buttonElement.click();
            tick();
            fix.detectChanges();

            const wrappers = document.getElementsByClassName(CLASS_OVERLAY_CONTENT);
            const contentElement = wrappers[wrappers.length - 1];
            const expectedRight = buttonElement.offsetLeft;
            const expectedTop = buttonElement.offsetTop + buttonElement.offsetHeight;
            const componentRect = contentElement.getBoundingClientRect();
            expect(componentRect.right).toEqual(expectedRight);
            expect(componentRect.top).toEqual(expectedTop);
        }));

        // 2. Scroll Strategy (test with GlobalPositionStrategy(default))
        // 2.1. Scroll Strategy - None
        it('Should not scroll component, nor the window when none scroll strategy is passed. No scrolling happens.', fakeAsync(async () => {
            TestBed.overrideComponent(EmptyPageComponent, {
                set: {
                    styles: [`button {
            position: absolute;
            top: 120%;
            left: 120%;
        } `]
                }
            });
            await TestBed.compileComponents();
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            const overlaySettings: OverlaySettings = {
                modal: false,
            };
            const overlay = fixture.componentInstance.overlay;
            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            const contentWrapper = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
            const element = contentWrapper.firstChild as HTMLElement;
            const elementRect = element.getBoundingClientRect();

            document.documentElement.scrollTop = 100;
            document.documentElement.scrollLeft = 50;
            document.dispatchEvent(new Event('scroll'));
            tick();

            expect(elementRect).toEqual(element.getBoundingClientRect());
            expect(document.documentElement.scrollTop).toEqual(100);
            expect(document.documentElement.scrollLeft).toEqual(50);
            overlay.hideAll();
        }));

        it(`Should not close the shown component when none scroll strategy is passed.
        (example: expanded DropDown stays expanded during a scrolling attempt.)`,
            fakeAsync(async () => {
                TestBed.overrideComponent(EmptyPageComponent, {
                    set: {
                        styles: [`button {
            position: absolute;
            top: 120%;
            left: 120%;
        } `]
                    }
                });
                await TestBed.compileComponents();
                const fixture = TestBed.createComponent(EmptyPageComponent);
                fixture.detectChanges();

                const overlaySettings: OverlaySettings = {
                    modal: false,
                };
                const overlay = fixture.componentInstance.overlay;

                overlay.show(SimpleDynamicComponent, overlaySettings);
                tick();
                const contentWrapper = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
                const element = contentWrapper.firstChild as HTMLElement;
                const elementRect = element.getBoundingClientRect();

                document.documentElement.scrollTop = 40;
                document.documentElement.scrollLeft = 30;
                document.dispatchEvent(new Event('scroll'));
                tick();

                expect(elementRect).toEqual(element.getBoundingClientRect());
                expect(document.documentElement.scrollTop).toEqual(40);
                expect(document.documentElement.scrollLeft).toEqual(30);
                expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(1);
            }));

        // 2.2 Scroll Strategy - Closing. (Uses a tolerance and closes an expanded component upon scrolling if the tolerance is exceeded.)
        // (example: DropDown or Dialog component collapse/closes after scrolling 10px.)
        it('Should scroll until the set threshold is exceeded, and closing scroll strategy is used.',
            fakeAsync(async () => {
                TestBed.overrideComponent(EmptyPageComponent, {
                    set: {
                        styles: [
                            'button { position: absolute; top: 100%; left: 90% }'
                        ]
                    }
                });
                await TestBed.compileComponents();
                const fixture = TestBed.createComponent(EmptyPageComponent);
                fixture.detectChanges();

                const scrollTolerance = 10;
                const scrollStrategy = new CloseScrollStrategy();
                const overlay = fixture.componentInstance.overlay;
                const overlaySettings: OverlaySettings = {
                    positionStrategy: new GlobalPositionStrategy(),
                    scrollStrategy: scrollStrategy,
                    modal: false
                };

                overlay.show(SimpleDynamicComponent, overlaySettings);
                tick();

                document.documentElement.scrollTop = scrollTolerance;
                document.dispatchEvent(new Event('scroll'));
                tick();
                expect(document.documentElement.scrollTop).toEqual(scrollTolerance);
                expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(1);

                document.documentElement.scrollTop = scrollTolerance * 2;
                document.dispatchEvent(new Event('scroll'));
                tick();
                expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(0);

            }));

        it(`Should not change the shown component shown state until it exceeds the scrolling tolerance set,
            and closing scroll strategy is used.`,
            fakeAsync(async () => {
                TestBed.overrideComponent(EmptyPageComponent, {
                    set: {
                        styles: [
                            'button { position: absolute; top: 200%; left: 90% }'
                        ]
                    }
                });
                await TestBed.compileComponents();
                const fixture = TestBed.createComponent(EmptyPageComponent);
                fixture.detectChanges();

                const scrollTolerance = 10;
                const scrollStrategy = new CloseScrollStrategy();
                const overlay = fixture.componentInstance.overlay;
                const overlaySettings: OverlaySettings = {
                    positionStrategy: new GlobalPositionStrategy(),
                    scrollStrategy: scrollStrategy,
                    closeOnOutsideClick: false,
                    modal: false
                };

                overlay.show(SimpleDynamicComponent, overlaySettings);
                tick();
                expect(document.documentElement.scrollTop).toEqual(0);

                document.documentElement.scrollTop += scrollTolerance;
                document.dispatchEvent(new Event('scroll'));
                tick();
                expect(document.documentElement.scrollTop).toEqual(scrollTolerance);
                expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(1);
                fixture.destroy();
            }));

        it(`Should close the shown component shown when it exceeds the scrolling threshold set, and closing scroll strategy is used.
            (an expanded DropDown, Menu, DatePicker, etc.collapses).`, fakeAsync(async () => {
            TestBed.overrideComponent(EmptyPageComponent, {
                set: {
                    styles: [
                        'button { position: absolute; top: 100%; left: 90% }'
                    ]
                }
            });
            await TestBed.compileComponents();
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            const scrollTolerance = 10;
            const scrollStrategy = new CloseScrollStrategy();
            const overlay = fixture.componentInstance.overlay;
            const overlaySettings: OverlaySettings = {
                positionStrategy: new GlobalPositionStrategy(),
                scrollStrategy: scrollStrategy,
                modal: false
            };

            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            expect(document.documentElement.scrollTop).toEqual(0);

            document.documentElement.scrollTop += scrollTolerance;
            document.dispatchEvent(new Event('scroll'));
            tick();
            expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(1);
            expect(document.documentElement.scrollTop).toEqual(scrollTolerance);

            document.documentElement.scrollTop += scrollTolerance * 2;
            document.dispatchEvent(new Event('scroll'));
            tick();
            expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(0);
        }));

        // 2.3 Scroll Strategy - NoOp.
        it('Should retain the component static and only the background scrolls, when scrolling and noOP scroll strategy is used.',
            fakeAsync(async () => {
                TestBed.overrideComponent(EmptyPageComponent, {
                    set: {
                        styles: [
                            'button { position: absolute; top: 200%; left: 90%; }'
                        ]
                    }
                });
                await TestBed.compileComponents();
                const fixture = TestBed.createComponent(EmptyPageComponent);
                fixture.detectChanges();

                const scrollTolerance = 10;
                const scrollStrategy = new NoOpScrollStrategy();
                const overlay = fixture.componentInstance.overlay;
                const overlaySettings: OverlaySettings = {
                    modal: false,
                    scrollStrategy: scrollStrategy,
                    positionStrategy: new GlobalPositionStrategy()
                };

                overlay.show(SimpleDynamicComponent, overlaySettings);
                tick();
                expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(1);

                const contentWrapper = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
                const element = contentWrapper.firstChild as HTMLElement;
                const elementRect = element.getBoundingClientRect();

                document.documentElement.scrollTop += scrollTolerance;
                document.dispatchEvent(new Event('scroll'));
                tick();
                expect(document.documentElement.scrollTop).toEqual(scrollTolerance);
                expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(1);
                expect(element.getBoundingClientRect()).toEqual(elementRect);
            }));

        // 2.4. Scroll Strategy - Absolute.
        it('Should scroll everything except component when scrolling and absolute scroll strategy is used.', fakeAsync(async () => {

            // Should behave as NoOpScrollStrategy
            TestBed.overrideComponent(EmptyPageComponent, {
                set: {
                    styles: [
                        'button { position: absolute; top:200%; left: 100%; }',
                    ]
                }
            });
            await TestBed.compileComponents();
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            const scrollTolerance = 10;
            const scrollStrategy = new NoOpScrollStrategy();
            const overlay = fixture.componentInstance.overlay;
            const overlaySettings: OverlaySettings = {
                closeOnOutsideClick: false,
                modal: false,
                positionStrategy: new ConnectedPositioningStrategy(),
                scrollStrategy: scrollStrategy
            };

            overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            expect(document.getElementsByClassName(CLASS_OVERLAY_WRAPPER).length).toEqual(1);

            const contentWrapper = document.getElementsByClassName(CLASS_OVERLAY_CONTENT)[0];
            const element = contentWrapper.firstChild as HTMLElement;
            const elementRect = element.getBoundingClientRect() as DOMRect;

            document.documentElement.scrollTop += scrollTolerance;
            document.dispatchEvent(new Event('scroll'));
            tick();
            const newElementRect = element.getBoundingClientRect() as DOMRect;
            expect(document.documentElement.scrollTop).toEqual(scrollTolerance);
            expect(newElementRect.top).toEqual(elementRect.top);
        }));

        it('Should collapse/close the component when click outside it (DropDown, DatePicker, NavBar etc.)', fakeAsync(async () => {
            // TO DO replace Spies with css class and/or getBoundingClientRect.
            TestBed.overrideComponent(EmptyPageComponent, {
                set: {
                    styles: [
                        'button { position: absolute; top: 90%; left: 100%; }'
                    ]
                }
            });
            await TestBed.compileComponents();
            const fixture = TestBed.createComponent(EmptyPageComponent);
            fixture.detectChanges();

            const overlay = fixture.componentInstance.overlay;
            const overlaySettings: OverlaySettings = {
                modal: false,
                closeOnOutsideClick: true,
                positionStrategy: new GlobalPositionStrategy()
            };

            spyOn(overlay, 'show').and.callThrough();
            spyOn(overlay.onClosing, 'emit');

            const firstCallId = overlay.show(SimpleDynamicComponent, overlaySettings);
            tick();
            expect(overlay.show).toHaveBeenCalledTimes(1);
            expect(overlay.onClosing.emit).toHaveBeenCalledTimes(0);

            fixture.componentInstance.buttonElement.nativeElement.click();
            tick();
            expect(overlay.onClosing.emit).toHaveBeenCalledTimes(1);
            expect(overlay.onClosing.emit)
                .toHaveBeenCalledWith({
                    id: firstCallId, componentRef: jasmine.any(ComponentRef), cancel: false,
                    event: new MouseEvent('click')
                });
        }));

    });

    describe('Integration tests p3 (IgniteUI components): ', () => {
        beforeEach(async(() => {
            TestBed.configureTestingModule({
                imports: [IgxToggleModule, DynamicModule, NoopAnimationsModule, IgxComponentsModule],
                declarations: DIRECTIVE_COMPONENTS
            }).compileComponents();
        }));
        it(`Should properly be able to render components that have no initial content(IgxCalendar, IgxAvatar)`, fakeAsync(() => {
            const fixture = TestBed.createComponent(SimpleRefComponent);
            fixture.detectChanges();
            const IGX_CALENDAR_CLASS = `.igx-calendar`;
            const IGX_AVATAR_CLASS = `.igx-avatar`;
            const IGX_DATEPICKER_CLASS = `.igx-date-picker`;
            const overlay = fixture.componentInstance.overlay;
            expect(document.querySelectorAll((IGX_CALENDAR_CLASS)).length).toEqual(0);
            expect(document.querySelectorAll((IGX_AVATAR_CLASS)).length).toEqual(0);
            expect(document.querySelectorAll((IGX_DATEPICKER_CLASS)).length).toEqual(0);
            overlay.show(IgxCalendarComponent);
            // EXPECT
            fixture.detectChanges();
            expect(document.querySelectorAll((IGX_CALENDAR_CLASS)).length).toEqual(2);
            overlay.hideAll();
            tick();
            fixture.detectChanges();
            expect(document.querySelectorAll((IGX_CALENDAR_CLASS)).length).toEqual(0);
            // Expect
            overlay.show(IgxAvatarComponent);
            fixture.detectChanges();
            expect(document.querySelectorAll((IGX_AVATAR_CLASS)).length).toEqual(1);
            // Expect
            overlay.hideAll();
            tick();
            fixture.detectChanges();
            expect(document.querySelectorAll((IGX_AVATAR_CLASS)).length).toEqual(0);
            overlay.show(IgxCalendarContainerComponent);
            fixture.detectChanges();
            expect(document.querySelectorAll((IGX_DATEPICKER_CLASS)).length).toEqual(1);
            overlay.hideAll();
            tick();
            fixture.detectChanges();
            expect(document.querySelectorAll((IGX_DATEPICKER_CLASS)).length).toEqual(0);
            // Expect
        }));
    });
});
@Component({
    // tslint:disable-next-line:component-selector
    selector: `simple - dynamic - component`,
    template: '<div style=\'width:100px; height: 100px; background-color: red\'></div>'
})
export class SimpleDynamicComponent {
    @HostBinding('style.display')
    public hostDisplay = 'block';
    @HostBinding('style.width')
    @HostBinding('style.height')
    public hostDimenstions = '100px';
}

@Component({
    template: `<div #item class="simpleRef" style='position: absolute; width:100px; height: 100px; background-color: red'></div>`
})
export class SimpleRefComponent {
    @ViewChild('item', { static: true })
    public item: ElementRef;

    constructor(@Inject(IgxOverlayService) public overlay: IgxOverlayService) { }
}

@Component({
    template: '<div style=\'width:3000px; height: 1000px; background-color: red\'></div>'
})
export class SimpleBigSizeComponent {
    @HostBinding('style.display')
    public hostDisplay = 'block';
    @HostBinding('style.height')
    public hostHeight = '1000px';
    @HostBinding('style.width')
    public hostWidth = '3000px';
}

@Component({
    template: `
            <div igxToggle>
                <div class='scrollableDiv' *ngIf='visible' style ='position: absolute; width: 200px; height: 200px;
        overflow-y: scroll; background-color: red;'>
            <p> AAAAA </p>
            <p> AAAAA </p>
            <p> AAAAA </p>
            <p> AAAAA </p>
            <p> AAAAA </p>
            <p> AAAAA </p>
            <p> AAAAA </p>
            <p> AAAAA </p>
            <p> AAAAA </p>
            </div>
            </div>`
})
export class SimpleDynamicWithDirectiveComponent {
    public visible = false;

    @ViewChild(IgxToggleDirective, { static: true })
    private _overlay: IgxToggleDirective;

    public get overlay(): IgxToggleDirective {
        return this._overlay;
    }

    show(overlaySettings?: OverlaySettings) {
        this.visible = true;
        this.overlay.open(overlaySettings);
    }

    hide() {
        this.visible = false;
        this.overlay.close();
    }
}

@Component({
    template: `
        <button #button (click)='click()' class='button'>Show Overlay</button>
        <div #div></div>
    `,
    styles: [`button {
        position: absolute;
        top: 0;
        left: 0;
        width: 84px;
        height: 84px;
        padding: 0;
        margin: 0;
        border: none;
    }`]
})
export class EmptyPageComponent {
    constructor(@Inject(IgxOverlayService) public overlay: IgxOverlayService) { }

    @ViewChild('button', { static: true }) buttonElement: ElementRef;
    @ViewChild('div', { static: true }) divElement: ElementRef;

    click() {
        this.overlay.show(SimpleDynamicComponent);
    }
}

@Component({
    template: `<button #button (click)='click($event)'>Show Overlay</button>`,
    styles: [`button {
        position: absolute;
        bottom: 0px;
        right: 0px;
        width: 84px;
        height: 84px;
        padding: 0px;
        margin: 0px;
        border: 0px;
    }`]
})
export class DownRightButtonComponent {
    constructor(@Inject(IgxOverlayService) public overlay: IgxOverlayService) { }

    public positionStrategy: IPositionStrategy;

    @ViewChild('button', { static: true }) buttonElement: ElementRef;

    public ButtonPositioningSettings: PositionSettings = {
        horizontalDirection: HorizontalAlignment.Right,
        verticalDirection: VerticalAlignment.Bottom,
        target: null,
        horizontalStartPoint: HorizontalAlignment.Left,
        verticalStartPoint: VerticalAlignment.Top
    };

    click(event) {
        this.positionStrategy.settings = this.ButtonPositioningSettings;
        this.overlay.show(SimpleDynamicComponent, {
            positionStrategy: this.positionStrategy,
            scrollStrategy: new NoOpScrollStrategy(),
            modal: false,
            closeOnOutsideClick: false
        });
    }
}
@Component({
    template: `<button class='300_button' #button (click)='click()'>Show Overlay</button>`,
    styles: [`button {
        position: absolute;
        top: 300px;
        left: 300px;
        width: 100px;
        height: 60px;
        border: 0px;
    }`]
})
export class TopLeftOffsetComponent {

    constructor(@Inject(IgxOverlayService) public overlay: IgxOverlayService) { }

    @ViewChild('button', { static: true }) buttonElement: ElementRef;
    click() {
        this.overlay.show(SimpleDynamicComponent);
    }
}

@Component({
    template: `
    <div>
        <button class='buttonOne' (click)=\'clickOne($event)\'>Show first Overlay</button>
    </div>
    <div (click)=\'divClick($event)\'>
        <button class='buttonTwo' (click)=\'clickTwo($event)\'>Show second Overlay</button>
    </div>`
})
export class TwoButtonsComponent {
    private _setting: OverlaySettings = { modal: false };

    constructor(@Inject(IgxOverlayService) public overlay: IgxOverlayService) { }

    clickOne() {
        this.overlay.show(SimpleDynamicComponent, this._setting);
    }

    clickTwo() {
        this.overlay.show(SimpleDynamicComponent, this._setting);
    }

    divClick(ev: Event) {
        ev.stopPropagation();
    }
}

@Component({
    template: `
    <div style="width: 420px; height: 280px;">
        <button class='300_button' igxToggle #button (click)='click($event)'>Show Overlay</button>
        <div #myCustomComponent class="customList" style="width: 100%; height: 100%;">
            Some Content
        </div>
    </div>`,
    styles: [`button {
        position: absolute;
        top: 300px;
        left: 300px;
        width: 100px;
        height: 60px;
        border: 0;
    }`]
})
export class WidthTestOverlayComponent {

    constructor(
        @Inject(IgxOverlayService) public overlay: IgxOverlayService,
        public elementRef: ElementRef
    ) { }

    @ViewChild('button', { static: true }) buttonElement: ElementRef;
    @ViewChild('myCustomComponent', { static: true }) customComponent: ElementRef;
    public overlaySettings: OverlaySettings = {};
    click(event) {
        this.overlaySettings.positionStrategy = new ConnectedPositioningStrategy();
        this.overlaySettings.scrollStrategy = new NoOpScrollStrategy();
        this.overlaySettings.closeOnOutsideClick = true;
        this.overlaySettings.modal = false;

        this.overlaySettings.positionStrategy.settings.target = this.buttonElement.nativeElement;
        this.overlay.show(this.customComponent, this.overlaySettings);
    }
}

@Component({
    template: `
    <div igxToggle>
        <div class='scrollableDiv' *ngIf='visible' style='width:200px; height:200px; overflow-y:scroll;'>
            <p>AAAAA</p>
            <p>AAAAA</p>
            <p>AAAAA</p>
            <p>AAAAA</p>
            <p>AAAAA</p>
            <p>AAAAA</p>
            <p>AAAAA</p>
            <p>AAAAA</p>
            <p>AAAAA</p>
        </div>
    </div>`
})
export class ScrollableComponent {
    public visible = false;

    @ViewChild(IgxToggleDirective, { static: true })
    private _toggle: IgxToggleDirective;

    public get toggle(): IgxToggleDirective {
        return this._toggle;
    }

    show() {
        this.visible = true;
        const settings: OverlaySettings = { scrollStrategy: new CloseScrollStrategy() };
        this.toggle.open(settings);
    }

    hide() {
        this.toggle.close();
        this.visible = false;
    }

}

@Component({
    template: `
    <div style='display:flex; width:100%; height:500px; justify-content:center;'>
        <button #button style='display:inline-flex; width:150px; height:30px;' (click)='click()' class='button'>
            Show Overlay
        </button>
    </div>
    `
})
export class FlexContainerComponent {
    public overlaySettings: OverlaySettings = {};
    constructor(@Inject(IgxOverlayService) public overlay: IgxOverlayService) { }

    @ViewChild('button', { static: true }) buttonElement: ElementRef;
    click() {
        this.overlay.show(SimpleDynamicComponent, this.overlaySettings);
    }
}

const DYNAMIC_COMPONENTS = [
    EmptyPageComponent,
    SimpleRefComponent,
    SimpleDynamicComponent,
    SimpleBigSizeComponent,
    DownRightButtonComponent,
    TopLeftOffsetComponent,
    TwoButtonsComponent,
    WidthTestOverlayComponent,
    ScrollableComponent,
    FlexContainerComponent
];

const IgniteUIComponents = [
    IgxCalendarComponent,
    IgxAvatarComponent,
    IgxDatePickerComponent
];

const DIRECTIVE_COMPONENTS = [
    SimpleDynamicWithDirectiveComponent
];

@NgModule({
    imports: [BrowserModule],
    declarations: [DYNAMIC_COMPONENTS],
    exports: [DYNAMIC_COMPONENTS],
    entryComponents: [DYNAMIC_COMPONENTS]
})
export class DynamicModule { }

@NgModule({
    imports: [IgxCalendarModule, IgxAvatarModule, IgxDatePickerModule],
    entryComponents: IgniteUIComponents
})
export class IgxComponentsModule {
}
