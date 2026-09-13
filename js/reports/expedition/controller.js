import {
    getExpeditionState,
    getExpeditionSummary,
    replaceExpeditionErrorData,
    replaceExpeditionRoutes,
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
    initializeExpeditionErrorsImport,
} from "./errors-import.js";

import {
    initializeExpeditionCharts,
} from "./charts.js";

import {
    initializeExpeditionErrorsCharts,
} from "./errors-charts.js";

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
        initializeExpeditionErrorsImport,
        initializeExpeditionCharts,
        initializeExpeditionErrorsCharts,
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

    let imported = false;

    if (
        Array.isArray(
            receivedData.routes,
        )
    ) {
        replaceExpeditionRoutes(
            receivedData.routes,
            sourceFileName,
        );

        imported = true;
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

    if (
        errorData &&
        typeof errorData === "object" &&
        !Array.isArray(errorData)
    ) {
        replaceExpeditionErrorData(
            errorData,
            errorSourceFileName,
        );

        imported = true;
    }

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
