const receiptLinehaulListeners =
    new Set();

const receiptLinehaulWindows =
    new Set([
        "AM",
        "PM1",
        "PM2",
    ]);

const MINIMUM_RECEIPT_LINEHAUL_MANUAL_ROWS =
    9;

let nextReceiptLinehaulId = 1;

function normalizeReceiptLinehaulText(
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

function normalizeReceiptLinehaulQuantity(
    value,
) {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const quantity =
        typeof value === "number"
            ? value
            : Number(
                String(value)
                    .replace(
                        /[.\s]/g,
                        "",
                    ),
            );

    return (
        Number.isSafeInteger(
            quantity,
        ) &&
        quantity >= 0
    )
        ? quantity
        : null;
}

function normalizeReceiptLinehaulWindow(
    value,
) {
    const windowValue =
        normalizeReceiptLinehaulText(
            value,
        ).toUpperCase();

    return receiptLinehaulWindows.has(
        windowValue,
    )
        ? windowValue
        : "AM";
}

function createReceiptLinehaulKey(
    value,
) {
    return normalizeReceiptLinehaulText(
        value,
    ).toLocaleUpperCase(
        "pt-BR",
    );
}

function createReceiptLinehaulRecord(
    values = {},
) {
    return {
        id:
            nextReceiptLinehaulId++,

        code:
            createReceiptLinehaulKey(
                values.code,
            ),

        origin:
            normalizeReceiptLinehaulText(
                values.origin,
            ),

        cpt:
            normalizeReceiptLinehaulText(
                values.cpt,
            ).toUpperCase(),

        loadedOrders:
            normalizeReceiptLinehaulQuantity(
                values.loadedOrders,
            ),

        vehiclePlate:
            normalizeReceiptLinehaulText(
                values.vehiclePlate,
            ).toUpperCase(),

        selected:
            values.selected === true,
    };
}

const receiptLinehaulState = {
    window: "AM",
    expectedVolume: null,
    reversesSent: null,
    linehauls: [],
    manualEntryEnabled: false,
};

function getReceiptLinehaulState() {
    return {
        window:
            receiptLinehaulState.window,

        expectedVolume:
            receiptLinehaulState
                .expectedVolume,

        reversesSent:
            receiptLinehaulState
                .reversesSent,

        manualEntryEnabled:
            receiptLinehaulState
                .manualEntryEnabled,

        linehauls:
            receiptLinehaulState
                .linehauls
                .map(
                    function (linehaul) {
                        return {
                            ...linehaul,
                        };
                    },
                ),
    };
}

function getReceiptLinehaulSummary(
    state = getReceiptLinehaulState(),
) {
    const linehauls =
        Array.isArray(
            state.linehauls,
        )
            ? state.linehauls
            : [];

    const selectedLinehauls =
        linehauls.filter(
            function (linehaul) {
                return linehaul.selected ===
                    true;
            },
        );

    return {
        hasData:
            state.manualEntryEnabled ===
                true ||
            linehauls.length > 0,

        selectedLinehauls,

        unloadedCount:
            selectedLinehauls.length,

        unloadedVolume:
            selectedLinehauls.reduce(
                function (
                    total,
                    linehaul,
                ) {
                    return (
                        total +
                        (
                            linehaul
                                .loadedOrders ??
                            0
                        )
                    );
                },
                0,
            ),
    };
}

function notifyReceiptLinehaulState(
    change,
) {
    const state =
        getReceiptLinehaulState();

    receiptLinehaulListeners.forEach(
        function (listener) {
            listener(
                state,
                change,
            );
        },
    );
}

function subscribeReceiptLinehaulState(
    listener,
) {
    if (
        typeof listener !==
        "function"
    ) {
        return function () {};
    }

    receiptLinehaulListeners.add(
        listener,
    );

    return function () {
        receiptLinehaulListeners.delete(
            listener,
        );
    };
}

function updateReceiptLinehaulField(
    field,
    value,
) {
    let normalizedValue;

    if (field === "window") {
        normalizedValue =
            normalizeReceiptLinehaulWindow(
                value,
            );
    } else if (
        field === "expectedVolume" ||
        field === "reversesSent"
    ) {
        normalizedValue =
            normalizeReceiptLinehaulQuantity(
                value,
            );
    } else {
        return false;
    }

    if (
        receiptLinehaulState[field] ===
        normalizedValue
    ) {
        return true;
    }

    receiptLinehaulState[field] =
        normalizedValue;

    if (
        field === "window" &&
        receiptLinehaulState
            .manualEntryEnabled
    ) {
        receiptLinehaulState
            .linehauls
            .forEach(
                function (linehaul) {
                    linehaul.cpt =
                        normalizedValue;
                },
            );
    }

    notifyReceiptLinehaulState({
        type: "linehaul-field-updated",
        field,
    });

    return true;
}

function updateReceiptLinehaulRecord(
    linehaulId,
    field,
    value,
) {
    if (
        !receiptLinehaulState
            .manualEntryEnabled
    ) {
        return false;
    }

    const linehaul =
        receiptLinehaulState
            .linehauls
            .find(
                function (currentLinehaul) {
                    return currentLinehaul.id ===
                        linehaulId;
                },
            );

    if (!linehaul) {
        return false;
    }

    let normalizedValue;

    if (field === "code") {
        normalizedValue =
            createReceiptLinehaulKey(
                value,
            );
    } else if (field === "loadedOrders") {
        normalizedValue =
            normalizeReceiptLinehaulQuantity(
                value,
            );
    } else {
        return false;
    }

    if (
        linehaul[field] ===
        normalizedValue
    ) {
        return true;
    }

    linehaul[field] = normalizedValue;

    notifyReceiptLinehaulState({
        type: "linehaul-record-updated",
        linehaulId,
        field,
    });

    return true;
}

function ensureReceiptLinehaulManualRows() {
    while (
        receiptLinehaulState
            .linehauls
            .length <
        MINIMUM_RECEIPT_LINEHAUL_MANUAL_ROWS
    ) {
        receiptLinehaulState
            .linehauls
            .push(
                createReceiptLinehaulRecord({
                    cpt:
                        receiptLinehaulState
                            .window,
                }),
            );
    }
}

function enableReceiptLinehaulManualEntry() {
    receiptLinehaulState
        .manualEntryEnabled = true;

    ensureReceiptLinehaulManualRows();

    notifyReceiptLinehaulState({
        type: "linehaul-manual-entry-enabled",
    });

    return true;
}

function updateReceiptLinehaulSelection(
    linehaulId,
    selected,
) {
    const linehaul =
        receiptLinehaulState
            .linehauls
            .find(
                function (currentLinehaul) {
                    return currentLinehaul.id ===
                        linehaulId;
                },
            );

    if (!linehaul) {
        return false;
    }

    const normalizedSelection =
        selected === true;

    if (
        linehaul.selected ===
        normalizedSelection
    ) {
        return true;
    }

    linehaul.selected =
        normalizedSelection;

    notifyReceiptLinehaulState({
        type: "linehaul-selection-updated",
        linehaulId,
        selected: normalizedSelection,
    });

    return true;
}

function replaceReceiptLinehauls(
    values,
) {
    const receivedLinehauls =
        Array.isArray(values)
            ? values
            : [];

    const previousLinehauls =
        new Map(
            receiptLinehaulState
                .linehauls
                .map(
                    function (linehaul) {
                        return [
                            createReceiptLinehaulKey(
                                linehaul.code,
                            ),
                            linehaul,
                        ];
                    },
                ),
        );

    receiptLinehaulState
        .manualEntryEnabled = true;

    receiptLinehaulState.linehauls =
        receivedLinehauls
            .map(
                function (receivedValue) {
                    const value =
                        receivedValue &&
                        typeof receivedValue ===
                            "object"
                            ? receivedValue
                            : {};

                    const code =
                        createReceiptLinehaulKey(
                            value.code,
                        );

                    if (!code) {
                        return null;
                    }

                    const previousLinehaul =
                        previousLinehauls.get(
                            code,
                        );

                    return createReceiptLinehaulRecord({
                        ...value,
                        code,
                        selected:
                            value.selected ??
                            previousLinehaul
                                ?.selected ??
                            false,
                    });
                },
            )
            .filter(Boolean);

    const detectedWindow =
        receiptLinehaulState
            .linehauls
            .map(
                function (linehaul) {
                    return normalizeReceiptLinehaulText(
                        linehaul.cpt,
                    ).toUpperCase();
                },
            )
            .find(
                function (windowValue) {
                    return receiptLinehaulWindows.has(
                        windowValue,
                    );
                },
            );

    if (detectedWindow) {
        receiptLinehaulState.window =
            detectedWindow;
    }

    receiptLinehaulState.expectedVolume =
        receiptLinehaulState
            .linehauls
            .reduce(
                function (
                    total,
                    linehaul,
                ) {
                    return (
                        total +
                        (
                            linehaul
                                .loadedOrders ??
                            0
                        )
                    );
                },
                0,
            ) || null;

    ensureReceiptLinehaulManualRows();

    notifyReceiptLinehaulState({
        type: "linehauls-replaced",
    });

    return true;
}

function resetReceiptLinehaulState() {
    receiptLinehaulState.window = "AM";
    receiptLinehaulState.expectedVolume = null;
    receiptLinehaulState.reversesSent = null;
    receiptLinehaulState.linehauls = [];
    receiptLinehaulState.manualEntryEnabled =
        false;
    nextReceiptLinehaulId = 1;

    notifyReceiptLinehaulState({
        type: "linehaul-reset",
    });

    return true;
}

function restoreReceiptLinehaulState(
    sessionState,
) {
    const receivedState =
        sessionState &&
        typeof sessionState === "object" &&
        !Array.isArray(sessionState)
            ? sessionState
            : {};

    receiptLinehaulState.window =
        normalizeReceiptLinehaulWindow(
            receivedState.window,
        );

    receiptLinehaulState.expectedVolume =
        normalizeReceiptLinehaulQuantity(
            receivedState.expectedVolume,
        );

    receiptLinehaulState.reversesSent =
        normalizeReceiptLinehaulQuantity(
            receivedState.reversesSent,
        );

    receiptLinehaulState.manualEntryEnabled =
        receivedState.manualEntryEnabled ===
            true;

    nextReceiptLinehaulId = 1;

    receiptLinehaulState.linehauls =
        (
            Array.isArray(
                receivedState.linehauls,
            )
                ? receivedState.linehauls
                : []
        )
            .map(
                createReceiptLinehaulRecord,
            )
            .filter(
                function (linehaul) {
                    return (
                        receiptLinehaulState
                            .manualEntryEnabled ||
                        Boolean(
                            linehaul.code,
                        )
                    );
                },
            );

    if (
        receiptLinehaulState
            .manualEntryEnabled
    ) {
        ensureReceiptLinehaulManualRows();
    }

    notifyReceiptLinehaulState({
        type: "linehaul-session-imported",
    });

    return true;
}

export {
    enableReceiptLinehaulManualEntry,
    getReceiptLinehaulState,
    getReceiptLinehaulSummary,
    replaceReceiptLinehauls,
    resetReceiptLinehaulState,
    restoreReceiptLinehaulState,
    subscribeReceiptLinehaulState,
    updateReceiptLinehaulField,
    updateReceiptLinehaulRecord,
    updateReceiptLinehaulSelection,
};
