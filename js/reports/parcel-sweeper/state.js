import {
    createParcelRow,
    normalizeParcelFilter,
} from "./model.js";

const parcelStateListeners =
    new Set();

const parcelState = {
    rows: [],
    sourceFileName: "",
    activeFilter: "all",
};

function getParcelState() {
    return {
        rows:
            parcelState.rows.map(
                function (row) {
                    return {
                        ...row,
                    };
                },
            ),
        sourceFileName:
            parcelState.sourceFileName,
        activeFilter:
            parcelState.activeFilter,
    };
}

function notifyParcelState(
    event,
) {
    const snapshot =
        getParcelState();

    parcelStateListeners.forEach(
        function (listener) {
            listener(
                snapshot,
                event,
            );
        },
    );
}

function subscribeParcelState(
    listener,
) {
    if (
        typeof listener !==
        "function"
    ) {
        return function () {};
    }

    parcelStateListeners.add(
        listener,
    );

    return function () {
        parcelStateListeners.delete(
            listener,
        );
    };
}

function replaceParcelRows(
    rows,
    sourceFileName = "",
) {
    if (
        !Array.isArray(
            rows,
        )
    ) {
        return false;
    }

    parcelState.rows =
        rows
            .map(
                createParcelRow,
            )
            .filter(
                function (row) {
                    return Boolean(
                        row.trackingNumber,
                    );
                },
            );

    parcelState.sourceFileName =
        String(
            sourceFileName ?? "",
        ).trim();

    parcelState.activeFilter =
        "all";

    notifyParcelState({
        type: "parcel-rows-replaced",
    });

    return true;
}

function updateParcelFilter(
    filter,
) {
    const normalizedFilter =
        normalizeParcelFilter(
            filter,
        );

    if (
        normalizedFilter ===
        parcelState.activeFilter
    ) {
        return true;
    }

    parcelState.activeFilter =
        normalizedFilter;

    notifyParcelState({
        type: "parcel-filter-updated",
    });

    return true;
}

function resetParcelReport() {
    parcelState.rows = [];
    parcelState.sourceFileName = "";
    parcelState.activeFilter = "all";

    notifyParcelState({
        type: "parcel-reset",
    });

    return true;
}

function restoreParcelState(
    receivedState,
) {
    if (
        !receivedState ||
        typeof receivedState !==
            "object" ||
        Array.isArray(
            receivedState,
        ) ||
        !Array.isArray(
            receivedState.rows,
        )
    ) {
        return false;
    }

    parcelState.rows =
        receivedState.rows
            .map(
                createParcelRow,
            )
            .filter(
                function (row) {
                    return Boolean(
                        row.trackingNumber,
                    );
                },
            );

    parcelState.sourceFileName =
        String(
            receivedState
                .sourceFileName ?? "",
        ).trim();

    parcelState.activeFilter =
        normalizeParcelFilter(
            receivedState
                .activeFilter,
        );

    notifyParcelState({
        type: "parcel-state-restored",
    });

    return true;
}

export {
    getParcelState,
    replaceParcelRows,
    resetParcelReport,
    restoreParcelState,
    subscribeParcelState,
    updateParcelFilter,
};
