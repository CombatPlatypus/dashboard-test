import {
    getReportContext,
} from "../core/report-context.js";

const receiptLinehaulListeners =
    new Set();

const MINIMUM_RECEIPT_LINEHAUL_MANUAL_ROWS =
    8;

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

function normalizeReceiptLinehaulDriver(
    value,
) {
    const firstName =
        normalizeReceiptLinehaulText(
            value,
        )
            .replace(
                /^\[[^\]]+\]\s*/,
                "",
            )
            .split(
                /\s+/,
            )[0] || "";

    if (!firstName) {
        return "";
    }

    const normalizedName =
        firstName.toLocaleLowerCase(
            "pt-BR",
        );

    return (
        normalizedName
            .charAt(0)
            .toLocaleUpperCase(
                "pt-BR",
            ) +
        normalizedName.slice(1)
    );
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

        driver:
            normalizeReceiptLinehaulDriver(
                values.driver,
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
    linehauls: [],
    manualEntryEnabled: false,
};

function getReceiptLinehaulExpectedVolume(
    linehauls,
) {
    const hasQuantity =
        linehauls.some(
            function (linehaul) {
                return linehaul.loadedOrders !==
                    null;
            },
        );

    if (!hasQuantity) {
        return null;
    }

    return linehauls.reduce(
        function (
            total,
            linehaul,
        ) {
            return total +
                (linehaul.loadedOrders ?? 0);
        },
        0,
    );
}

function getReceiptLinehaulState() {
    const linehauls =
        receiptLinehaulState
            .linehauls
            .map(
                function (linehaul) {
                    return {
                        ...linehaul,
                    };
                },
            );

    return {
        window:
            getReportContext()
                .window,

        expectedVolume:
            getReceiptLinehaulExpectedVolume(
                linehauls,
            ),

        manualEntryEnabled:
            receiptLinehaulState
                .manualEntryEnabled,

        linehauls:
            linehauls,
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
            linehauls.some(
                function (linehaul) {
                    return (
                        Boolean(
                            linehaul.code,
                        ) ||
                        linehaul.loadedOrders !==
                            null
                    );
                },
            ),

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
    } else if (field === "driver") {
        normalizedValue =
            normalizeReceiptLinehaulDriver(
                value,
            );
    } else if (field === "origin") {
        normalizedValue =
            normalizeReceiptLinehaulText(
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

function addReceiptLinehaul(
    values = {},
) {
    receiptLinehaulState
        .manualEntryEnabled = true;

    ensureReceiptLinehaulManualRows();

    const linehaul =
        createReceiptLinehaulRecord(
            values,
        );

    receiptLinehaulState
        .linehauls
        .push(
            linehaul,
        );

    notifyReceiptLinehaulState({
        type: "linehaul-added",
        linehaulId: linehaul.id,
    });

    return {
        ...linehaul,
    };
}

function removeReceiptLinehaul(
    linehaulId,
) {
    if (
        receiptLinehaulState
            .linehauls
            .length <=
        MINIMUM_RECEIPT_LINEHAUL_MANUAL_ROWS
    ) {
        return false;
    }

    const linehaulIndex =
        receiptLinehaulState
            .linehauls
            .findIndex(
                function (linehaul) {
                    return linehaul.id ===
                        linehaulId;
                },
            );

    if (linehaulIndex < 0) {
        return false;
    }

    receiptLinehaulState
        .linehauls
        .splice(
            linehaulIndex,
            1,
        );

    notifyReceiptLinehaulState({
        type: "linehaul-removed",
        linehaulId,
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

    ensureReceiptLinehaulManualRows();

    notifyReceiptLinehaulState({
        type: "linehauls-replaced",
    });

    return true;
}

function resetReceiptLinehaulState() {
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
    addReceiptLinehaul,
    enableReceiptLinehaulManualEntry,
    getReceiptLinehaulState,
    getReceiptLinehaulSummary,
    replaceReceiptLinehauls,
    removeReceiptLinehaul,
    resetReceiptLinehaulState,
    restoreReceiptLinehaulState,
    subscribeReceiptLinehaulState,
    updateReceiptLinehaulRecord,
    updateReceiptLinehaulSelection,
};
