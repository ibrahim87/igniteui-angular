import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import {
    IgxRowIslandComponent,
    IgxHierarchicalGridComponent,
    IPathSegment,
    IGridCellEventArgs
} from 'igniteui-angular';

@Component({
    selector: 'app-hierarchical-grid-sample',
    styleUrls: ['hierarchical-grid.sample.css'],
    templateUrl: 'hierarchical-grid.sample.html'
})
export class HierarchicalGridSampleComponent {
    localData = [];
    localData1 = [];
    data1 = [];
    data2 = [];
    isRowSelectable = false;
    firstLevelExpanded = false;
    rootExpanded = false;
    density = 'comfortable';
    displayDensities;
    riToggle = true;
    hgridState = [];

    public columns;
    public childColumns;

    @ViewChild('layout1', { static: true })
    layout1: IgxRowIslandComponent;

    @ViewChild('hGrid', { static: true })
    hGrid: IgxHierarchicalGridComponent;

    constructor(private cdr: ChangeDetectorRef) {
        // this.localData.push({ ID: -1, Name: ''});
        // for (let i = 0; i < 10000; i++) {
        //     const prods = [];
        //     for (let j = 0; j < 3; j++) {
        //         prods.push({
        //         ID: j, ProductName: 'A' + i + '_' + j,
        //         SubProducts: [{ID: -2, ProductName: 'Test', SubSubProducts: [{ID: 100, ProductName: 'Test2'}]}]});
        //     }
        //     this.localData.push({ ID: i, Name: 'A' + i, Products: prods});
        // }

        this.displayDensities = [
            { label: 'compact', selected: this.density === 'compact', togglable: true },
            { label: 'cosy', selected: this.density === 'cosy', togglable: true },
            { label: 'comfortable', selected: this.density === 'comfortable', togglable: true }
        ];
        this.localData = this.generateDataUneven(100, 3);
        this.data1 = this.localData.slice(0, 10);
        this.data2 = this.localData.slice(10, 20);
        this.localData1 = this.data1;
        this.localData[0].hasChild = false;
        this.localData[1].hasChild = false;
        this.localData[2].childData[0].hasChild = false;
        this.localData[2].childData[1].hasChild = false;
    }

    ngAfterViewInit() {
        this.cdr.detectChanges();
    }

    generateData(count: number, level: number) {
        const prods = [];
        const currLevel = level;
        let children;
        for (let i = 0; i < count; i++) {
            if (level > 0) {
                children = this.generateData(count / 2, currLevel - 1);
            }
            prods.push({
                ID: i,
                ChildLevels: currLevel,
                ProductName: 'Product: A' + i,
                Col1: i,
                Col2: i,
                Col3: i,
                childData: children,
                childData2: children
            });
        }
        return prods;
    }

    getState() {
        console.log(this.hgridState);
    }

    generateDataUneven(count: number, level: number, parendID: string = null) {
        const prods = [];
        const currLevel = level;
        let children;
        for (let i = 0; i < count; i++) {
            const rowID = parendID ? parendID + i : i.toString();
            if (level > 0) {
                // Have child grids for row with even id less rows by not multiplying by 2
                children = this.generateDataUneven(((i % 2) + 1) * Math.round(count / 3), currLevel - 1, rowID);
            }
            prods.push({
                ID: rowID,
                ChildLevels: currLevel,
                ProductName: 'Product: A' + i,
                Col1: i,
                Col2: i,
                Col3: i,
                childData: children,
                childData2: children,
                hasChild: true
            });
        }
        return prods;
    }

    setterChange() {
        this.layout1.rowSelectable = !this.layout1.rowSelectable;
    }

    setterBindingChange() {
        this.isRowSelectable = !this.isRowSelectable;
    }

    toggleRootLevel() {
        this.rootExpanded = !this.rootExpanded;
    }

    toggleFirstIsland() {
        this.firstLevelExpanded = !this.firstLevelExpanded;
    }

    testApis() {}

    selectDensity(event) {
        this.density = this.displayDensities[event.index].label;
    }

    cellClick($evt: IGridCellEventArgs) {
        console.log('Cell Click', $evt);
    }

    public LoadMoreColumns() {
        this.columns = ['Col1', 'Col2', 'Col3'];
        this.childColumns = ['ChildCol1', 'ChildCol2'];
    }

    public changeData() {
        debugger;
        if (this.localData1 === this.data1) {
            this.localData1 = this.data2;
        } else {
            this.localData1 = this.data1;
        }
    }
}
