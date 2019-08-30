import { IgxGridCellComponent } from '../cell.component';
import { GridBaseAPIService } from '../api.service';
import { ChangeDetectorRef, ElementRef, ChangeDetectionStrategy, Component,
     OnInit, HostListener, NgZone } from '@angular/core';
import { IgxHierarchicalGridComponent } from './hierarchical-grid.component';
import { IgxGridSelectionService, IgxGridCRUDService } from '../../core/grid-selection';
import { HammerGesturesManager } from '../../core/touch';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    preserveWhitespaces: false,
    selector: 'igx-hierarchical-grid-cell',
    templateUrl: './../cell.component.html',
    providers: [HammerGesturesManager]
})
export class IgxHierarchicalGridCellComponent extends IgxGridCellComponent implements OnInit {

    protected hSelection;
    protected _rootGrid;

    constructor(
        protected selectionService: IgxGridSelectionService,
        protected crudService: IgxGridCRUDService,
        public gridAPI: GridBaseAPIService<IgxHierarchicalGridComponent>,
        public cdr: ChangeDetectorRef,
        private helement: ElementRef,
        protected zone: NgZone,
        touchManager: HammerGesturesManager
        ) {
            super(selectionService, crudService, gridAPI, cdr, helement, zone, touchManager);
         }

    ngOnInit() {
        super.ngOnInit();
        this._rootGrid = this._getRootGrid();
    }

    private _getRootGrid() {
        let currGrid = this.grid;
        while (currGrid.parent) {
            currGrid = currGrid.parent;
        }
        return currGrid;
    }

    // TODO: Extend the new selection service to avoid complete traversal
    _clearAllHighlights() {
        [this._rootGrid, ...this._rootGrid.getChildGrids(true)].forEach(grid => {
            grid.selectionService.clear();
            grid.selectionService.activeElement = null;
            grid.nativeElement.classList.remove('igx-grid__tr--highlighted');
            grid.highlightedRowID = null;
            grid.cdr.markForCheck();
        });
    }

    /**
     * @hidden
     * @internal
     */
    @HostListener('focus', ['$event'])
    onFocus(event) {
        this._clearAllHighlights();
        const currentElement = this.grid.nativeElement;
        let parentGrid = this.grid;
        let childGrid;
        // add highligh to the current grid
        if (this._rootGrid.id !== currentElement.id) {
            currentElement.classList.add('igx-grid__tr--highlighted');
        }

        // add highligh to the current grid
        while (this._rootGrid.id !== parentGrid.id) {
            childGrid = parentGrid;
            parentGrid = parentGrid.parent;

            const parentRowID = parentGrid.hgridAPI.getParentRowId(childGrid);
            parentGrid.highlightedRowID = parentRowID;
        }
        super.onFocus(event);
    }

    // TODO: Refactor
    /**
     * @hidden
     * @internal
     */
    @HostListener('keydown', ['$event'])
    dispatchEvent(event: KeyboardEvent) {
        const key = event.key.toLowerCase();
        if (event.altKey && !this.row.added) {
            const grid = this.gridAPI.grid;
            const state = this.gridAPI.grid.hierarchicalState;
            const collapse = this.row.expanded && (key === 'left' || key === 'arrowleft' || key === 'up' || key === 'arrowup');
            const expand = !this.row.expanded && (key === 'right' || key === 'arrowright' || key === 'down' || key === 'arrowdown');
            if (collapse) {
                grid.hierarchicalState = state.filter(v => {
                    return v.rowID !== this.row.rowID;
                });
            } else if (expand) {
                state.push({ rowID: this.row.rowID });
                grid.hierarchicalState = [...state];
            }
            if (expand || collapse) {
                const rowID = this.cellID.rowID;
                grid.cdr.detectChanges();
                this.persistFocusedCell(rowID);
            }
            return;
        }
        super.dispatchEvent(event);
    }

    protected persistFocusedCell(rowID) {
        requestAnimationFrame(() => {
            // TODO: Test it out
            const cell = this.gridAPI.get_cell_by_key(rowID, this.column.field);
            if (cell) {
                cell.nativeElement.focus();
            }
        });
    }
}
