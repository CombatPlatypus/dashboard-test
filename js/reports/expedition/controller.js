import {
    getExpeditionState,
    getExpeditionSummary,
    replaceExpeditionData,
    resetExpeditionReport,
    restoreExpeditionState,
} from "./state.js";

import {
    initializeExpeditionView,
    renderExpeditionView,
} from "./view.js";

import {
    initializeExpeditionImport,
} from "./import.js";

import {
    initializeExpeditionCharts,
} from "./charts.js";

import {
    initializeExpeditionErrorsCharts,
} from "./errors-charts.js";

import {
    initializeExpeditionExport,
} from "./export.js";

let expeditionControllerInitialized =
    false;

function initializeExpeditionController() {
    if (expeditionControllerInitialized) {
        return true;
    }

    const rootElement =
        document.getElementById(
            "expedition",
        );

    if (
        !(rootElement instanceof HTMLElement)
    ) {
        return false;
    }

    const initializers = [
        initializeExpeditionView,
        initializeExpeditionImport,
        initializeExpeditionCharts,
        initializeExpeditionErrorsCharts,
        initializeExpeditionExport,
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

    expeditionControllerInitialized =
        true;

    return true;
}

function renderExpeditionController() {
    return renderExpeditionView(
        getExpeditionState(),
    );
}

function resetExpeditionController() {
    return resetExpeditionReport();
}

function importExpeditionData(
    data,
    {
        sourceFileName = "module",
        errorSourceFileName = "module",
    } = {},
) {
    const receivedData =
        Array.isArray(data)
            ? {
                routes: data,
            }
            : data;

    if (
        !receivedData ||
        typeof receivedData !== "object"
    ) {
        throw new TypeError(
            "Os dados importados da expedição são inválidos.",
        );
    }

    const errorData =
        receivedData.errorData ??
        receivedData.errors ??
        (
            Object.prototype
                .hasOwnProperty.call(
                    receivedData,
                    "sortingErrors",
                ) ||
            Object.prototype
                .hasOwnProperty.call(
                    receivedData,
                    "labelingErrors",
                )
                ? receivedData
                : null
        );

    const imported = replaceExpeditionData({
        routes: receivedData.routes,
        errorData: errorData && typeof errorData === "object" && !Array.isArray(errorData) ? errorData : null,
    }, { sourceFileName, errorSourceFileName });

    if (!imported) {
        throw new TypeError(
            "Os dados importados da expedição devem possuir rotas ou dados de erros.",
        );
    }

    return true;
}

function exportExpeditionSession() {
    return getExpeditionState();
}

function importExpeditionSession(
    sessionState,
) {
    const imported =
        restoreExpeditionState(
            sessionState,
        );

    if (!imported) {
        throw new TypeError(
            "Os dados da sessão da expedição são inválidos.",
        );
    }

    return true;
}

function canExportExpeditionController() {
    const state =
        getExpeditionState();

    return getExpeditionSummary(
        state,
    ).hasData;
}

export {
    canExportExpeditionController,
    exportExpeditionSession,
    importExpeditionData,
    importExpeditionSession,
    initializeExpeditionController,
    renderExpeditionController,
    resetExpeditionController,
};
