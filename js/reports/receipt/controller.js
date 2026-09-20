import {
    getReceiptState,
    replaceReceiptOperators,
    resetReceiptReport,
    restoreReceiptState,
} from "./state.js";

import {
    initializeReceiptView,
    renderReceiptView,
} from "./view.js";

import {
    initializeReceiptCharts,
    renderReceiptCharts,
} from "./charts.js";

import {
    initializeReceiptImport,
} from "./import.js";

import {
    getReceiptLinehaulState,
    resetReceiptLinehaulState,
    restoreReceiptLinehaulState,
} from "./linehaul-state.js";

import {
    initializeReceiptLinehaulView,
    renderReceiptLinehaulView,
} from "./linehaul-view.js";

import {
    initializeReceiptLinehaulImport,
} from "./linehaul-import.js";

import {
    canExportReceiptReport,
    initializeReceiptExport,
    renderReceiptExportStatus,
} from "./export.js";

import {
    subscribeReportContext,
} from "../core/report-context.js";

let receiptControllerInitialized =
    false;

function initializeReceiptController() {
    if (receiptControllerInitialized) {
        return true;
    }

    const rootElement =
        document.getElementById(
            "receipt",
        );

    if (
        !(rootElement instanceof HTMLElement)
    ) {
        return false;
    }

    const initializers = [
        initializeReceiptView,
        initializeReceiptLinehaulView,
        initializeReceiptCharts,
        initializeReceiptImport,
        initializeReceiptLinehaulImport,
        initializeReceiptExport,
    ];

    const initializationResults =
        initializers.map(
            function (initialize) {
                return initialize(
                    rootElement,
                ) !== false;
            },
        );

    const initialized =
        initializationResults.every(
            Boolean,
        );

    if (!initialized) {
        return false;
    }

    receiptControllerInitialized =
        true;

    subscribeReportContext(
        renderReceiptController,
    );

    return true;
}

function renderReceiptController() {
    const state =
        getReceiptState();

    const receiptRendered =
        renderReceiptView(
            state,
        );

    const chartsRendered =
        renderReceiptCharts(
            state,
        );

    const linehaulRendered =
        renderReceiptLinehaulView(
            getReceiptLinehaulState(),
        );

    renderReceiptExportStatus(
        state,
    );

    return receiptRendered &&
        chartsRendered &&
        linehaulRendered;
}

function resetReceiptController() {
    const receiptReset =
        resetReceiptReport();

    const linehaulReset =
        resetReceiptLinehaulState();

    return receiptReset &&
        linehaulReset;
}

function importReceiptData(data) {
    const operators =
        Array.isArray(data)
            ? data
            : data?.operators;

    if (!Array.isArray(operators)) {
        throw new TypeError(
            "Os dados importados do processamento devem possuir uma lista de operadores.",
        );
    }

    return replaceReceiptOperators(
        operators,
    );
}

function exportReceiptSession() {
    return {
        ...getReceiptState(),
        linehaul:
            getReceiptLinehaulState(),
    };
}

function importReceiptSession(
    sessionState,
) {
    const imported =
        restoreReceiptState(
            sessionState,
        );

    const linehaulImported =
        restoreReceiptLinehaulState(
            sessionState?.linehaul ?? {},
        );

    if (
        !imported ||
        !linehaulImported
    ) {
        throw new TypeError(
            "Os dados da sessão do processamento são inválidos.",
        );
    }

    return true;
}

function canExportReceiptController() {
    return canExportReceiptReport(
        getReceiptState(),
    );
}

export {
    canExportReceiptController,
    exportReceiptSession,
    importReceiptData,
    importReceiptSession,
    initializeReceiptController,
    renderReceiptController,
    resetReceiptController,
};
