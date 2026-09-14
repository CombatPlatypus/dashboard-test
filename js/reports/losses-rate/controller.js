import {
    getLossesRateState,
    replaceLossesRateHistory,
    resetLossesRateReport,
    restoreLossesRateState,
} from "./state.js";

import {
    initializeLossesRateView,
    renderLossesRateView,
} from "./view.js";

import {
    initializeLossesRateCharts,
} from "./charts.js";

import {
    initializeLossesRateImport,
} from "./import.js";

import {
    canExportLossesRateReport,
    initializeLossesRateExport,
    renderLossesRateExportStatus,
} from "./export.js";

let lossesRateControllerInitialized =
    false;

function initializeLossesRateController() {
    if (lossesRateControllerInitialized) {
        return true;
    }

    const rootElement =
        document.getElementById(
            "losses-rate",
        );

    if (
        !(rootElement instanceof HTMLElement)
    ) {
        return false;
    }

    const initializers = [
        initializeLossesRateView,
        initializeLossesRateCharts,
        initializeLossesRateImport,
        initializeLossesRateExport,
    ];

    const initialized =
        initializers
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

    lossesRateControllerInitialized =
        true;

    return true;
}

function renderLossesRateController() {
    const state =
        getLossesRateState();

    const rendered =
        renderLossesRateView(
            state,
        );

    renderLossesRateExportStatus(
        state,
    );

    return rendered;
}

function resetLossesRateController() {
    return resetLossesRateReport();
}

function importLossesRateData(data) {
    const months =
        Array.isArray(data)
            ? data
            : data?.months ??
                data?.history;

    const identification =
        Array.isArray(data)
            ? {}
            : data?.identification ?? {};

    if (!Array.isArray(months)) {
        throw new TypeError(
            "Os dados importados da taxa de perdas devem possuir um histórico mensal.",
        );
    }

    return replaceLossesRateHistory(
        months,
        identification,
    );
}

function exportLossesRateSession() {
    return getLossesRateState();
}

function importLossesRateSession(
    sessionState,
) {
    const imported =
        restoreLossesRateState(
            sessionState,
        );

    if (!imported) {
        throw new TypeError(
            "Os dados da sessão da taxa de perdas são inválidos.",
        );
    }

    return true;
}

function canExportLossesRateController() {
    return canExportLossesRateReport(
        getLossesRateState(),
    );
}

export {
    canExportLossesRateController,
    exportLossesRateSession,
    importLossesRateData,
    importLossesRateSession,
    initializeLossesRateController,
    renderLossesRateController,
    resetLossesRateController,
};
