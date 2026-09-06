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

    const totals =
        validatedRoutes.reduce(
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

    return {
        hasData:
            routes.length > 0,

        totalRoutes:
            routes.length,

        validatedRoutes:
            validatedRoutes.length,

        routesOnFloor:
            Math.max(
                routes.length -
                    validatedRoutes.length,
                0,
            ),

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
                            routesChecked: 0,
                            volumeChecked: 0,
                            totalDurationSeconds: 0,
                            routesWithDuration: 0,
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

                if (
                    route.validationDurationSeconds !==
                        null
                ) {
                    summary.totalDurationSeconds +=
                        route.validationDurationSeconds;

                    summary.routesWithDuration += 1;
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

    expeditionState.sourceFileName =
        normalizeExpeditionText(
            sourceFileName,
        );

    notifyExpeditionState({
        type: "routes-replaced",
    });

    return true;
}

/* LIMPA O RELATÓRIO */

function resetExpeditionReport() {
    expeditionState.window = "AM";
    expeditionState.sourceFileName = "";
    expeditionState.routes = [];

    notifyExpeditionState({
        type: "expedition-reset",
    });

    return true;
}

export {
    getExpeditionDuplicatedOrders,
    getExpeditionOperatorRanking,
    getExpeditionState,
    getExpeditionSummary,
    isExpeditionValidatedRoute,
    replaceExpeditionRoutes,
    resetExpeditionReport,
    subscribeExpeditionState,
    updateExpeditionWindow,
};