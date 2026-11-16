import {
    createParcelClassification,
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
    rows: Object.freeze([]),
    sourceFileName: "",
    activeFilter: "all",
    operatorKindOverrides: Object.freeze({}),
};

let parcelRowSummary = null;
let parcelClassification = null;

// A visão compartilhada conserva as linhas imutáveis durante filtros e classificações.
function getParcelSnapshot() {
    return { ...parcelState };
}

function getParcelState() {
    return {
        ...parcelState,
        rows: parcelState.rows.map(row => ({ ...row })),
        operatorKindOverrides: { ...parcelState.operatorKindOverrides },
    };
}

function getParcelStateSummary(state = parcelState) {
    if (state.rows !== parcelState.rows || state.operatorKindOverrides !== parcelState.operatorKindOverrides) {
        return createParcelSummary(state.rows, state.operatorKindOverrides);
    }

    const base = parcelRowSummary ??= createParcelSummary(state.rows);
    if (Object.keys(state.operatorKindOverrides).length === 0) return base;

    return parcelClassification ??= {
        ...base,
        ...createParcelClassification(state.rows.filter(isParcelScannedRow), base.operatorStats, state.operatorKindOverrides),
    };
}

function hasParcelRowsChanged(change) {
    return change?.type !== "parcel-filter-updated" && change?.type !== "parcel-operator-kind-updated";
}

function setParcelRows(rows) {
    parcelState.rows = Object.freeze(rows.map(row => Object.freeze(row)));
    parcelRowSummary = null;
    parcelClassification = null;
}

function notifyParcelState(
    event,
) {
    const snapshot =
        getParcelSnapshot();

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
    { normalized = false } = {},
) {
    if (
        !Array.isArray(
            rows,
        )
    ) {
        return false;
    }

    setParcelRows(rows
        .map(row => normalized ? { ...row } : createParcelRow(row))
        .filter(row => Boolean(row.trackingNumber)));

    parcelState.sourceFileName =
        String(
            sourceFileName ?? "",
        ).trim();

    parcelState.activeFilter =
        "all";
    parcelState.operatorKindOverrides = Object.freeze({});

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
    setParcelRows([]);
    parcelState.sourceFileName = "";
    parcelState.activeFilter = "all";
    parcelState.operatorKindOverrides = Object.freeze({});

    notifyParcelState({
        type: "parcel-reset",
    });

    return true;
}

function toggleParcelOperatorBulky(operatorKey) {
    const key = getParcelOperatorKey(operatorKey);
    const summary = getParcelStateSummary();
    const operator = summary.operatorStats.find(item => item.operatorKey === key);
    if (!operator) {
        return false;
    }

    parcelState.operatorKindOverrides = Object.freeze({
        ...parcelState.operatorKindOverrides, [key]: operator.packageKind !== "bulky",
    });
    parcelClassification = null;
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

    setParcelRows(receivedState.rows.map(createParcelRow).filter(row => Boolean(row.trackingNumber)));

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

    parcelState.operatorKindOverrides = Object.freeze(normalizeParcelOperatorOverrides(
        receivedState.operatorKindOverrides, parcelState.rows));

    notifyParcelState({
        type: "parcel-state-restored",
    });

    return true;
}

export {
    getParcelSnapshot,
    getParcelState,
    getParcelStateSummary,
    hasParcelRowsChanged,
    replaceParcelRows,
    resetParcelReport,
    restoreParcelState,
    subscribeParcelState,
    toggleParcelOperatorBulky,
    updateParcelFilter,
};
