import {
    REVERSE_TYPE_KEYS,
    createReverseTransfer,
    getReverseTotals,
    normalizeReverseTransfers,
} from "./model.js";

const reverseStateListeners =
    new Set();

const reverseState = {
    transfers: Object.freeze([]),
};
let reverseTotals = null;

function getReverseSnapshot() {
    return { transfers: reverseState.transfers };
}

function getReverseStateTotals(state = reverseState) {
    if (state.transfers !== reverseState.transfers) {
        return getReverseTotals(normalizeReverseTransfers(state.transfers));
    }
    return reverseTotals ??= getReverseTotals(state.transfers);
}

function freezeReverseTransfer(transfer) {
    for (const values of Object.values(transfer.packages)) Object.freeze(values);
    Object.freeze(transfer.packages);
    Object.freeze(transfer.quantities);
    return Object.freeze(transfer);
}

function cloneReverseTransfer(
    transfer,
) {
    return {
        ...transfer,
        packages:
            Object.fromEntries(
                Object.entries(
                    transfer.packages,
                ).map(
                    function (
                        [typeKey, trackingNumbers],
                    ) {
                        return [
                            typeKey,
                            trackingNumbers.slice(),
                        ];
                    },
                ),
            ),
        quantities: {
            ...transfer.quantities,
        },
    };
}

function getReverseState() {
    return {
        transfers:
            reverseState.transfers.map(
                cloneReverseTransfer,
            ),
    };
}

function notifyReverseState(
    change,
) {
    const snapshot =
        getReverseSnapshot();

    reverseStateListeners.forEach(
        function (listener) {
            listener(
                snapshot,
                change,
            );
        },
    );
}

function subscribeReverseState(
    listener,
) {
    if (typeof listener !== "function") {
        return function () {};
    }

    reverseStateListeners.add(
        listener,
    );

    return function () {
        reverseStateListeners.delete(
            listener,
        );
    };
}

function upsertReverseTransfer(
    values,
) {
    const transfer =
        createReverseTransfer(
            values,
        );

    if (!transfer) {
        throw new TypeError(
            "Os dados da TO de reversa são inválidos.",
        );
    }

    const transferIndex =
        reverseState.transfers
            .findIndex(
                function (current) {
                    return current.to ===
                        transfer.to;
                },
            );

    const status =
        transferIndex >= 0
            ? "updated"
            : "added";

    const previous = reverseState.transfers[transferIndex];
    const packageTypes = REVERSE_TYPE_KEYS.filter(type => {
        const prior = previous?.packages[type] ?? [];
        const next = transfer.packages[type];
        return prior.length !== next.length || next.some((tracking, index) => tracking !== prior[index]);
    });
    const totalsChanged = !previous || REVERSE_TYPE_KEYS.some(type => previous.quantities[type] !== transfer.quantities[type]);
    const changed = totalsChanged || packageTypes.length > 0 || Object.entries(transfer).some(([key, value]) =>
        key !== "packages" && key !== "quantities" && previous[key] !== value);
    if (changed) {
        const transfers = reverseState.transfers.slice();
        transfers[previous ? transferIndex : transfers.length] = freezeReverseTransfer(transfer);
        reverseState.transfers = Object.freeze(transfers);
        if (totalsChanged) reverseTotals = null;
        notifyReverseState({
            type: status === "updated" ? "reverse-transfer-updated" : "reverse-transfer-added",
            to: transfer.to,
            totalsChanged,
            packageTypes,
        });
    }

    return {
        status,
        transfer:
            cloneReverseTransfer(
                transfer,
            ),
    };
}

function restoreReverseState(
    sessionState,
) {
    if (
        !sessionState ||
        typeof sessionState !== "object" ||
        Array.isArray(sessionState) ||
        !Array.isArray(
            sessionState.transfers,
        )
    ) {
        return false;
    }

    const transfers = [];
    const transferIndexes =
        new Map();

    sessionState.transfers.forEach(
        function (values) {
            const transfer =
                createReverseTransfer(
                    values,
                );

            if (!transfer) {
                return;
            }

            const currentIndex =
                transferIndexes.get(
                    transfer.to,
                );

            if (currentIndex === undefined) {
                transferIndexes.set(
                    transfer.to,
                    transfers.length,
                );
                transfers.push(
                    transfer,
                );
            } else {
                transfers[currentIndex] =
                    transfer;
            }
        },
    );

    reverseState.transfers =
        Object.freeze(transfers.map(freezeReverseTransfer));
    reverseTotals = null;

    notifyReverseState({
        type: "reverse-session-imported",
    });

    return true;
}

function resetReverseReport() {
    reverseState.transfers = Object.freeze([]);
    reverseTotals = null;

    notifyReverseState({
        type: "reverse-reset",
    });

    return true;
}

export {
    getReverseSnapshot,
    getReverseState,
    getReverseStateTotals,
    resetReverseReport,
    restoreReverseState,
    subscribeReverseState,
    upsertReverseTransfer,
};
