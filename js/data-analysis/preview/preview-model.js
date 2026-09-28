import {
    formatCellValue,
    naturalCollator,
    normalizeSearchValue,
    parseDateValue,
    parseNumericValue,
} from "../core/value-utils.js";

const PS_TASK_ORDER_FILE_PREFIX =
    "ps_task_order_";

const PS_TASK_ORDER_INITIAL_COLUMNS =
    new Set([
        "final status",
        "next step action",
        "count type",
        "operator",
    ]);

function getInitialVisibleColumns(
    dataset,
) {
    const sourceFileName =
        normalizeSearchValue(
            dataset.sourceFileName ?? "",
        ).trim();

    if (
        !sourceFileName.startsWith(
            PS_TASK_ORDER_FILE_PREFIX,
        )
    ) {
        return dataset.headers.map(
            function (
                unusedHeader,
                columnIndex,
            ) {
                return columnIndex;
            },
        );
    }

    return dataset.headers.reduce(
        function (
            selectedColumns,
            header,
            columnIndex,
        ) {
            const normalizedHeader =
                normalizeSearchValue(
                    header,
                ).trim();

            if (
                PS_TASK_ORDER_INITIAL_COLUMNS.has(
                    normalizedHeader,
                )
            ) {
                selectedColumns.push(
                    columnIndex,
                );
            }

            return selectedColumns;
        },
        [],
    );
}

function createEmptyFilter() {
    return {
        text: "",
        occurrence: "all",
        numericOperator: "",
        numericValue: "",
    };
}

function isFilterActive(filter) {
    return (
        normalizeSearchValue(
            filter.text,
        ).trim() !== "" ||
        filter.occurrence !== "all" ||
        (
            filter.numericOperator !== "" &&
            parseNumericValue(
                filter.numericValue,
            ) !== null
        )
    );
}

function createColumnValueCounts(
    rows,
    columnIndex,
) {
    const valueCounts =
        new Map();

    rows.forEach(
        function (row) {
            const normalizedValue =
                normalizeSearchValue(
                    row[columnIndex],
                ).trim();

            if (!normalizedValue) {
                return;
            }

            valueCounts.set(
                normalizedValue,
                (
                    valueCounts.get(
                        normalizedValue,
                    ) ?? 0
                ) + 1,
            );
        },
    );

    return valueCounts;
}

function matchesNumericFilter(
    value,
    operator,
    comparisonValue,
) {
    const numericValue =
        parseNumericValue(value);

    if (numericValue === null) {
        return false;
    }

    switch (operator) {
        case "greaterThan":
            return numericValue >
                comparisonValue;

        case "greaterThanOrEqual":
            return numericValue >=
                comparisonValue;

        case "lessThan":
            return numericValue <
                comparisonValue;

        case "lessThanOrEqual":
            return numericValue <=
                comparisonValue;

        case "equal":
            return numericValue ===
                comparisonValue;

        case "notEqual":
            return numericValue !==
                comparisonValue;

        default:
            return true;
    }
}

function createPreviewModel({
    initialRowLimit = "50",
} = {}) {
    let dataset = null;
    let filters = [];
    let columnValueCounts = [];
    let visibleColumns =
        new Set();
    let selectedFilterColumn =
        null;
    let sortColumn = null;
    let sortDirection = "asc";
    let rowLimit =
        initialRowLimit;
    let filteredRowsCache = null;

    function invalidateFilteredRows() {
        filteredRowsCache = null;
    }

    function hasColumn(
        columnIndex,
    ) {
        return Boolean(
            dataset &&
            Number.isInteger(
                columnIndex,
            ) &&
            columnIndex >= 0 &&
            columnIndex <
                dataset.columnCount,
        );
    }

    function resetFeatureState() {
        filters = [];
        columnValueCounts = [];
        visibleColumns =
            new Set();
        selectedFilterColumn =
            null;
        sortColumn = null;
        sortDirection = "asc";
        invalidateFilteredRows();
    }

    function setDataset(nextDataset) {
        dataset = nextDataset;

        resetFeatureState();

        if (!dataset) {
            return;
        }

        visibleColumns =
            new Set(
                getInitialVisibleColumns(
                    dataset,
                ),
            );

        filters =
            dataset.headers.map(
                createEmptyFilter,
            );

        columnValueCounts =
            dataset.headers.map(
                function (
                    unusedHeader,
                    columnIndex,
                ) {
                    return createColumnValueCounts(
                        dataset.rows,
                        columnIndex,
                    );
                },
            );
    }

    function getVisibleColumnIndexes() {
        return Array.from(
            visibleColumns,
        ).sort(
            function (
                firstColumn,
                secondColumn,
            ) {
                return firstColumn -
                    secondColumn;
            },
        );
    }

    function setColumnVisible(
        columnIndex,
        visible,
    ) {
        if (!hasColumn(columnIndex)) {
            return;
        }

        if (visible) {
            visibleColumns.add(
                columnIndex,
            );
        } else {
            visibleColumns.delete(
                columnIndex,
            );

            filters[columnIndex] =
                createEmptyFilter();

            if (
                selectedFilterColumn ===
                columnIndex
            ) {
                selectedFilterColumn =
                    null;
            }

            if (
                sortColumn ===
                columnIndex
            ) {
                sortColumn = null;
                sortDirection =
                    "asc";
            }
        }

        invalidateFilteredRows();
    }

    function showAllColumns() {
        if (!dataset) {
            return;
        }

        visibleColumns =
            new Set(
                dataset.headers.map(
                    function (
                        unusedHeader,
                        columnIndex,
                    ) {
                        return columnIndex;
                    },
                ),
            );
    }

    function hideAllColumns() {
        if (!dataset) {
            return;
        }

        visibleColumns.clear();

        filters =
            dataset.headers.map(
                createEmptyFilter,
            );

        selectedFilterColumn =
            null;
        sortColumn = null;
        sortDirection = "asc";

        invalidateFilteredRows();
    }

    function setSelectedFilterColumn(
        columnIndex,
    ) {
        selectedFilterColumn =
            hasColumn(columnIndex) &&
            visibleColumns.has(
                columnIndex,
            )
                ? columnIndex
                : null;
    }

    function updateSelectedFilter(
        field,
        value,
    ) {
        if (
            selectedFilterColumn ===
                null ||
            !filters[
                selectedFilterColumn
            ]
        ) {
            return;
        }

        filters[
            selectedFilterColumn
        ][field] = value;

        invalidateFilteredRows();
    }

    function setFilterText(value) {
        updateSelectedFilter(
            "text",
            String(value ?? ""),
        );
    }

    function setOccurrenceFilter(value) {
        const allowedValues =
            new Set([
                "all",
                "duplicates",
                "unique",
                "empty",
            ]);

        updateSelectedFilter(
            "occurrence",
            allowedValues.has(value)
                ? value
                : "all",
        );
    }

    function setNumericOperator(value) {
        updateSelectedFilter(
            "numericOperator",
            String(value ?? ""),
        );
    }

    function setNumericValue(value) {
        updateSelectedFilter(
            "numericValue",
            String(value ?? ""),
        );
    }

    function setRowLimit(value) {
        if (value === "all") {
            rowLimit = "all";

            return;
        }

        const numericLimit =
            Number(value);

        rowLimit =
            Number.isInteger(
                numericLimit,
            ) &&
            numericLimit > 0
                ? String(
                    numericLimit,
                )
                : "50";
    }

    function toggleSort(
        columnIndex,
    ) {
        if (
            !hasColumn(columnIndex) ||
            !visibleColumns.has(
                columnIndex,
            )
        ) {
            return;
        }

        if (
            sortColumn ===
            columnIndex
        ) {
            sortDirection =
                sortDirection === "asc"
                    ? "desc"
                    : "asc";

            return;
        }

        sortColumn = columnIndex;
        sortDirection = "asc";
    }

    function rowMatchesFilters(row) {
        return filters.every(
            function (
                filter,
                columnIndex,
            ) {
                if (
                    !visibleColumns.has(
                        columnIndex,
                    )
                ) {
                    return true;
                }

                const normalizedCellValue =
                    normalizeSearchValue(
                        row[columnIndex],
                    ).trim();

                const normalizedTextFilter =
                    normalizeSearchValue(
                        filter.text,
                    ).trim();

                if (
                    normalizedTextFilter &&
                    !normalizedCellValue.includes(
                        normalizedTextFilter,
                    )
                ) {
                    return false;
                }

                if (
                    filter.occurrence !==
                    "all"
                ) {
                    const valueCount =
                        columnValueCounts[
                            columnIndex
                        ]?.get(
                            normalizedCellValue,
                        ) ?? 0;

                    const isEmpty =
                        normalizedCellValue ===
                        "";

                    if (
                        filter.occurrence ===
                            "empty" &&
                        !isEmpty
                    ) {
                        return false;
                    }

                    if (
                        filter.occurrence ===
                            "duplicates" &&
                        (
                            isEmpty ||
                            valueCount <= 1
                        )
                    ) {
                        return false;
                    }

                    if (
                        filter.occurrence ===
                            "unique" &&
                        (
                            isEmpty ||
                            valueCount !== 1
                        )
                    ) {
                        return false;
                    }
                }

                const comparisonValue =
                    parseNumericValue(
                        filter.numericValue,
                    );

                if (
                    filter.numericOperator &&
                    comparisonValue !== null &&
                    !matchesNumericFilter(
                        row[columnIndex],
                        filter.numericOperator,
                        comparisonValue,
                    )
                ) {
                    return false;
                }

                return true;
            },
        );
    }

    function getFilteredRows() {
        if (!dataset) {
            return [];
        }

        if (filteredRowsCache) {
            return filteredRowsCache;
        }

        filteredRowsCache =
            filters.some(
                isFilterActive,
            )
                ? dataset.rows.filter(
                    rowMatchesFilters,
                )
                : dataset.rows;

        return filteredRowsCache;
    }

    function compareRows(
        firstRow,
        secondRow,
    ) {
        const firstValue =
            firstRow[sortColumn];

        const secondValue =
            secondRow[sortColumn];

        const firstText =
            formatCellValue(
                firstValue,
            ).trim();

        const secondText =
            formatCellValue(
                secondValue,
            ).trim();

        if (!firstText && secondText) {
            return 1;
        }

        if (firstText && !secondText) {
            return -1;
        }

        const profile =
            dataset.columnProfiles[
                sortColumn
            ];

        let comparison = 0;

        if (profile.type === "number") {
            const firstNumber =
                parseNumericValue(
                    firstValue,
                );

            const secondNumber =
                parseNumericValue(
                    secondValue,
                );

            if (
                firstNumber !== null &&
                secondNumber !== null
            ) {
                comparison =
                    firstNumber -
                    secondNumber;
            }
        } else if (
            profile.type ===
            "datetime"
        ) {
            const firstDate =
                parseDateValue(
                    firstValue,
                );

            const secondDate =
                parseDateValue(
                    secondValue,
                );

            if (
                firstDate &&
                secondDate
            ) {
                comparison =
                    firstDate.getTime() -
                    secondDate.getTime();
            }
        }

        if (comparison === 0) {
            comparison =
                naturalCollator.compare(
                    firstText,
                    secondText,
                );
        }

        return sortDirection === "asc"
            ? comparison
            : -comparison;
    }

    function getOrderedRows() {
        const filteredRows =
            getFilteredRows();

        if (sortColumn === null) {
            return filteredRows;
        }

        return [
            ...filteredRows,
        ].sort(compareRows);
    }

    function getCurrentFilter() {
        if (
            selectedFilterColumn ===
                null ||
            !filters[
                selectedFilterColumn
            ]
        ) {
            return createEmptyFilter();
        }

        return {
            ...filters[
                selectedFilterColumn
            ],
        };
    }

    function getSnapshot() {
        const visibleColumnIndexes =
            getVisibleColumnIndexes();

        const filteredRows =
            getFilteredRows();

        const orderedRows =
            getOrderedRows();

        const numericRowLimit =
            rowLimit === "all"
                ? null
                : Number(rowLimit);

        const previewRows =
            numericRowLimit === null
                ? orderedRows
                : orderedRows.slice(
                    0,
                    numericRowLimit,
                );

        return {
            canExport:
                Boolean(dataset) &&
                visibleColumnIndexes
                    .length > 0 &&
                filteredRows.length > 0,
            currentFilter:
                getCurrentFilter(),
            dataset,
            filteredRows,
            hasActiveFilters:
                filters.some(
                    isFilterActive,
                ),
            orderedRows,
            previewRows,
            rowLimit,
            selectedFilterColumn,
            sortColumn,
            sortDirection,
            visibleColumnIndexes,
        };
    }

    function createExportData() {
        const snapshot =
            getSnapshot();

        if (!snapshot.canExport) {
            throw new Error(
                "Não existem dados visíveis para copiar ou salvar.",
            );
        }

        const headers =
            snapshot.visibleColumnIndexes
                .map(
                    function (
                        columnIndex,
                    ) {
                        return dataset.headers[
                            columnIndex
                        ];
                    },
                );

        const rows =
            snapshot.orderedRows.map(
                function (row) {
                    return snapshot
                        .visibleColumnIndexes
                        .map(
                            function (
                                columnIndex,
                            ) {
                                return row[
                                    columnIndex
                                ] ?? "";
                            },
                        );
                },
            );

        return {
            headers,
            matrix: [
                headers,
                ...rows,
            ],
            rows,
        };
    }

    return Object.freeze({
        createExportData,
        getSnapshot,
        hideAllColumns,
        setColumnVisible,
        setDataset,
        setFilterText,
        setNumericOperator,
        setNumericValue,
        setOccurrenceFilter,
        setRowLimit,
        setSelectedFilterColumn,
        showAllColumns,
        toggleSort,
    });
}

export {
    createPreviewModel,
};
