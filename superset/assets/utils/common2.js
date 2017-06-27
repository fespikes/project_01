/**
 * Created by haitao on 17-6-15.
 */
export function getNewSlice(slice, selectedDashboards) {
    let obj = {};
    obj.id = slice.id;
    obj.slice_name = slice.slice_name;
    obj.description = slice.description;
    obj.dashboards = getSelectedDashboards(selectedDashboards, slice.available_dashboards);
    return obj;
}

export function getSelectedDashboards(selectedDashboards, availableDashboards) {
    let array = [];
    selectedDashboards.forEach(function(selected) {
        availableDashboards.forEach(function(dashboard) {
            if(selected === dashboard.id.toString()) {
                array.push(dashboard);
            }
        });
    });
    return array;
}

export function getNewDashboard(dashboard, selectedSlices) {
    let obj = {};
    obj.id = dashboard.id;
    obj.dashboard_title = dashboard.dashboard_title;
    obj.description = dashboard.description;
    obj.slices = getSelectedSlices(selectedSlices, dashboard.available_slices);
    return obj;
}

export function getSelectedSlices(selectedSlices, availableSlices) {
    let array = [];
    selectedSlices.forEach(function(selected) {
        availableSlices.forEach(function(slice) {
            if(selected === slice.id.toString()) {
                array.push(slice);
            }
        });
    });
    return array;
}

export function constructTreeData(entities, isLeaf, category) {
    let nodeData = [];
    entities.map(entity => {
        var node = {};
        node.label = entity;
        node.value = entity;
        node.key = entity;
        node.isLeaf = isLeaf;
        node.category = category;
        nodeData.push(node);
    });
    return nodeData;
}

export function appendTreeData(schemaAppended, tables, treeData) {
    treeData.map(schema => {
        if(schema.value === schemaAppended) {
            schema.children = constructTreeData(tables, true, 'file');
        }
    });
    return treeData;
}