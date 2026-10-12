import {
    createReverseSummary,
} from "./model.js";

import {
    getReverseState,
    resetReverseReport,
    restoreReverseState,
    upsertReverseTransfer,
} from "./state.js";

import {
    initializeReverseImport,
} from "./import.js";

import {
    initializeReverseView,
    renderReverseView,
} from "./view.js";

import {
    initializeReverseCharts,
    renderReverseCharts,
} from "./charts.js";

import {
    canExportReverseReport,
    initializeReverseExport,
} from "./export.js";

let reverseControllerInitialized =
    false;

function initializeReverseController() {
    if (reverseControllerInitialized) {
        return true;
    }

    const rootElement =
        document.getElementById(
            "reverse",
        );

    if (
        !(rootElement instanceof
            HTMLElement)
    ) {
        return false;
    }

    const initialized =
        [
            initializeReverseView,
            initializeReverseImport,
            initializeReverseCharts,
            initializeReverseExport,
        ]
            .map(
                function (initialize) {
                    return initialize(
                        rootElement,
                    ) !== false;
                },
            )
            .every(Boolean);

    if (!initialized) {
        return false;
    }

    reverseControllerInitialized = true;

    return true;
}

function renderReverseController() {
    const state =
        getReverseState();

    renderReverseView(state);
    renderReverseCharts(state);

    return true;
}

function importReverseData(
    data,
) {
    return upsertReverseTransfer(
        data?.transfer || data,
    );
}

function exportReverseSession() {
    return getReverseState();
}

function importReverseSession(
    sessionState,
) {
    if (!restoreReverseState(sessionState)) {
        throw new TypeError(
            "Os dados da sessão de reversa são inválidos.",
        );
    }

    return true;
}

function getReverseSummary() {
    return createReverseSummary(
        getReverseState().transfers,
    );
}

export {
    canExportReverseReport,
    exportReverseSession,
    getReverseSummary,
    importReverseData,
    importReverseSession,
    initializeReverseController,
    renderReverseController,
    resetReverseReport,
};
