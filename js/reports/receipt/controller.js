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
} from "./charts.js";

import {
    initializeReceiptImport,
} from "./import.js";

import {
    canExportReceiptReport,
    initializeReceiptExport,
    renderReceiptExportStatus,
} from "./export.js";

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
        initializeReceiptCharts,
        initializeReceiptImport,
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

    return true;
}

function renderReceiptController() {
    const state =
        getReceiptState();

    const rendered =
        renderReceiptView(
            state,
        );

    renderReceiptExportStatus(
        state,
    );

    return rendered;
}

function resetReceiptController() {
    return resetReceiptReport();
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
    return getReceiptState();
}

function importReceiptSession(
    sessionState,
) {
    const imported =
        restoreReceiptState(
            sessionState,
        );

    if (!imported) {
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
