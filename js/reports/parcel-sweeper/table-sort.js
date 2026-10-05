import { formatParcelOperatorName } from "./model.js";

const parcelPackageColumns = ["operator", "trackingNumber"];
const parcelPackageCollator = new Intl.Collator("pt-BR", {
    numeric: true,
    sensitivity: "base",
});

function toggleParcelPackageSort(sort, column) {
    if (!parcelPackageColumns.includes(column)) {
        return sort;
    }

    return {
        column,
        direction: sort?.column === column && sort.direction === "asc"
            ? "desc"
            : "asc",
    };
}

function sortParcelPackageRows(rows, sort) {
    const sortedRows = [...rows];
    if (!parcelPackageColumns.includes(sort?.column)) {
        return sortedRows;
    }

    const direction = sort.direction === "desc" ? -1 : 1;
    const values = new Map(sortedRows.map(row => [row,
        sort.column === "operator"
            ? formatParcelOperatorName(row.operator)
            : String(row.trackingNumber ?? ""),
    ]));

    return sortedRows.sort((first, second) => direction *
        parcelPackageCollator.compare(values.get(first), values.get(second)));
}

export { sortParcelPackageRows, toggleParcelPackageSort };
