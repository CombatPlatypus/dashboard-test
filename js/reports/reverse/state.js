import {
    createReverseTransfer,
} from "./model.js";

const reverseStateListeners =
    new Set();

const reverseState = {
    transfers: [],
};

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
        getReverseState();

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

    if (transferIndex >= 0) {
        reverseState.transfers[
            transferIndex
        ] = transfer;
    } else {
        reverseState.transfers.push(
            transfer,
        );
    }

    notifyReverseState({
        type:
            status === "updated"
                ? "reverse-transfer-updated"
                : "reverse-transfer-added",
        to: transfer.to,
    });

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
        transfers;

    notifyReverseState({
        type: "reverse-session-imported",
    });

    return true;
}

function resetReverseReport() {
    reverseState.transfers = [];

    notifyReverseState({
        type: "reverse-reset",
    });

    return true;
}

export {
    getReverseState,
    resetReverseReport,
    restoreReverseState,
    subscribeReverseState,
    upsertReverseTransfer,
};
