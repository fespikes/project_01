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
            if (selected === dashboard.id.toString()) {
                array.push(dashboard);
            }
        });
    });
    return array;
}

export function getNewDashboard(dashboard, selectedSliceObjs, available_slices) {
    let obj = {};
    obj.id = dashboard.id;
    obj.name = dashboard.name;
    obj.description = dashboard.description;
    obj.slices = selectedSliceObjs;
    return obj;
}

// deprecated,previously used by getNewDashboard to build obj.slices
export function getSelectedSlices(selectedSlices, availableSlices) {
    let array = [];
    let json = {};
    selectedSlices.forEach(function(selected, idx) {
        availableSlices.forEach(function(slice) {
            json[slice.slice_name] = true;
            if (selected === slice.slice_name.toString()) {
                array.push(slice);
            }

        });
        if (!json[selected]) {
            array.push({
                'selected': selected
            });
        }
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
        if (schema.value === schemaAppended) {
            schema.children = constructTreeData(tables, true, 'file');
        }
    });
    return treeData;
}