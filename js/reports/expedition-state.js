/* OUVINTES DO ESTADO */

const expeditionStateListeners =
    new Set();

const expeditionWindows =
    new Set([
        "AM",
        "PM1",
        "PM2",
    ]);

/* NORMALIZAÇÕES */

function normalizeExpeditionText(
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

function normalizeExpeditionQuantity(
    value,
) {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const numericValue =
        typeof value === "number"
            ? value
            : Number(
                String(value)
                    .replace(
                        /[.\s]/g,
                        "",
                    )
                    .trim(),
            );

    return (
        Number.isSafeInteger(
            numericValue,
        ) &&
        numericValue >= 0
    )
        ? numericValue
        : null;
}

function normalizeExpeditionStatus(
    value,
) {
    return normalizeExpeditionText(
        value,
    )
        .normalize(
            "NFD",
        )
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase();
}

function getExpeditionOperatorKey(
    value,
) {
    return normalizeExpeditionText(
        value,
    ).toLocaleLowerCase(
        "pt-BR",
    );
}

function createExpeditionErrorStreet(
    values = {},
) {
    return {
        name:
            normalizeExpeditionText(
                values.name,
            ),

        guardian:
            normalizeExpeditionText(
                values.guardian,
            ),

        sortingErrors:
            normalizeExpeditionQuantity(
                values.sortingErrors,
            ) ?? 0,

        labelingErrors:
            normalizeExpeditionQuantity(
                values.labelingErrors,
            ) ?? 0,
    };
}

function allocateExpeditionQuantities(
    values,
    targetTotal,
) {
    const quantities =
        Array.isArray(values)
            ? values.map(
                function (value) {
                    return (
                        normalizeExpeditionQuantity(
                            value,
                        ) ?? 0
                    );
                },
            )
            : [];

    const total =
        normalizeExpeditionQuantity(
            targetTotal,
        ) ?? 0;

    if (quantities.length === 0) {
        return [];
    }

    const sourceTotal =
        quantities.reduce(
            function (
                sum,
                value,
            ) {
                return sum + value;
            },
            0,
        );

    if (sourceTotal === total) {
        return quantities;
    }

    if (sourceTotal === 0) {
        return quantities.map(
            function (
                value,
                index,
            ) {
                return index === 0
                    ? total
                    : 0;
            },
        );
    }

    const allocations =
        quantities.map(
            function (value) {
                const exactValue =
                    value *
                    total /
                    sourceTotal;

                return {
                    value:
                        Math.floor(
                            exactValue,
                        ),

                    remainder:
                        exactValue -
                        Math.floor(
                            exactValue,
                        ),
                };
            },
        );

    let remaining =
        total -
        allocations.reduce(
            function (
                sum,
                allocation,
            ) {
                return (
                    sum +
                    allocation.value
                );
            },
            0,
        );

    const allocationOrder =
        allocations
            .map(
                function (
                    allocation,
                    index,
                ) {
                    return {
                        index,
                        remainder:
                            allocation.remainder,
                    };
                },
            )
            .sort(
                function (
                    first,
                    second,
                ) {
                    return (
                        second.remainder -
                            first.remainder ||
                        first.index -
                            second.index
                    );
                },
            );

    for (
        let index = 0;
        index < remaining;
        index += 1
    ) {
        allocations[
            allocationOrder[
                index %
                    allocationOrder.length
            ].index
        ].value += 1;
    }

    return allocations.map(
        function (allocation) {
            return allocation.value;
        },
    );
}

function calculateExpeditionRate(
    value,
    total,
) {
    if (
        value === null ||
        value === undefined ||
        total === null ||
        total === undefined ||
        !Number.isFinite(
            Number(value),
        ) ||
        !Number.isFinite(
            Number(total),
        ) ||
        Number(total) <= 0
    ) {
        return null;
    }

    return (
        Number(value) /
        Number(total)
    );
}

/* CRIA UM REGISTRO DE ROTA */

function createExpeditionRoute(
    values = {},
) {
    return {
        code:
            normalizeExpeditionText(
                values.code,
            ).toUpperCase(),

        corridor:
            normalizeExpeditionText(
                values.corridor,
            ).toUpperCase(),

        initialOrders:
            normalizeExpeditionQuantity(
                values.initialOrders,
            ),

        finalOrders:
            normalizeExpeditionQuantity(
                values.finalOrders,
            ),

        scannedOrders:
            normalizeExpeditionQuantity(
                values.scannedOrders,
            ),

        missortedOrders:
            normalizeExpeditionQuantity(
                values.missortedOrders,
            ),

        missingOrders:
            normalizeExpeditionQuantity(
                values.missingOrders,
            ),

        validationStartTime:
            normalizeExpeditionText(
                values.validationStartTime,
            ),

        validationEndTime:
            normalizeExpeditionText(
                values.validationEndTime,
            ),

        validationDurationSeconds:
            normalizeExpeditionQuantity(
                values.validationDurationSeconds,
            ),

        validationOperator:
            normalizeExpeditionText(
                values.validationOperator,
            ),

        revalidationOperator:
            normalizeExpeditionText(
                values.revalidationOperator,
            ),

        revalidatedCount:
            normalizeExpeditionQuantity(
                values.revalidatedCount,
            ) ?? 0,

        status:
            normalizeExpeditionText(
                values.status,
            ),

        remark:
            normalizeExpeditionText(
                values.remark,
            ),
    };
}

/* ESTADO DA EXPEDIÇÃO */

const expeditionState = {
    window: "AM",
    sourceFileName: "",

    errorSourceFileName: "",
    hasErrorData: false,

    errorTotals: {
        sortingErrors: 0,
        labelingErrors: 0,
    },

    errorStreets: [],

    revertedErrors: 0,
    revertedSortingErrors: 0,
    revertedLabelingErrors: 0,

    routesOnFloor:
        null,

    unknownOrders: 0,
    exceptionOrders: 0,

    excludedOperatorKeys:
        new Set(),

    routes: [],
};

/* VERIFICA SE UMA ROTA FOI CONFERIDA */

function isExpeditionValidatedRoute(
    route,
) {
    const status =
        normalizeExpeditionStatus(
            route?.status,
        );

    return (
        status === "validated" ||
        status === "validado"
    );
}

function getExpeditionExcludedOperatorKeys(
    state,
) {
    const receivedKeys =
        state?.excludedOperatorKeys instanceof
            Set
            ? Array.from(
                state.excludedOperatorKeys,
            )
            : Array.isArray(
                state?.excludedOperatorKeys,
            )
                ? state.excludedOperatorKeys
                : [];

    return new Set(
        receivedKeys
            .map(
                getExpeditionOperatorKey,
            )
            .filter(Boolean),
    );
}

/* CALCULA OS PACOTES DUPLICADOS DE UMA ROTA */

function getExpeditionDuplicatedOrders(
    route,
) {
    const scannedOrders =
        route?.scannedOrders;

    const finalOrders =
        route?.finalOrders;

    const missortedOrders =
        route?.missortedOrders;

    if (
        scannedOrders === null ||
        scannedOrders === undefined ||
        finalOrders === null ||
        finalOrders === undefined ||
        missortedOrders === null ||
        missortedOrders === undefined
    ) {
        return 0;
    }

    return Math.max(
        scannedOrders -
            finalOrders -
            missortedOrders,
        0,
    );
}

/* CRIA UMA CÓPIA DO ESTADO */

function getExpeditionState() {
    return {
        window:
            expeditionState.window,

        sourceFileName:
            expeditionState.sourceFileName,

        errorSourceFileName:
            expeditionState.errorSourceFileName,

        hasErrorData:
            expeditionState.hasErrorData,

        errorTotals: {
            ...expeditionState.errorTotals,
        },

        errorStreets:
            expeditionState.errorStreets
                .map(
                    function (street) {
                        return {
                            ...street,
                        };
                    },
                ),

        revertedErrors:
            expeditionState.revertedErrors,

        revertedSortingErrors:
            expeditionState
                .revertedSortingErrors,

        revertedLabelingErrors:
            expeditionState
                .revertedLabelingErrors,

        routesOnFloor:
            expeditionState.routesOnFloor,

        unknownOrders:
            expeditionState.unknownOrders,

        exceptionOrders:
            expeditionState.exceptionOrders,

        excludedOperatorKeys:
            Array.from(
                expeditionState
                    .excludedOperatorKeys,
            ),   

        routes:
            expeditionState.routes.map(
                function (route) {
                    return {
                        ...route,
                    };
                },
            ),
    };
}

/* CALCULA O RESUMO GERAL */

function getExpeditionSummary(
    state = getExpeditionState(),
) {
    const routes =
        Array.isArray(
            state.routes,
        )
            ? state.routes
            : [];

    const validatedRoutes =
        routes.filter(
            isExpeditionValidatedRoute,
        );

    const excludedOperatorKeys =
        getExpeditionExcludedOperatorKeys(
            state,
        );

    const selectedValidatedRoutes =
        validatedRoutes.filter(
            function (route) {
                const operatorKey =
                    getExpeditionOperatorKey(
                        route.validationOperator,
                    );

                return (
                    !operatorKey ||
                    !excludedOperatorKeys.has(
                        operatorKey,
                    )
                );
            },
        );

    const selectedOperatorCount =
        new Set(
            selectedValidatedRoutes
                .map(
                    function (route) {
                        return (
                            getExpeditionOperatorKey(
                                route.validationOperator,
                            )
                        );
                    },
                )
                .filter(Boolean),
        ).size;

    const totals =
    selectedValidatedRoutes.reduce(
        function (
            summary,
            route,
        ) {
            summary.volumeChecked +=
                route.scannedOrders ?? 0;

            summary.missingOrders +=
                route.missingOrders ?? 0;

            summary.missortedOrders +=
                route.missortedOrders ?? 0;

            summary.duplicatedOrders +=
                getExpeditionDuplicatedOrders(
                    route,
                );

            return summary;
        },
        {
            volumeChecked: 0,
            missingOrders: 0,
            duplicatedOrders: 0,
            missortedOrders: 0,
        },
    );

    const validationTimes =
        selectedValidatedRoutes.reduce(
            function (
                times,
                route,
            ) {
                const startTime =
                    Date.parse(
                        String(
                            route.validationStartTime ||
                            "",
                        ).replace(
                            " ",
                            "T",
                        ),
                    );

                const endTime =
                    Date.parse(
                        String(
                            route.validationEndTime ||
                            "",
                        ).replace(
                            " ",
                            "T",
                        ),
                    );

                if (
                    Number.isFinite(
                        startTime,
                    )
                ) {
                    times.first =
                        Math.min(
                            times.first,
                            startTime,
                        );
                }

                if (
                    Number.isFinite(
                        endTime,
                    )
                ) {
                    times.last =
                        Math.max(
                            times.last,
                            endTime,
                        );
                }

                return times;
            },
            {
                first:
                    Number.POSITIVE_INFINITY,

                last:
                    Number.NEGATIVE_INFINITY,
            },
        );

    const canCalculateExpeditionDuration =
        Number.isFinite(
            validationTimes.first,
        ) &&
        Number.isFinite(
            validationTimes.last,
        ) &&
        validationTimes.last >=
            validationTimes.first;

    return {
        hasData:
            routes.length > 0,

        totalRoutes:
            routes.length,

    validatedRoutes:
        selectedValidatedRoutes.length,

    operatorCount:
        selectedOperatorCount,

    routesOnFloor:
        state.routesOnFloor ??
        null,

        expeditionDurationSeconds:
            canCalculateExpeditionDuration
                ? Math.round(
                    (
                        validationTimes.last -
                        validationTimes.first
                    ) /
                    1000,
                )
                : null,

        unknownOrders:
            state.unknownOrders ??
            0,

        exceptionOrders:
            state.exceptionOrders ??
            0,

        ...totals,
    };
}

/* AGRUPA AS ROTAS POR CONFERENTE */

function getExpeditionOperatorRanking(
    state = getExpeditionState(),
) {
    const routes =
        Array.isArray(
            state.routes,
        )
            ? state.routes
            : [];

    const operators =
        new Map();

    const excludedOperatorKeys =
        getExpeditionExcludedOperatorKeys(
            state,
        );

    routes
        .filter(
            isExpeditionValidatedRoute,
        )
        .forEach(
            function (route) {
                const operator =
                    normalizeExpeditionText(
                        route.validationOperator,
                    );

                if (!operator) {
                    return;
                }

                const operatorKey =
                    operator
                        .toLocaleLowerCase(
                            "pt-BR",
                        );

                if (
                    !operators.has(
                        operatorKey,
                    )
                ) {
                    operators.set(
                        operatorKey,
                        {
                            operator,
                            selected:
                                !excludedOperatorKeys
                                    .has(
                                        operatorKey,
                                    ),
                            routesChecked: 0,
                            volumeChecked: 0,
                            totalDurationSeconds: 0,
                            routesWithDuration: 0,
                            bestDurationSeconds: null,
                            worstDurationSeconds: null,
                            missingOrders: 0,
                            duplicatedOrders: 0,
                            missortedOrders: 0,
                        },
                    );
                }

                const summary =
                    operators.get(
                        operatorKey,
                    );

                summary.routesChecked += 1;

                summary.volumeChecked +=
                    route.scannedOrders ?? 0;

                summary.missingOrders +=
                    route.missingOrders ?? 0;

                summary.missortedOrders +=
                    route.missortedOrders ?? 0;

                summary.duplicatedOrders +=
                    getExpeditionDuplicatedOrders(
                        route,
                    );

                const duration =
                    route.validationDurationSeconds;

                if (
                    duration !== null &&
                    duration !== undefined &&
                    Number.isFinite(
                        Number(duration),
                    )
                ) {
                    const numericDuration =
                        Number(duration);

                    summary.totalDurationSeconds +=
                        numericDuration;

                    summary.routesWithDuration +=
                        1;

                    summary.bestDurationSeconds =
                        summary.bestDurationSeconds ===
                            null
                            ? numericDuration
                            : Math.min(
                                summary.bestDurationSeconds,
                                numericDuration,
                            );

                    summary.worstDurationSeconds =
                        summary.worstDurationSeconds ===
                            null
                            ? numericDuration
                            : Math.max(
                                summary.worstDurationSeconds,
                                numericDuration,
                            );
                }
            },
        );

    return Array.from(
        operators.values(),
    )
        .map(
            function (operator) {
                return {
                    ...operator,

                    averageDurationSeconds:
                        operator.routesWithDuration > 0
                            ? (
                                operator
                                    .totalDurationSeconds /
                                operator
                                    .routesWithDuration
                            )
                            : null,
                };
            },
        )
        .sort(
            function (
                first,
                second,
            ) {
                return (
                    second.routesChecked -
                        first.routesChecked ||

                    (
                        first.averageDurationSeconds ??
                        Number.POSITIVE_INFINITY
                    ) -
                    (
                        second.averageDurationSeconds ??
                        Number.POSITIVE_INFINITY
                    ) ||

                    first.operator.localeCompare(
                        second.operator,
                        "pt-BR",
                    )
                );
            },
        );
}

/* CALCULA AS TABELAS DE ERROS */

function getLegacyExpeditionErrorAnalysis(
    state = getExpeditionState(),
) {
    const summary =
        getExpeditionSummary(
            state,
        );

    const hasSpXData =
        summary.hasData;

    const hasErrorData =
        state.hasErrorData ===
        true;

    const spxTotal =
        hasSpXData
            ? summary.missortedOrders
            : null;

    const rawSortingErrors =
        normalizeExpeditionQuantity(
            state.errorTotals
                ?.sortingErrors,
        ) ?? 0;

    const rawLabelingErrors =
        normalizeExpeditionQuantity(
            state.errorTotals
                ?.labelingErrors,
        ) ?? 0;

    const spreadsheetTotal =
        rawSortingErrors +
        rawLabelingErrors;

    const canCalculate =
        hasSpXData &&
        hasErrorData;

    if (!canCalculate) {
        return {
            hasSpXData,
            hasErrorData,
            canCalculate: false,

            spreadsheetTotal:
                hasErrorData
                    ? spreadsheetTotal
                    : null,

            spxTotal,
            sortingErrors: null,
            labelingErrors: null,
            totalErrors: spxTotal,

            errorRate:
                calculateExpeditionRate(
                    spxTotal,
                    summary.volumeChecked,
                ),

            revertedSortingErrors: null,
            revertedLabelingErrors: null,
            totalRevertedErrors: null,
            revertedRate: null,

            finalSortingErrors: null,
            finalLabelingErrors: null,
            finalErrors: null,
            finalRate: null,

            hasDivergence: false,
            balanceDifference: null,
            streets: [],
        };
    }

    const balancedTypes =
        spreadsheetTotal > 0
            ? allocateExpeditionQuantities(
                [
                    rawSortingErrors,
                    rawLabelingErrors,
                ],
                spxTotal,
            )
            : [
                spxTotal,
                0,
            ];

    const sortingErrors =
        balancedTypes[0];

    const labelingErrors =
        balancedTypes[1];

    const streets =
        (
            Array.isArray(
                state.errorStreets,
            )
                ? state.errorStreets
                : []
        ).map(
            createExpeditionErrorStreet,
        );

    const mappedSortingErrors =
        streets.reduce(
            function (
                total,
                street,
            ) {
                return (
                    total +
                    street.sortingErrors
                );
            },
            0,
        );

    const mappedLabelingErrors =
        streets.reduce(
            function (
                total,
                street,
            ) {
                return (
                    total +
                    street.labelingErrors
                );
            },
            0,
        );

    const unassignedSortingErrors =
        Math.max(
            rawSortingErrors -
                mappedSortingErrors,
            0,
        );

    const unassignedLabelingErrors =
        Math.max(
            rawLabelingErrors -
                mappedLabelingErrors,
            0,
        );

    if (
        unassignedSortingErrors > 0 ||
        unassignedLabelingErrors > 0
    ) {
        streets.push({
            name:
                "Não identificada",

            guardian: "",

            sortingErrors:
                unassignedSortingErrors,

            labelingErrors:
                unassignedLabelingErrors,
        });
    }

    const ensureUnassignedStreet =
        function () {
            let unassignedStreet =
                streets.find(
                    function (street) {
                        return (
                            street.name ===
                            "Não identificada"
                        );
                    },
                );

            if (!unassignedStreet) {
                unassignedStreet = {
                    name:
                        "Não identificada",

                    guardian: "",
                    sortingErrors: 0,
                    labelingErrors: 0,
                };

                streets.push(
                    unassignedStreet,
                );
            }

            return unassignedStreet;
        };

    if (
        sortingErrors > 0 &&
        streets.every(
            function (street) {
                return (
                    street.sortingErrors ===
                    0
                );
            },
        )
    ) {
        ensureUnassignedStreet()
            .sortingErrors = 1;
    }

    if (
        labelingErrors > 0 &&
        streets.every(
            function (street) {
                return (
                    street.labelingErrors ===
                    0
                );
            },
        )
    ) {
        ensureUnassignedStreet()
            .labelingErrors = 1;
    }

    const balancedSortingByStreet =
        allocateExpeditionQuantities(
            streets.map(
                function (street) {
                    return street.sortingErrors;
                },
            ),
            sortingErrors,
        );

    const balancedLabelingByStreet =
        allocateExpeditionQuantities(
            streets.map(
                function (street) {
                    return street.labelingErrors;
                },
            ),
            labelingErrors,
        );

    const totalErrors =
        spxTotal;

    const revertedSortingErrors =
        normalizeExpeditionQuantity(
            state.revertedSortingErrors,
        ) ?? 0;

    const revertedLabelingErrors =
        normalizeExpeditionQuantity(
            state.revertedLabelingErrors,
        ) ?? 0;

    const totalRevertedErrors =
        revertedSortingErrors +
        revertedLabelingErrors;

    const finalSortingErrors =
        sortingErrors -
        revertedSortingErrors;

    const finalLabelingErrors =
        labelingErrors -
        revertedLabelingErrors;

    const finalErrors =
        finalSortingErrors +
        finalLabelingErrors;

    return {
        hasSpXData,
        hasErrorData,
        canCalculate: true,

        spreadsheetTotal,
        spxTotal,
        sortingErrors,
        labelingErrors,
        totalErrors,

        errorRate:
            calculateExpeditionRate(
                totalErrors,
                summary.volumeChecked,
            ),

        revertedSortingErrors,
        revertedLabelingErrors,
        totalRevertedErrors,

        revertedRate:
            calculateExpeditionRate(
                totalRevertedErrors,
                totalErrors,
            ),

        finalSortingErrors,
        finalLabelingErrors,
        finalErrors,

        finalRate:
            calculateExpeditionRate(
                finalErrors,
                summary.volumeChecked,
            ),

        hasDivergence:
            spreadsheetTotal !==
            spxTotal,

        balanceDifference:
            spxTotal -
            spreadsheetTotal,

        streets:
            streets.map(
                function (
                    street,
                    index,
                ) {
                    const streetSortingErrors =
                        balancedSortingByStreet[
                            index
                        ];

                    const streetLabelingErrors =
                        balancedLabelingByStreet[
                            index
                        ];

                    const streetTotalErrors =
                        streetSortingErrors +
                        streetLabelingErrors;

                    return {
                        name:
                            street.name,

                        guardian:
                            street.guardian,

                        sortingErrors:
                            streetSortingErrors,

                        labelingErrors:
                            streetLabelingErrors,

                        totalErrors:
                            streetTotalErrors,

                        errorRate:
                            calculateExpeditionRate(
                                streetTotalErrors,
                                totalErrors,
                            ),
                    };
                },
            ),
    };
}

/* AGRUPA AUSENTES E CLASSIFICADOS INCORRETAMENTE POR RUA */

function getExpeditionStreetAnalysis(
    state,
    totalErrors,
) {
    const routes = Array.isArray(state.routes)
        ? state.routes
        : [];

    const excludedOperatorKeys =
        getExpeditionExcludedOperatorKeys(state);

    const streets = new Map();

    routes
        .filter(isExpeditionValidatedRoute)
        .filter(function (route) {
            const operatorKey =
                getExpeditionOperatorKey(
                    route.validationOperator,
                );

            return !excludedOperatorKeys.has(
                operatorKey,
            );
        })
        .forEach(function (route) {
            const name =
                normalizeExpeditionText(
                    route.corridor,
                ) || "Não identificada";

            if (!streets.has(name)) {
                streets.set(name, {
                    name,
                    missingOrders: 0,
                    totalErrors: 0,
                    guardians: new Map(),
                });
            }

            const street = streets.get(name);
            const missingOrders =
                normalizeExpeditionQuantity(
                    route.missingOrders,
                ) ?? 0;

            const missortedOrders =
                normalizeExpeditionQuantity(
                    route.missortedOrders,
                ) ?? 0;

            street.missingOrders +=
                missingOrders;

            street.totalErrors +=
                missortedOrders;

            const guardian =
                normalizeExpeditionText(
                    route.validationOperator,
                );

            if (guardian) {
                const guardianSummary =
                    street.guardians.get(guardian) || {
                        errors: 0,
                        routes: 0,
                    };

                guardianSummary.errors +=
                    missortedOrders;

                guardianSummary.routes += 1;

                street.guardians.set(
                    guardian,
                    guardianSummary,
                );
            }
        });

    return Array.from(streets.values())
        .map(function (street) {
            const guardian =
                Array.from(
                    street.guardians.entries(),
                )
                    .sort(function (
                        first,
                        second,
                    ) {
                        return (
                            second[1].errors -
                                first[1].errors ||
                            second[1].routes -
                                first[1].routes ||
                            first[0].localeCompare(
                                second[0],
                                "pt-BR",
                            )
                        );
                    })[0]?.[0] || "";

            return {
                name: street.name,
                guardian,
                missingOrders:
                    street.missingOrders,
                totalErrors:
                    street.totalErrors,
                errorRate:
                    calculateExpeditionRate(
                        street.totalErrors,
                        totalErrors,
                    ),
            };
        })
        .sort(function (first, second) {
            return first.name.localeCompare(
                second.name,
                "pt-BR",
                {
                    numeric: true,
                },
            );
        });
}

/* CALCULA AS TABELAS DE ERROS NO MODELO ATUAL */

function getExpeditionErrorAnalysis(
    state = getExpeditionState(),
) {
    const summary =
        getExpeditionSummary(state);

    const hasSpXData =
        summary.hasData;

    const hasErrorData =
        state.hasErrorData === true;

    const spxTotal = hasSpXData
        ? summary.missortedOrders
        : null;

    const rawSortingErrors =
        normalizeExpeditionQuantity(
            state.errorTotals?.sortingErrors,
        ) ?? 0;

    const rawLabelingErrors =
        normalizeExpeditionQuantity(
            state.errorTotals?.labelingErrors,
        ) ?? 0;

    const spreadsheetTotal =
        rawSortingErrors +
        rawLabelingErrors;

    const streets = hasSpXData
        ? getExpeditionStreetAnalysis(
            state,
            spxTotal,
        )
        : [];

    const canCalculate =
        hasSpXData &&
        hasErrorData;

    if (!canCalculate) {
        const visibleTotal = hasSpXData
            ? spxTotal
            : hasErrorData
                ? spreadsheetTotal
                : null;

        return {
            hasSpXData,
            hasErrorData,
            canCalculate: false,
            spreadsheetTotal:
                hasErrorData
                    ? spreadsheetTotal
                    : null,
            spxTotal,
            sortingErrors:
                hasErrorData
                    ? rawSortingErrors
                    : null,
            labelingErrors:
                hasErrorData
                    ? rawLabelingErrors
                    : null,
            totalErrors: visibleTotal,
            errorRate:
                calculateExpeditionRate(
                    visibleTotal,
                    hasSpXData
                        ? summary.volumeChecked
                        : null,
                ),
            revertedSortingErrors: null,
            revertedLabelingErrors: null,
            totalRevertedErrors: null,
            revertedRate: null,
            finalSortingErrors: null,
            finalLabelingErrors: null,
            finalErrors: null,
            finalRate: null,
            hasDivergence: false,
            balanceDifference: null,
            streets,
        };
    }

    const balancedTypes =
        spreadsheetTotal > 0
            ? allocateExpeditionQuantities(
                [
                    rawSortingErrors,
                    rawLabelingErrors,
                ],
                spxTotal,
            )
            : [
                spxTotal,
                0,
            ];

    const sortingErrors =
        balancedTypes[0];

    const labelingErrors =
        balancedTypes[1];

    const requestedRevertedErrors =
        normalizeExpeditionQuantity(
            state.revertedErrors,
        ) ?? 0;

    const totalRevertedErrors =
        Math.min(
            requestedRevertedErrors,
            spxTotal,
        );

    const revertedTypes =
        allocateExpeditionQuantities(
            [
                sortingErrors,
                labelingErrors,
            ],
            totalRevertedErrors,
        );

    const revertedSortingErrors =
        revertedTypes[0];

    const revertedLabelingErrors =
        revertedTypes[1];

    const finalSortingErrors =
        sortingErrors -
        revertedSortingErrors;

    const finalLabelingErrors =
        labelingErrors -
        revertedLabelingErrors;

    const finalErrors =
        finalSortingErrors +
        finalLabelingErrors;

    return {
        hasSpXData,
        hasErrorData,
        canCalculate: true,
        spreadsheetTotal,
        spxTotal,
        sortingErrors,
        labelingErrors,
        totalErrors: spxTotal,
        errorRate:
            calculateExpeditionRate(
                spxTotal,
                summary.volumeChecked,
            ),
        revertedSortingErrors,
        revertedLabelingErrors,
        totalRevertedErrors,
        revertedRate:
            calculateExpeditionRate(
                totalRevertedErrors,
                spxTotal,
            ),
        finalSortingErrors,
        finalLabelingErrors,
        finalErrors,
        finalRate:
            calculateExpeditionRate(
                finalErrors,
                summary.volumeChecked,
            ),
        hasDivergence:
            spreadsheetTotal !== spxTotal,
        balanceDifference:
            spxTotal - spreadsheetTotal,
        streets,
    };
}

/* NOTIFICA OS OUVINTES */

function notifyExpeditionState(
    change,
) {
    const stateSnapshot =
        getExpeditionState();

    expeditionStateListeners.forEach(
        function (listener) {
            listener(
                stateSnapshot,
                change,
            );
        },
    );
}

/* ACOMPANHA AS ALTERAÇÕES */

function subscribeExpeditionState(
    listener,
) {
    if (
        typeof listener !==
        "function"
    ) {
        return function () {};
    }

    expeditionStateListeners.add(
        listener,
    );

    return function () {
        expeditionStateListeners.delete(
            listener,
        );
    };
}

/* ALTERA A JANELA */

function updateExpeditionWindow(
    value,
) {
    const windowValue =
        normalizeExpeditionText(
            value,
        ).toUpperCase();

    if (
        !expeditionWindows.has(
            windowValue,
        )
    ) {
        return false;
    }

    if (
        expeditionState.window ===
        windowValue
    ) {
        return true;
    }

    expeditionState.window =
        windowValue;

    notifyExpeditionState({
        type: "window-updated",
    });

    return true;
}

/* ALTERA UMA QUANTIDADE MANUAL */

function updateExpeditionManualQuantity(
    field,
    value,
) {
    if (
        field !== "routesOnFloor" &&
        field !== "unknownOrders" &&
        field !== "exceptionOrders" &&
        field !== "revertedErrors" &&
        field !== "revertedSortingErrors" &&
        field !== "revertedLabelingErrors"
    ) {
        return false;
    }

    const normalizedValue =
        normalizeExpeditionQuantity(
            value,
        );

    const isEmpty =
        value === "" ||
        value === null ||
        value === undefined;

    if (
        normalizedValue === null &&
        !isEmpty
    ) {
        return false;
    }

    if (
        expeditionState[field] ===
        normalizedValue
    ) {
        return true;
    }

    expeditionState[field] =
        normalizedValue;

    notifyExpeditionState({
        type:
            "manual-quantity-updated",

        field,
    });

    return true;
}

/* ALTERA A SELEÇÃO DE UM CONFERENTE */

function updateExpeditionOperatorSelection(
    operator,
    selected,
) {
    const operatorKey =
        getExpeditionOperatorKey(
            operator,
        );

    if (!operatorKey) {
        return false;
    }

    const wasExcluded =
        expeditionState
            .excludedOperatorKeys
            .has(
                operatorKey,
            );

    if (selected) {
        expeditionState
            .excludedOperatorKeys
            .delete(
                operatorKey,
            );
    } else {
        expeditionState
            .excludedOperatorKeys
            .add(
                operatorKey,
            );
    }

    const isExcluded =
        expeditionState
            .excludedOperatorKeys
            .has(
                operatorKey,
            );

    if (
        wasExcluded ===
        isExcluded
    ) {
        return true;
    }

    notifyExpeditionState({
        type:
            "operator-selection-updated",

        operatorKey,

        selected:
            !isExcluded,
    });

    return true;
}

/* SUBSTITUI AS ROTAS IMPORTADAS */

function replaceExpeditionRoutes(
    routes,
    sourceFileName = "",
) {
    const receivedRoutes =
        Array.isArray(
            routes,
        )
            ? routes
            : [];

    expeditionState.routes =
        receivedRoutes
            .map(
                createExpeditionRoute,
            )
            .filter(
                function (route) {
                    return route.code !== "";
                },
            );

    const validatedRouteCount =
        expeditionState.routes.filter(
            isExpeditionValidatedRoute,
        ).length;

    expeditionState.routesOnFloor =
        Math.max(
            expeditionState.routes.length -
                validatedRouteCount,
            0,
        );

    expeditionState.sourceFileName =
        normalizeExpeditionText(
            sourceFileName,
        );

    expeditionState.unknownOrders =
        0;

    expeditionState.exceptionOrders =
        0;

    expeditionState
        .excludedOperatorKeys
        .clear();

    notifyExpeditionState({
        type: "routes-replaced",
    });

    return true;
}

/* SUBSTITUI OS DADOS DA PLANILHA DE ERROS */

function replaceExpeditionErrorData(
    errorData,
    sourceFileName = "",
) {
    expeditionState.errorTotals = {
        sortingErrors:
            normalizeExpeditionQuantity(
                errorData?.sortingErrors,
            ) ?? 0,

        labelingErrors:
            normalizeExpeditionQuantity(
                errorData?.labelingErrors,
            ) ?? 0,
    };

    expeditionState.errorStreets =
        (
            Array.isArray(
                errorData?.streets,
            )
                ? errorData.streets
                : []
        ).map(
            createExpeditionErrorStreet,
        );

    expeditionState.errorSourceFileName =
        normalizeExpeditionText(
            sourceFileName,
        );

    expeditionState.hasErrorData =
        true;

    expeditionState.revertedErrors =
        0;

    expeditionState.revertedSortingErrors =
        0;

    expeditionState.revertedLabelingErrors =
        0;

    notifyExpeditionState({
        type:
            "error-data-replaced",
    });

    return true;
}

/* LIMPA O RELATÓRIO */

function resetExpeditionReport() {
    expeditionState.window =
        "AM";

    expeditionState.routesOnFloor =
        null;

    expeditionState.sourceFileName =
        "";

    expeditionState.errorSourceFileName =
        "";

    expeditionState.hasErrorData =
        false;

    expeditionState.errorTotals = {
        sortingErrors: 0,
        labelingErrors: 0,
    };

    expeditionState.errorStreets =
        [];

    expeditionState.revertedErrors =
        0;

    expeditionState.revertedSortingErrors =
        0;

    expeditionState.revertedLabelingErrors =
        0;

    expeditionState.unknownOrders =
        0;

    expeditionState.exceptionOrders =
        0;

    expeditionState
        .excludedOperatorKeys
        .clear();

    expeditionState.routes =
        [];

    notifyExpeditionState({
        type:
            "expedition-reset",
    });

    return true;
}

export {
    getExpeditionErrorAnalysis,
    getExpeditionDuplicatedOrders,
    getExpeditionOperatorRanking,
    getExpeditionState,
    getExpeditionSummary,
    isExpeditionValidatedRoute,
    replaceExpeditionErrorData,
    replaceExpeditionRoutes,
    resetExpeditionReport,
    subscribeExpeditionState,
    updateExpeditionManualQuantity,
    updateExpeditionOperatorSelection,
    updateExpeditionWindow,
};
