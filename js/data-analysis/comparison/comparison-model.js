import {
    formatCellValue,
    naturalCollator,
    normalizeSearchValue,
} from "../core/value-utils.js";

function getComparisonStatusLabel(
    result,
) {
    if (
        result.status ===
        "outside"
    ) {
        return "Fora da condição";
    }

    if (
        result.status ===
        "notFound"
    ) {
        return "Não encontrado";
    }

    return result.conditionActive
        ? "Corresponde à condição"
        : "Encontrado";
}

function parseComparisonInput(
    inputValue,
) {
    const normalizedInput =
        String(
            inputValue ?? "",
        ).replace(
            /\r/g,
            "",
        );

    if (!normalizedInput.trim()) {
        return {
            duplicateCount: 0,
            invalidCount: 0,
            lineCount: 0,
            validCount: 0,
            values: [],
        };
    }

    const lines =
        normalizedInput
            .replace(
                /\n+$/,
                "",
            )
            .split("\n");

    const valueCounts =
        new Map();

    const values = [];

    let invalidCount = 0;

    lines.forEach(function (line) {
        const displayValue =
            line.trim();

        const normalizedValue =
            normalizeSearchValue(
                displayValue,
            ).trim();

        if (!normalizedValue) {
            invalidCount += 1;

            return;
        }

        const currentCount =
            valueCounts.get(
                normalizedValue,
            ) ?? 0;

        valueCounts.set(
            normalizedValue,
            currentCount + 1,
        );

        if (currentCount === 0) {
            values.push({
                normalizedValue,
                value: displayValue,
            });
        }
    });

    let duplicateCount = 0;

    valueCounts.forEach(
        function (count) {
            duplicateCount +=
                Math.max(
                    0,
                    count - 1,
                );
        },
    );

    return {
        duplicateCount,
        invalidCount,
        lineCount: lines.length,
        validCount: values.length,
        values,
    };
}

function getComparableColumnIndexes(
    previewSnapshot,
) {
    const dataset =
        previewSnapshot?.dataset ??
        null;

    if (!dataset) {
        return [];
    }

    const visibleColumnIndexes =
        Array.isArray(
            previewSnapshot
                .visibleColumnIndexes,
        )
            ? previewSnapshot
                .visibleColumnIndexes
            : dataset.headers.map(
                function (
                    unusedHeader,
                    columnIndex,
                ) {
                    return columnIndex;
                },
            );

    return visibleColumnIndexes.filter(
        function (columnIndex) {
            return (
                Number.isInteger(
                    columnIndex,
                ) &&
                columnIndex >= 0 &&
                columnIndex <
                    dataset.headers.length &&
                dataset.columnProfiles[
                    columnIndex
                ]?.type !== "empty"
            );
        },
    );
}

function getComparisonRows(
    previewSnapshot,
) {
    const dataset =
        previewSnapshot?.dataset ??
        null;

    if (!dataset) {
        return [];
    }

    return Array.isArray(
        previewSnapshot.filteredRows,
    )
        ? previewSnapshot.filteredRows
        : dataset.rows;
}

function getConditionValueOptions(
    previewSnapshot,
    columnIndex,
) {
    const dataset =
        previewSnapshot?.dataset ??
        null;

    if (
        !dataset ||
        !Number.isInteger(
            columnIndex,
        ) ||
        columnIndex < 0 ||
        columnIndex >=
            dataset.headers.length
    ) {
        return [];
    }

    const uniqueValues =
        new Map();

    getComparisonRows(
        previewSnapshot,
    ).forEach(function (row) {
        const displayValue =
            formatCellValue(
                row[columnIndex],
            ).trim();

        const normalizedValue =
            normalizeSearchValue(
                displayValue,
            ).trim();

        if (
            !normalizedValue ||
            uniqueValues.has(
                normalizedValue,
            )
        ) {
            return;
        }

        uniqueValues.set(
            normalizedValue,
            displayValue,
        );
    });

    return Array.from(
        uniqueValues.entries(),
    )
        .map(function (
            [value, label],
        ) {
            return {
                label,
                value,
            };
        })
        .sort(function (
            firstOption,
            secondOption,
        ) {
            return naturalCollator
                .compare(
                    firstOption.label,
                    secondOption.label,
                );
        });
}

function createSpreadsheetLineMap(
    dataset,
) {
    const lineMap =
        new Map();

    dataset.rows.forEach(
        function (
            row,
            rowIndex,
        ) {
            lineMap.set(
                row,
                rowIndex + 2,
            );
        },
    );

    return lineMap;
}

function createColumnIndex({
    previewSnapshot,
    comparisonColumnIndex,
    conditionColumnIndex,
    conditionValue,
}) {
    const dataset =
        previewSnapshot.dataset;

    const columnIndexMap =
        new Map();

    const spreadsheetLineMap =
        createSpreadsheetLineMap(
            dataset,
        );

    const conditionActive =
        Number.isInteger(
            conditionColumnIndex,
        ) &&
        conditionValue !== "";

    getComparisonRows(
        previewSnapshot,
    ).forEach(function (
        row,
        filteredRowIndex,
    ) {
        const originalValue =
            formatCellValue(
                row[
                    comparisonColumnIndex
                ],
            ).trim();

        const normalizedValue =
            normalizeSearchValue(
                originalValue,
            ).trim();

        if (!normalizedValue) {
            return;
        }

        if (
            !columnIndexMap.has(
                normalizedValue,
            )
        ) {
            columnIndexMap.set(
                normalizedValue,
                {
                    allLines: [],
                    conditionValues:
                        new Set(),
                    matchedConditionValues:
                        new Set(),
                    matchedLines: [],
                    matchedOccurrences: 0,
                    totalOccurrences: 0,
                },
            );
        }

        const indexedValue =
            columnIndexMap.get(
                normalizedValue,
            );

        const spreadsheetLine =
            spreadsheetLineMap.get(
                row,
            ) ??
            filteredRowIndex + 2;

        indexedValue
            .totalOccurrences += 1;

        indexedValue.allLines.push(
            spreadsheetLine,
        );

        if (!conditionActive) {
            indexedValue
                .matchedOccurrences += 1;

            indexedValue
                .matchedLines.push(
                    spreadsheetLine,
                );

            return;
        }

        const displayConditionValue =
            formatCellValue(
                row[
                    conditionColumnIndex
                ],
            ).trim();

        const normalizedConditionValue =
            normalizeSearchValue(
                displayConditionValue,
            ).trim();

        indexedValue
            .conditionValues.add(
                displayConditionValue ||
                "Célula vazia",
            );

        if (
            normalizedConditionValue !==
            conditionValue
        ) {
            return;
        }

        indexedValue
            .matchedOccurrences += 1;

        indexedValue
            .matchedLines.push(
                spreadsheetLine,
            );

        indexedValue
            .matchedConditionValues
            .add(
                displayConditionValue ||
                "Célula vazia",
            );
    });

    return columnIndexMap;
}

function createComparisonSummary(
    results,
) {
    const foundCount =
        results.filter(
            function (result) {
                return (
                    result.status ===
                    "found"
                );
            },
        ).length;

    const outsideCount =
        results.filter(
            function (result) {
                return (
                    result.status ===
                    "outside"
                );
            },
        ).length;

    const notFoundCount =
        results.length -
        foundCount -
        outsideCount;

    return {
        correspondenceRate:
            results.length > 0
                ? foundCount /
                    results.length *
                    100
                : 0,
        foundCount,
        notFoundCount,
        outsideCount,
    };
}

function buildComparisonResults({
    previewSnapshot,
    comparisonColumnIndex,
    conditionColumnIndex = null,
    conditionValue = "",
    inputData,
}) {
    const dataset =
        previewSnapshot?.dataset ??
        null;

    const conditionActive =
        Number.isInteger(
            conditionColumnIndex,
        ) &&
        conditionValue !== "";

    const hasIncompleteCondition =
        Number.isInteger(
            conditionColumnIndex,
        ) &&
        conditionValue === "";

    if (
        !dataset ||
        !Number.isInteger(
            comparisonColumnIndex,
        ) ||
        comparisonColumnIndex < 0 ||
        comparisonColumnIndex >=
            dataset.headers.length ||
        !inputData ||
        inputData.validCount === 0 ||
        hasIncompleteCondition
    ) {
        return {
            conditionActive,
            results: [],
            summary:
                createComparisonSummary(
                    [],
                ),
        };
    }

    const columnIndexMap =
        createColumnIndex({
            comparisonColumnIndex,
            conditionColumnIndex,
            conditionValue,
            previewSnapshot,
        });

    const results =
        inputData.values.map(
            function (inputValue) {
                const indexedValue =
                    columnIndexMap.get(
                        inputValue
                            .normalizedValue,
                    );

                const exists =
                    Boolean(
                        indexedValue,
                    );

                const matchesCondition =
                    exists &&
                    indexedValue
                        .matchedOccurrences >
                        0;

                const status =
                    !exists
                        ? "notFound"
                        : matchesCondition
                            ? "found"
                            : "outside";

                const occurrences =
                    status === "found"
                        ? indexedValue
                            .matchedOccurrences
                        : indexedValue
                            ?.totalOccurrences ??
                            0;

                const lines =
                    status === "found"
                        ? indexedValue
                            .matchedLines
                        : indexedValue
                            ?.allLines ??
                            [];

                const conditionValues =
                    !conditionActive ||
                    !indexedValue
                        ? []
                        : Array.from(
                            status ===
                                "found"
                                ? indexedValue
                                    .matchedConditionValues
                                : indexedValue
                                    .conditionValues,
                        );

                return {
                    conditionActive,
                    conditionValues,
                    lines,
                    normalizedValue:
                        inputValue
                            .normalizedValue,
                    occurrences,
                    status,
                    value:
                        inputValue.value,
                };
            },
        );

    return {
        conditionActive,
        results,
        summary:
            createComparisonSummary(
                results,
            ),
    };
}

function filterComparisonResults(
    results,
    searchValue,
) {
    const normalizedSearch =
        normalizeSearchValue(
            searchValue,
        ).trim();

    if (!normalizedSearch) {
        return [...results];
    }

    return results.filter(
        function (result) {
            const searchableValue =
                [
                    result.value,
                    getComparisonStatusLabel(
                        result,
                    ),
                    result.conditionValues
                        .join(" "),
                    result.occurrences,
                    result.lines.join(" "),
                ].join(" ");

            return normalizeSearchValue(
                searchableValue,
            ).includes(
                normalizedSearch,
            );
        },
    );
}

function sortComparisonResults(
    results,
    sortColumn = "status",
    sortDirection = "asc",
) {
    const statusOrder = {
        found: 0,
        outside: 1,
        notFound: 2,
    };

    function getSortValue(result) {
        switch (sortColumn) {
            case "value":
                return result.value;

            case "condition":
                return result
                    .conditionValues
                    .join(", ");

            case "occurrences":
                return result.occurrences;

            case "lines":
                return (
                    result.lines[0] ??
                    Number.MAX_SAFE_INTEGER
                );

            default:
                return statusOrder[
                    result.status
                ];
        }
    }

    return [...results].sort(
        function (
            firstResult,
            secondResult,
        ) {
            const firstValue =
                getSortValue(
                    firstResult,
                );

            const secondValue =
                getSortValue(
                    secondResult,
                );

            const comparison =
                typeof firstValue ===
                    "number" &&
                typeof secondValue ===
                    "number"
                    ? firstValue -
                        secondValue
                    : naturalCollator
                        .compare(
                            String(
                                firstValue,
                            ),
                            String(
                                secondValue,
                            ),
                        );

            return sortDirection ===
                "desc"
                ? -comparison
                : comparison;
        },
    );
}

export {
    buildComparisonResults,
    filterComparisonResults,
    getComparableColumnIndexes,
    getComparisonStatusLabel,
    getConditionValueOptions,
    parseComparisonInput,
    sortComparisonResults,
};
