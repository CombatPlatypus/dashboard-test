import {
    formatCellValue,
    isEmptyCell,
    naturalCollator,
    normalizeSearchValue,
    parseDateValue,
    parseNumericValue,
} from "../core/value-utils.js";

const MAX_FREQUENCY_ROWS = 25;

function formatAnalysisNumber(value) {
    if (!Number.isFinite(value)) {
        return "—";
    }

    return new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 2,
        },
    ).format(value);
}

function formatAnalysisPercentage(
    quantity,
    total,
) {
    if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(total) ||
        total <= 0
    ) {
        return "0,0%";
    }

    return new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        },
    ).format(
        quantity / total,
    );
}

function formatAnalysisDate(
    value,
    hasTime,
) {
    if (!(value instanceof Date)) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        hasTime
            ? {
                dateStyle: "short",
                timeStyle: "medium",
            }
            : {
                dateStyle: "short",
            },
    ).format(value);
}

function createFrequencyData(
    rows,
    columnIndex,
) {
    const groups = new Map();

    rows.forEach(function (row) {
        const displayValue =
            formatCellValue(
                row[columnIndex],
            ).trim();

        if (!displayValue) {
            return;
        }

        const normalizedValue =
            normalizeSearchValue(
                displayValue,
            ).trim();

        const existingGroup =
            groups.get(
                normalizedValue,
            );

        if (existingGroup) {
            existingGroup.count += 1;

            return;
        }

        groups.set(
            normalizedValue,
            {
                count: 1,
                label: displayValue,
            },
        );
    });

    return Array.from(
        groups.values(),
    ).sort(
        function (
            firstGroup,
            secondGroup,
        ) {
            return (
                secondGroup.count -
                    firstGroup.count ||
                naturalCollator.compare(
                    firstGroup.label,
                    secondGroup.label,
                )
            );
        },
    );
}

function createFrequencySummary({
    groups,
    totalOccurrences,
    emptyMessage,
}) {
    return {
        emptyMessage,
        items: groups
            .slice(
                0,
                MAX_FREQUENCY_ROWS,
            )
            .map(function (group) {
                return {
                    count:
                        group.count,
                    label:
                        group.label,
                    percentage:
                        formatAnalysisPercentage(
                            group.count,
                            totalOccurrences,
                        ),
                };
            }),
    };
}

function createMetric(
    label,
    value,
) {
    return {
        label,
        value,
    };
}

function createColumnAnalysis(
    dataset,
    rows,
    columnIndex,
) {
    const columnName =
        dataset.headers[
            columnIndex
        ];

    const profile =
        dataset.columnProfiles[
            columnIndex
        ] ?? {
            hasTime: false,
            type: "category",
        };

    const filledValues = rows
        .map(function (row) {
            return row[columnIndex];
        })
        .filter(function (value) {
            return !isEmptyCell(value);
        });

    const emptyCount =
        rows.length -
        filledValues.length;

    const card = {
        columnIndex,
        columnName,
        frequency: null,
        headlineLabel:
            "Valores preenchidos",
        headlineValue:
            formatAnalysisNumber(
                filledValues.length,
            ),
        metrics: [],
        type: profile.type,
    };

    if (profile.type === "number") {
        const numericValues =
            filledValues
                .map(parseNumericValue)
                .filter(function (value) {
                    return value !== null;
                });

        const total =
            numericValues.reduce(
                function (
                    sum,
                    value,
                ) {
                    return sum + value;
                },
                0,
            );

        const average =
            numericValues.length > 0
                ? total /
                    numericValues.length
                : NaN;

        let minimum = NaN;
        let maximum = NaN;

        numericValues.forEach(
            function (value) {
                minimum =
                    Number.isNaN(
                        minimum,
                    )
                        ? value
                        : Math.min(
                            minimum,
                            value,
                        );

                maximum =
                    Number.isNaN(
                        maximum,
                    )
                        ? value
                        : Math.max(
                            maximum,
                            value,
                        );
            },
        );

        card.headlineLabel =
            "Total da coluna";
        card.headlineValue =
            formatAnalysisNumber(
                total,
            );
        card.metrics = [
            createMetric(
                "Total",
                formatAnalysisNumber(
                    total,
                ),
            ),
            createMetric(
                "Média",
                formatAnalysisNumber(
                    average,
                ),
            ),
            createMetric(
                "Menor valor",
                formatAnalysisNumber(
                    minimum,
                ),
            ),
            createMetric(
                "Maior valor",
                formatAnalysisNumber(
                    maximum,
                ),
            ),
            createMetric(
                "Valores válidos",
                formatAnalysisNumber(
                    numericValues.length,
                ),
            ),
            createMetric(
                "Células vazias",
                formatAnalysisNumber(
                    emptyCount,
                ),
            ),
        ];

        return card;
    }

    if (profile.type === "datetime") {
        const dateValues =
            filledValues
                .map(parseDateValue)
                .filter(function (value) {
                    return value !== null;
                });

        const firstDate =
            dateValues.reduce(
                function (
                    earliestDate,
                    currentDate,
                ) {
                    return (
                        !earliestDate ||
                        currentDate <
                            earliestDate
                            ? currentDate
                            : earliestDate
                    );
                },
                null,
            );

        const lastDate =
            dateValues.reduce(
                function (
                    latestDate,
                    currentDate,
                ) {
                    return (
                        !latestDate ||
                        currentDate >
                            latestDate
                            ? currentDate
                            : latestDate
                    );
                },
                null,
            );

        card.headlineLabel =
            "Datas válidas";
        card.headlineValue =
            formatAnalysisNumber(
                dateValues.length,
            );
        card.metrics = [
            createMetric(
                "Data inicial",
                formatAnalysisDate(
                    firstDate,
                    profile.hasTime,
                ),
            ),
            createMetric(
                "Data final",
                formatAnalysisDate(
                    lastDate,
                    profile.hasTime,
                ),
            ),
            createMetric(
                "Valores válidos",
                formatAnalysisNumber(
                    dateValues.length,
                ),
            ),
            createMetric(
                "Células vazias",
                formatAnalysisNumber(
                    emptyCount,
                ),
            ),
        ];

        return card;
    }

    if (
        profile.type === "category" ||
        profile.type === "identifier"
    ) {
        const frequencyData =
            createFrequencyData(
                rows,
                columnIndex,
            );

        const duplicateCount =
            filledValues.length -
            frequencyData.length;

        card.headlineLabel =
            "Valores diferentes";
        card.headlineValue =
            formatAnalysisNumber(
                frequencyData.length,
            );

        if (
            profile.type ===
            "identifier"
        ) {
            const duplicatedValues =
                frequencyData.filter(
                    function (group) {
                        return (
                            group.count > 1
                        );
                    },
                );

            const duplicateOccurrences =
                duplicatedValues.reduce(
                    function (
                        total,
                        group,
                    ) {
                        return (
                            total +
                            group.count
                        );
                    },
                    0,
                );

            card.metrics = [
                createMetric(
                    "Valores preenchidos",
                    formatAnalysisNumber(
                        filledValues.length,
                    ),
                ),
                createMetric(
                    "Valores únicos",
                    formatAnalysisNumber(
                        frequencyData.length,
                    ),
                ),
                createMetric(
                    "Duplicidades na coluna",
                    formatAnalysisNumber(
                        duplicateCount,
                    ),
                ),
                createMetric(
                    "Células vazias",
                    formatAnalysisNumber(
                        emptyCount,
                    ),
                ),
            ];

            if (
                duplicatedValues.length > 0
            ) {
                card.frequency =
                    createFrequencySummary({
                        groups:
                            duplicatedValues,
                        totalOccurrences:
                            duplicateOccurrences,
                        emptyMessage:
                            "Nenhum valor repetido.",
                    });
            }

            return card;
        }

        card.frequency =
            createFrequencySummary({
                groups: frequencyData,
                totalOccurrences:
                    filledValues.length,
                emptyMessage:
                    "Nenhum valor preenchido.",
            });

        return card;
    }

    card.metrics = [
        createMetric(
            "Valores preenchidos",
            formatAnalysisNumber(
                filledValues.length,
            ),
        ),
        createMetric(
            "Células vazias",
            formatAnalysisNumber(
                emptyCount,
            ),
        ),
    ];

    return card;
}

function buildDataAnalysis(
    previewSnapshot,
) {
    const dataset =
        previewSnapshot?.dataset ??
        null;

    if (!dataset) {
        return {
            cards: [],
            hasDataset: false,
            rowCount: 0,
            visibleColumnCount: 0,
        };
    }

    const rows =
        Array.isArray(
            previewSnapshot.filteredRows,
        )
            ? previewSnapshot
                .filteredRows
            : dataset.rows;

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

    return {
        cards:
            visibleColumnIndexes.map(
                function (
                    columnIndex,
                ) {
                    return createColumnAnalysis(
                        dataset,
                        rows,
                        columnIndex,
                    );
                },
            ),
        hasDataset: true,
        rowCount: rows.length,
        visibleColumnCount:
            visibleColumnIndexes.length,
    };
}

export {
    MAX_FREQUENCY_ROWS,
    buildDataAnalysis,
    createFrequencyData,
};
