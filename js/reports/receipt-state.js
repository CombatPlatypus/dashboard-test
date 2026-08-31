/* OUVINTES DO ESTADO */

const receiptStateListeners =
    new Set();

/* CAMPOS ACEITOS */

const receiptGeneralFields =
    new Set([
        "window",
        "expectedVolume",
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
            normalizeReceiptQuantity(
                values.packagesReceived,
            ),

        errorQuantity:
            normalizeReceiptQuantity(
                values.errorQuantity,
            ),
    };
}

/* ESTADO DO RECEBIMENTO */

const receiptState = {
    window: "",
    expectedVolume: null,
    operators: [],
};

/* CRIA UMA CÓPIA DO ESTADO */

function getReceiptState() {
    return {
        window:
            receiptState.window,

        expectedVolume:
            receiptState.expectedVolume,

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
            ? state.operators
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

    const normalizedValue =
        field === "window"
            ? normalizeReceiptText(
                value,
            )
            : normalizeReceiptQuantity(
                value,
            );

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

    const normalizedValue =
        field === "labeler"
            ? normalizeReceiptText(
                value,
            )
            : normalizeReceiptQuantity(
                value,
            );

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
    receiptState.window = "";
    receiptState.expectedVolume = null;
    receiptState.operators = [];

    nextReceiptOperatorId = 1;

    notifyReceiptState({
        type: "receipt-reset",
    });

    return true;
}

export {
    getReceiptState,
    getReceiptSummary,
    replaceReceiptOperators,
    resetReceiptReport,
    subscribeReceiptState,
    updateReceiptGeneralField,
    updateReceiptOperator,
};