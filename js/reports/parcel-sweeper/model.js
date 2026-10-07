const PARCEL_PACKAGE_FILTERS =
    Object.freeze([
        "all",
        "backlog",
        "exception",
    ]);

const PARCEL_AGING_BINS =
    Object.freeze([
        Object.freeze({
            key: "1-6h",
            label: "1–6h",
            minimumHours: 1,
            maximumHours: 6,
            color: "#42A5F5",
        }),
        Object.freeze({
            key: "7-12h",
            label: "7–12h",
            minimumHours: 7,
            maximumHours: 12,
            color: "#42A5F5",
        }),
        Object.freeze({
            key: "13-24h",
            label: "13–24h",
            minimumHours: 13,
            maximumHours: 24,
            color: "#42A5F5",
        }),
        Object.freeze({
            key: "25-48h",
            label: "25–48h",
            minimumHours: 25,
            maximumHours: 48,
            color: "#FFB74D",
        }),
        Object.freeze({
            key: "49-96h",
            label: "49–96h",
            minimumHours: 49,
            maximumHours: 96,
            color: "#FFB74D",
        }),
        Object.freeze({
            key: "97-168h",
            label: "97–168h",
            minimumHours: 97,
            maximumHours: 168,
            color: "#EF5350",
        }),
        Object.freeze({
            key: "over-168h",
            label: ">168h",
            minimumHours: 168,
            minimumExclusive: true,
            maximumHours: Number.POSITIVE_INFINITY,
            color: "#EF5350",
        }),
    ]);

const PARCEL_BULKY_RULE =
    Object.freeze({
        // Nas amostras rotuladas, volumosos podem chegar a 59,3%
        // do volume de referência. A cadência lenta continua obrigatória.
        minimumScans: 15,
        baselineVolumeFloor: 0.65,
        maximumVolumeRatio: 0.65,
        minimumP75GapSeconds: 6,
        minimumP75GapRatio: 1.75,
        slowGapSeconds: 5,
        minimumSlowGapShare: 0.25,
        minimumSlowGapShareRatio: 2,
    });

function normalizeParcelText(
    value,
) {
    return String(
        value ?? "",
    )
        .replace(
            /\s+/g,
            " ",
        )
        .trim();
}

function normalizeParcelColumnName(
    value,
) {
    return normalizeParcelText(
        value,
    )
        .normalize(
            "NFD",
        )
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            " ",
        )
        .trim();
}

function normalizeParcelCountType(
    value,
) {
    return normalizeParcelText(
        value,
    ).toLowerCase();
}

function normalizeParcelFilter(
    value,
) {
    const normalizedValue =
        normalizeParcelText(
            value,
        ).toLowerCase();

    return PARCEL_PACKAGE_FILTERS
        .includes(
            normalizedValue,
        )
            ? normalizedValue
            : "all";
}

function getParcelOperatorKey(
    value,
) {
    return normalizeParcelText(
        value,
    ).toLocaleLowerCase(
        "pt-BR",
    );
}

function formatParcelOperatorName(value) {
    const text = normalizeParcelText(value);
    const match = text.match(/^\[ops(\d+)\]\s*(.*)$/i);

    if (!match) {
        return text;
    }

    const shortName = match[2]
        .split(" ")
        .filter(Boolean)
        .slice(0, 1)
        .map(function (name) {
            const lowercaseName = name.toLocaleLowerCase("pt-BR");
            return lowercaseName.charAt(0).toLocaleUpperCase("pt-BR") +
                lowercaseName.slice(1);
        })
        .join(" ");

    return `[Ops${match[1]}]${shortName ? ` ${shortName}` : ""}`;
}

function isParcelOperator(
    value,
) {
    return /^\[ops\d+\]/i.test(
        normalizeParcelText(
            value,
        ),
    );
}

function parseParcelTimestamp(
    value,
) {
    const text =
        normalizeParcelText(
            value,
        );

    const match =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
        );

    if (!match) {
        return null;
    }

    const timestamp =
        Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            Number(match[4]),
            Number(match[5]),
            Number(match[6]),
        );

    return Number.isFinite(
        timestamp,
    )
        ? timestamp
        : null;
}

function parseParcelAgingHours(
    value,
) {
    const text =
        normalizeParcelText(
            value,
        ).toLowerCase();

    if (!text) {
        return null;
    }

    const dayMatch =
        text.match(
            /(\d+)\s*d/,
        );

    const hourMatch =
        text.match(
            /(\d+)\s*h/,
        );

    const minuteMatch =
        text.match(
            /(\d+)\s*min/,
        );

    if (
        !dayMatch &&
        !hourMatch &&
        !minuteMatch
    ) {
        return null;
    }

    const days =
        Number(
            dayMatch?.[1] ?? 0,
        );

    const hours =
        Number(
            hourMatch?.[1] ?? 0,
        );

    const minutes =
        Number(
            minuteMatch?.[1] ?? 0,
        );

    const totalHours =
        days * 24 +
        hours +
        minutes / 60;

    return Number.isFinite(
        totalHours,
    )
        ? totalHours
        : null;
}

function createParcelRow(
    values = {},
) {
    const scannedTime =
        normalizeParcelText(
            values.scannedTime,
        );

    return {
        trackingNumber:
            normalizeParcelText(
                values.trackingNumber,
            ).toUpperCase(),
        scannedStatus:
            normalizeParcelText(
                values.scannedStatus,
            ),
        expediteTag:
            normalizeParcelText(
                values.expediteTag,
            ),
        finalStatus:
            normalizeParcelText(
                values.finalStatus,
            ),
        sortCode:
            normalizeParcelText(
                values.sortCode,
            ),
        nextStepAction:
            normalizeParcelText(
                values.nextStepAction,
            ),
        onHoldTimes:
            normalizeParcelText(
                values.onHoldTimes,
            ),
        countType:
            normalizeParcelText(
                values.countType,
            ),
        expected:
            normalizeParcelText(
                values.expected,
            ),
        operator:
            normalizeParcelText(
                values.operator,
            ),
        agingTime:
            normalizeParcelText(
                values.agingTime,
            ),
        scannedTime,
        scannedTimestamp:
            parseParcelTimestamp(
                scannedTime,
            ),
    };
}

function isParcelScannedRow(
    row,
) {
    const scannedStatus =
        normalizeParcelText(
            row?.scannedStatus,
        );

    return Boolean(
        row?.trackingNumber &&
        scannedStatus &&
        scannedStatus !== "-",
    );
}

function percentile(
    values,
    rate,
) {
    const sortedValues =
        values
            .filter(
                Number.isFinite,
            )
            .slice()
            .sort(
                function (
                    first,
                    second,
                ) {
                    return first - second;
                },
            );

    if (
        sortedValues.length === 0
    ) {
        return null;
    }

    if (
        sortedValues.length === 1
    ) {
        return sortedValues[0];
    }

    const position =
        (
            sortedValues.length - 1
        ) * rate;

    const lowerIndex =
        Math.floor(
            position,
        );

    const upperIndex =
        Math.ceil(
            position,
        );

    if (
        lowerIndex === upperIndex
    ) {
        return sortedValues[
            lowerIndex
        ];
    }

    const weight =
        position - lowerIndex;

    return (
        sortedValues[lowerIndex] +
        (
            sortedValues[upperIndex] -
            sortedValues[lowerIndex]
        ) * weight
    );
}

function createParcelOperatorStats(
    rows,
) {
    const scannedRows =
        rows.filter(
            function (row) {
                return (
                    isParcelScannedRow(
                        row,
                    ) &&
                    isParcelOperator(
                        row.operator,
                    )
                );
            },
        );

    const groupedRows =
        new Map();

    scannedRows.forEach(
        function (row) {
            const operatorKey =
                getParcelOperatorKey(
                    row.operator,
                );

            if (
                !groupedRows.has(
                    operatorKey,
                )
            ) {
                groupedRows.set(
                    operatorKey,
                    {
                        operatorKey,
                        operator:
                            row.operator,
                        rows: [],
                    },
                );
            }

            groupedRows
                .get(
                    operatorKey,
                )
                .rows.push(
                    row,
                );
        },
    );

    const total =
        scannedRows.length;

    return Array.from(
        groupedRows.values(),
    )
        .map(
            function (group) {
                const timestamps =
                    group.rows
                        .map(
                            function (row) {
                                return row
                                    .scannedTimestamp;
                            },
                        )
                        .filter(
                            Number.isFinite,
                        )
                        .sort(
                            function (
                                first,
                                second,
                            ) {
                                return first - second;
                            },
                        );

                const gaps = [];

                for (
                    let index = 1;
                    index < timestamps.length;
                    index += 1
                ) {
                    gaps.push(
                        (
                            timestamps[index] -
                            timestamps[index - 1]
                        ) / 1000,
                    );
                }

                const slowGapCount =
                    gaps.filter(
                        function (gap) {
                            return gap >
                                PARCEL_BULKY_RULE
                                    .slowGapSeconds;
                        },
                    ).length;

                return {
                    operatorKey:
                        group.operatorKey,
                    operator:
                        group.operator,
                    count:
                        group.rows.length,
                    timedScanCount:
                        timestamps.length,
                    percentage:
                        total > 0
                            ? group.rows.length /
                                total
                            : 0,
                    medianGapSeconds:
                        percentile(
                            gaps,
                            0.5,
                        ),
                    p75GapSeconds:
                        percentile(
                            gaps,
                            0.75,
                        ),
                    p90GapSeconds:
                        percentile(
                            gaps,
                            0.9,
                        ),
                    slowGapShare:
                        gaps.length > 0
                            ? slowGapCount /
                                gaps.length
                            : 0,
                    firstScanTimestamp:
                        timestamps[0] ??
                        null,
                    lastScanTimestamp:
                        timestamps[
                            timestamps.length - 1
                        ] ?? null,
                    packageKind: "common",
                };
            },
        )
        .sort(
            function (
                first,
                second,
            ) {
                return (
                    second.count -
                        first.count ||
                    first.operator.localeCompare(
                        second.operator,
                        "pt-BR",
                    )
                );
            },
        );
}

function classifyParcelOperators(
    rows,
) {
    const stats =
        createParcelOperatorStats(
            rows,
        );

    const maximumCount =
        Math.max(
            0,
            ...stats.map(
                function (operator) {
                    return operator.count;
                },
            ),
        );

    const baselineOperators =
        stats.filter(
            function (operator) {
                return (
                    operator.count >=
                    maximumCount *
                        PARCEL_BULKY_RULE
                            .baselineVolumeFloor
                );
            },
        );

    const baselineCount =
        percentile(
            baselineOperators.map(
                function (operator) {
                    return operator.count;
                },
            ),
            0.5,
        );

    const baselineP75Gap =
        percentile(
            baselineOperators.map(
                function (operator) {
                    return operator
                        .p75GapSeconds;
                },
            ),
            0.5,
        );

    const baselineSlowGapShare =
        percentile(
            baselineOperators.map(
                function (operator) {
                    return operator
                        .slowGapShare;
                },
            ),
            0.5,
        );

    return stats.map(
        function (operator) {
            const volumeRatio =
                baselineCount > 0
                    ? operator.count /
                        baselineCount
                    : 1;

            const p75GapRatio =
                baselineP75Gap > 0
                    ? operator
                        .p75GapSeconds /
                        baselineP75Gap
                    : 1;

            const slowGapShareRatio =
                baselineSlowGapShare > 0
                    ? operator
                        .slowGapShare /
                        baselineSlowGapShare
                    : (
                        operator
                            .slowGapShare > 0
                            ? Number.POSITIVE_INFINITY
                            : 1
                    );

            const hasSufficientTimingEvidence =
                operator.timedScanCount >=
                    PARCEL_BULKY_RULE
                        .minimumScans;

            const isBulky =
                hasSufficientTimingEvidence &&
                volumeRatio <=
                    PARCEL_BULKY_RULE
                        .maximumVolumeRatio &&
                operator.p75GapSeconds >=
                    PARCEL_BULKY_RULE
                        .minimumP75GapSeconds &&
                p75GapRatio >=
                    PARCEL_BULKY_RULE
                        .minimumP75GapRatio &&
                operator.slowGapShare >=
                    PARCEL_BULKY_RULE
                        .minimumSlowGapShare &&
                slowGapShareRatio >=
                    PARCEL_BULKY_RULE
                        .minimumSlowGapShareRatio;

            return {
                ...operator,
                packageKind:
                    isBulky
                        ? "bulky"
                        : "common",
                classification: {
                    hasSufficientTimingEvidence,
                    volumeRatio,
                    p75GapRatio,
                    slowGapShareRatio,
                },
            };
        },
    );
}

function createParcelAgingDistribution(
    rows,
) {
    const distribution =
        PARCEL_AGING_BINS.map(
            function (bin) {
                return {
                    ...bin,
                    count: 0,
                    percentage: 0,
                };
            },
        );

    rows
        .filter(
            function (row) {
                return (
                    isParcelScannedRow(
                        row,
                    ) &&
                    isParcelOperator(
                        row.operator,
                    )
                );
            },
        )
        .forEach(
            function (row) {
                const hours =
                    parseParcelAgingHours(
                        row.agingTime,
                    );

                if (
                    !Number.isFinite(
                        hours,
                    ) ||
                    hours < 1
                ) {
                    return;
                }

                const bin =
                    distribution.find(
                        function (item) {
                            return (
                                (item.minimumExclusive
                                    ? hours > item.minimumHours
                                    : hours >= item.minimumHours) &&
                                hours <=
                                    item.maximumHours
                            );
                        },
                    );

                if (bin) {
                    bin.count += 1;
                }
            },
        );

    const total =
        distribution.reduce(
            function (
                sum,
                bin,
            ) {
                return sum +
                    bin.count;
            },
            0,
        );

    distribution.forEach(
        function (bin) {
            bin.percentage =
                total > 0
                    ? bin.count / total
                    : 0;
        },
    );

    return distribution;
}

function filterParcelPackageRows(
    rows,
    filter,
) {
    const normalizedFilter =
        normalizeParcelFilter(
            filter,
        );

    return rows.filter(
        function (row) {
            const countType =
                normalizeParcelCountType(
                    row.countType,
                );

            if (
                countType === "exception" &&
                normalizeParcelText(row.finalStatus) !== "LMHub_Received"
            ) {
                return false;
            }

            if (
                normalizedFilter ===
                "all"
            ) {
                return (
                    countType ===
                        "backlog" ||
                    countType ===
                        "exception"
                );
            }

            return countType ===
                normalizedFilter;
        },
    );
}

function createParcelColumnDistribution(rows, column) {
    if (!Array.isArray(rows) || !["finalStatus", "nextStepAction"].includes(column)) {
        return [];
    }

    const groups = new Map();
    rows.forEach(row => {
        const label = normalizeParcelText(row?.[column]) || "-";
        const key = label.toLocaleLowerCase("pt-BR");
        if (!groups.has(key)) {
            groups.set(key, { label, count: 0 });
        }
        groups.get(key).count += 1;
    });

    return [...groups.values()]
        .map(group => ({ ...group, percentage: group.count / rows.length }))
        .sort((first, second) => second.count - first.count ||
            first.label.localeCompare(second.label, "pt-BR", { numeric: true }));
}

function createParcelSummary(
    rows,
    operatorKindOverrides = {},
) {
    const receivedRows =
        Array.isArray(
            rows,
        )
            ? rows
            : [];

    const scannedRows =
        receivedRows.filter(
            isParcelScannedRow,
        );

    const validOperatorRows =
        scannedRows.filter(
            function (row) {
                return isParcelOperator(
                    row.operator,
                );
            },
        );

    const operatorStats =
        classifyParcelOperators(
            receivedRows,
        ).map(function (operator) {
            const hasOverride = Object.hasOwn(operatorKindOverrides ?? {}, operator.operatorKey) &&
                typeof operatorKindOverrides[operator.operatorKey] === "boolean";

            return hasOverride ? {
                ...operator,
                packageKind: operatorKindOverrides[operator.operatorKey] ? "bulky" : "common",
            } : operator;
        });

    const bulkyOperatorKeys =
        new Set(
            operatorStats
                .filter(
                    function (operator) {
                        return operator
                            .packageKind ===
                            "bulky";
                    },
                )
                .map(
                    function (operator) {
                        return operator
                            .operatorKey;
                    },
                ),
        );

    const commonRows = [];
    const bulkyRows = [];

    validOperatorRows.forEach(
        function (row) {
            const destination =
                bulkyOperatorKeys.has(
                    getParcelOperatorKey(
                        row.operator,
                    ),
                )
                    ? bulkyRows
                    : commonRows;

            destination.push(
                row,
            );
        },
    );

    return {
        hasData:
            receivedRows.length > 0,
        totalRows:
            receivedRows.length,
        scannedCount:
            scannedRows.length,
        unscannedCount:
            receivedRows.length -
                scannedRows.length,
        backlogCount:
            receivedRows.filter(
                function (row) {
                    return normalizeParcelCountType(
                        row.countType,
                    ) === "backlog";
                },
            ).length,
        exceptionCount:
            receivedRows.filter(
                function (row) {
                    return normalizeParcelCountType(
                        row.countType,
                    ) === "exception";
                },
            ).length,
        missortedCount:
            receivedRows.filter(
                function (row) {
                    return normalizeParcelCountType(
                        row.countType,
                    ) === "mis-sorted";
                },
            ).length,
        ignoredScannedCount:
            scannedRows.length -
                validOperatorRows.length,
        operatorStats,
        finalStatusDistribution: createParcelColumnDistribution(receivedRows, "finalStatus"),
        nextStepActionDistribution: createParcelColumnDistribution(receivedRows, "nextStepAction"),
        agingDistribution:
            createParcelAgingDistribution(
                receivedRows,
            ),
        commonRows,
        bulkyRows,
    };
}

export {
    PARCEL_AGING_BINS,
    PARCEL_BULKY_RULE,
    PARCEL_PACKAGE_FILTERS,
    classifyParcelOperators,
    createParcelAgingDistribution,
    createParcelColumnDistribution,
    createParcelOperatorStats,
    createParcelRow,
    createParcelSummary,
    filterParcelPackageRows,
    formatParcelOperatorName,
    getParcelOperatorKey,
    isParcelOperator,
    isParcelScannedRow,
    normalizeParcelColumnName,
    normalizeParcelCountType,
    normalizeParcelFilter,
    normalizeParcelText,
    parseParcelAgingHours,
    parseParcelTimestamp,
};
