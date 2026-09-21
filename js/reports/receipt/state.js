import {
    getReportContext,
    updateReportContextField,
} from "../core/report-context.js";

/* OUVINTES DO ESTADO */

const receiptStateListeners =
    new Set();

/* CAMPOS ACEITOS */

const receiptGeneralFields =
    new Set([
        "window",
        "expectedVolume",
        "useTotalErrorParticipation",

    ]);

const receiptOperatorFields =
    new Set([
        "labeler",
        "errorQuantity",
    ]);

/* CONTROLE INTERNO */

let nextReceiptOperatorId = 1;

/* NORMALIZA UM TEXTO */

function normalizeReceiptText(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(
        value,
    ).trim();
}

/* NORMALIZA UMA QUANTIDADE */

function normalizeReceiptQuantity(
    value,
) {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value === "number"
    ) {
        return (
            Number.isSafeInteger(value) &&
            value >= 0
        )
            ? value
            : null;
    }

    const normalizedValue =
        String(value).trim();

    if (
        !/^\d+$/.test(
            normalizedValue,
        )
    ) {
        return null;
    }

    const numericValue =
        Number(
            normalizedValue,
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

/* CRIA A CHAVE DE UM RECEBEDOR */

function createReceiptReceiverKey(
    receiver,
) {
    return normalizeReceiptText(
        receiver,
    )
        .toLocaleLowerCase(
            "pt-BR",
        )
        .replace(
            /\s+/g,
            " ",
        );
}

/* CRIA O REGISTRO DE UM RECEBEDOR */

function createReceiptOperatorRecord(
    values = {},
) {
    const packagesReceived =
        normalizeReceiptQuantity(
            values.packagesReceived,
        );

    const receivedErrors =
        normalizeReceiptQuantity(
            values.errorQuantity,
        );

    return {
        id:
            nextReceiptOperatorId++,

        receiver:
            normalizeReceiptText(
                values.receiver,
            ),

        labeler:
            normalizeReceiptText(
                values.labeler,
            ),

        packagesReceived:
            packagesReceived,

        errorQuantity:
            receivedErrors === null
                ? null
                : Math.min(
                    receivedErrors,
                    packagesReceived || 0,
                ),

        selected:
            values.selected !== false,
    };
}

/* ESTADO DO RECEBIMENTO */

const receiptState = {
    useTotalErrorParticipation:
        false,

    operators: [],
};

/* CRIA UMA CÓPIA DO ESTADO */

function getReceiptState() {
    const reportContext =
        getReportContext();

    return {
        window:
            reportContext.window,

        expectedVolume:
            reportContext
                .plannedVolume,

        useTotalErrorParticipation:
            receiptState
                .useTotalErrorParticipation,

        operators:
            receiptState.operators.map(
                function (
                    operator,
                ) {
                    return {
                        ...operator,
                    };
                },
            ),
    };
}

/* CALCULA O RESUMO */

function getReceiptSummary(
    state = getReceiptState(),
) {
    const operators =
        Array.isArray(
            state.operators,
        )
            ? state.operators.filter(
                function (operator) {
                    return operator.selected !==
                        false;
                },
            )
            : [];

    const hasReceivedPackages =
        operators.some(
            function (
                operator,
            ) {
                return (
                    operator.packagesReceived !==
                    null
                );
            },
        );

    const hasErrors =
        operators.some(
            function (
                operator,
            ) {
                return (
                    operator.errorQuantity !==
                    null
                );
            },
        );

    const receivedVolume =
        operators.reduce(
            function (
                total,
                operator,
            ) {
                return (
                    total +
                    (
                        operator.packagesReceived ??
                        0
                    )
                );
            },
            0,
        );

    const totalErrors =
        operators.reduce(
            function (
                total,
                operator,
            ) {
                return (
                    total +
                    (
                        operator.errorQuantity ??
                        0
                    )
                );
            },
            0,
        );

    return {
        receivedVolume:
            hasReceivedPackages
                ? receivedVolume
                : null,

        totalErrors:
            hasErrors
                ? totalErrors
                : null,
    };
}

/* NOTIFICA UMA ALTERAÇÃO */

function notifyReceiptState(
    change,
) {
    const stateSnapshot =
        getReceiptState();

    receiptStateListeners.forEach(
        function (
            listener,
        ) {
            listener(
                stateSnapshot,
                change,
            );
        },
    );
}

/* ACOMPANHA ALTERAÇÕES */

function subscribeReceiptState(
    listener,
) {
    if (
        typeof listener !==
        "function"
    ) {
        return function () {};
    }

    receiptStateListeners.add(
        listener,
    );

    return function () {
        receiptStateListeners.delete(
            listener,
        );
    };
}

/* ALTERA UM CAMPO GERAL */

function updateReceiptGeneralField(
    field,
    value,
) {
    if (
        !receiptGeneralFields.has(
            field,
        )
    ) {
        return false;
    }

    let normalizedValue;

    if (field === "window") {
        return updateReportContextField(
            field,
            value,
        );
    } else if (
        field ===
        "expectedVolume"
    ) {
        return updateReportContextField(
            "plannedVolume",
            value,
        );
    } else if (
        field ===
        "useTotalErrorParticipation"
    ) {
        normalizedValue =
            value === true;
    } else {
        normalizedValue =
            normalizeReceiptQuantity(
                value,
            );
    }

    if (
        receiptState[field] ===
        normalizedValue
    ) {
        return true;
    }

    receiptState[field] =
        normalizedValue;

    notifyReceiptState({
        type: "general-field-updated",
        field,
    });

    return true;
}

/* ALTERA UM RECEBEDOR */

function updateReceiptOperator(
    operatorId,
    field,
    value,
) {
    if (
        !receiptOperatorFields.has(
            field,
        )
    ) {
        return false;
    }

    const operator =
        receiptState.operators.find(
            function (
                currentOperator,
            ) {
                return (
                    currentOperator.id ===
                    operatorId
                );
            },
        );

    if (!operator) {
        return false;
    }

    let normalizedValue =
        field === "labeler"
            ? normalizeReceiptText(
                value,
            )
            : normalizeReceiptQuantity(
                value,
            );

    if (
        field === "errorQuantity" &&
        normalizedValue !== null
    ) {
        normalizedValue =
            Math.min(
                normalizedValue,
                operator.packagesReceived || 0,
            );
    }

    if (
        operator[field] ===
        normalizedValue
    ) {
        return true;
    }

    operator[field] =
        normalizedValue;

    notifyReceiptState({
        type: "operator-field-updated",
        operatorId,
        field,
    });

    return true;
}

/* ALTERA A SELEÇÃO DE UM RECEBEDOR */

function updateReceiptOperatorSelection(
    operatorId,
    selected,
) {
    const operator =
        receiptState.operators.find(
            function (
                currentOperator,
            ) {
                return (
                    currentOperator.id ===
                    operatorId
                );
            },
        );

    if (!operator) {
        return false;
    }

    const normalizedSelection =
        Boolean(
            selected,
        );

    if (
        operator.selected ===
        normalizedSelection
    ) {
        return true;
    }

    operator.selected =
        normalizedSelection;

    notifyReceiptState({
        type: "operator-selection-updated",
        operatorId,
        selected: normalizedSelection,
    });

    return true;
}

/* SUBSTITUI OS RECEBEDORES IMPORTADOS */

function replaceReceiptOperators(
    operators,
) {
    const receivedOperators =
        Array.isArray(
            operators,
        )
            ? operators
            : [];

    const previousOperators =
        new Map();

    receiptState.operators.forEach(
        function (
            operator,
        ) {
            const receiverKey =
                createReceiptReceiverKey(
                    operator.receiver,
                );

            if (receiverKey) {
                previousOperators.set(
                    receiverKey,
                    operator,
                );
            }
        },
    );

    receiptState.operators =
        receivedOperators
            .map(
                function (
                    values,
                ) {
                    const receivedValues =
                        values &&
                        typeof values ===
                            "object"
                            ? values
                            : {};

                    const receiver =
                        normalizeReceiptText(
                            receivedValues.receiver,
                        );

                    if (!receiver) {
                        return null;
                    }

                    const receiverKey =
                        createReceiptReceiverKey(
                            receiver,
                        );

                    const previousOperator =
                        previousOperators.get(
                            receiverKey,
                        );

                    return createReceiptOperatorRecord({
                        receiver,

                        packagesReceived:
                            receivedValues
                                .packagesReceived,

                        labeler:
                            receivedValues
                                .labeler ??
                            previousOperator
                                ?.labeler,

                        errorQuantity:
                            receivedValues
                                .errorQuantity ??
                            previousOperator
                                ?.errorQuantity,

                        selected:
                            receivedValues
                                .selected ??
                            previousOperator
                                ?.selected,
                    });
                },
            )
            .filter(
                function (
                    operator,
                ) {
                    return operator !== null;
                },
            );

    notifyReceiptState({
        type: "operators-replaced",
    });

    return true;
}

/* LIMPA O RELATÓRIO */

function resetReceiptReport() {
    receiptState
        .useTotalErrorParticipation =
            false;

    receiptState.operators = [];

    nextReceiptOperatorId = 1;

    notifyReceiptState({
        type: "receipt-reset",
    });

    return true;
}

/* RESTAURA O ESTADO COMPLETO DE UMA SESSÃO */

function restoreReceiptState(
    sessionState,
) {
    if (
        !sessionState ||
        typeof sessionState !== "object" ||
        Array.isArray(sessionState)
    ) {
        return false;
    }

    const legacyExpectedVolume =
        normalizeReceiptQuantity(
            sessionState.expectedVolume,
        );

    if (
        getReportContext()
            .plannedVolume === null &&
        legacyExpectedVolume !== null
    ) {
        updateReportContextField(
            "plannedVolume",
            legacyExpectedVolume,
        );
    }

    receiptState
        .useTotalErrorParticipation =
            Boolean(
                sessionState
                    .useTotalErrorParticipation,
            );

    nextReceiptOperatorId = 1;

    receiptState.operators =
        (
            Array.isArray(
                sessionState.operators,
            )
                ? sessionState.operators
                : []
        )
            .map(
                function (values) {
                    return createReceiptOperatorRecord(
                        values &&
                        typeof values === "object"
                            ? values
                            : {},
                    );
                },
            )
            .filter(
                function (operator) {
                    return Boolean(
                        operator.receiver,
                    );
                },
            );

    notifyReceiptState({
        type: "receipt-session-imported",
    });

    return true;
}

export {
    getReceiptState,
    getReceiptSummary,
    replaceReceiptOperators,
    resetReceiptReport,
    restoreReceiptState,
    subscribeReceiptState,
    updateReceiptGeneralField,
    updateReceiptOperator,
    updateReceiptOperatorSelection,
};
