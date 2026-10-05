import {
    createParcelRow,
    createParcelSummary,
    getParcelOperatorKey,
    isParcelOperator,
    isParcelScannedRow,
    normalizeParcelFilter,
} from "./model.js";

const parcelStateListeners =
    new Set();

const parcelState = {
    rows: [],
    sourceFileName: "",
    activeFilter: "all",
    operatorKindOverrides: {},
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
        operatorKindOverrides: { ...parcelState.operatorKindOverrides },
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
    parcelState.operatorKindOverrides = {};

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
    parcelState.operatorKindOverrides = {};

    notifyParcelState({
        type: "parcel-reset",
    });

    return true;
}

function toggleParcelOperatorBulky(operatorKey) {
    const key = getParcelOperatorKey(operatorKey);
    const summary = createParcelSummary(parcelState.rows, parcelState.operatorKindOverrides);
    const operator = summary.operatorStats.find(item => item.operatorKey === key);
    if (!operator) {
        return false;
    }

    parcelState.operatorKindOverrides[key] = operator.packageKind !== "bulky";
    notifyParcelState({ type: "parcel-operator-kind-updated", operatorKey: key });
    return true;
}

function normalizeParcelOperatorOverrides(overrides, rows) {
    if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
        return {};
    }

    const operatorKeys = new Set(rows
        .filter(row => isParcelScannedRow(row) && isParcelOperator(row.operator))
        .map(row => getParcelOperatorKey(row.operator)));
    return Object.fromEntries(Object.entries(overrides)
        .filter(([key, value]) => typeof value === "boolean" &&
            operatorKeys.has(getParcelOperatorKey(key)))
        .map(([key, value]) => [getParcelOperatorKey(key), value]));
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

    parcelState.operatorKindOverrides = normalizeParcelOperatorOverrides(
        receivedState.operatorKindOverrides, parcelState.rows);

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
    toggleParcelOperatorBulky,
    updateParcelFilter,
};
