import {
    createParcelSummary,
} from "./model.js";

import {
    getParcelState,
    replaceParcelRows,
    resetParcelReport,
    restoreParcelState,
} from "./state.js";

import {
    initializeParcelView,
    renderParcelView,
} from "./view.js";

import {
    initializeParcelImport,
} from "./import.js";

import {
    initializeParcelCharts,
} from "./charts.js";

import {
    canExportParcelReport,
    initializeParcelExport,
} from "./export.js";

let parcelControllerInitialized =
    false;

function initializeParcelController() {
    if (
        parcelControllerInitialized
    ) {
        return true;
    }

    const rootElement =
        document.getElementById(
            "parcel",
        );

    if (
        !(
            rootElement instanceof
                HTMLElement
        )
    ) {
        return false;
    }

    const initialized =
        [
            initializeParcelView,
            initializeParcelImport,
            initializeParcelCharts,
            initializeParcelExport,
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

    parcelControllerInitialized =
        true;

    return true;
}

function renderParcelController() {
    return renderParcelView(
        getParcelState(),
    );
}

function resetParcelController() {
    return resetParcelReport();
}

function importParcelData(
    data,
    {
        sourceFileName = "module",
    } = {},
) {
    const rows =
        Array.isArray(
            data,
        )
            ? data
            : data?.rows;

    if (
        !Array.isArray(
            rows,
        )
    ) {
        throw new TypeError(
            "Os dados importados do Parcel Sweeper são inválidos.",
        );
    }

    return replaceParcelRows(
        rows,
        sourceFileName,
    );
}

function exportParcelSession() {
    return getParcelState();
}

function importParcelSession(
    sessionState,
) {
    const imported =
        restoreParcelState(
            sessionState,
        );

    if (!imported) {
        throw new TypeError(
            "Os dados da sessão do Parcel Sweeper são inválidos.",
        );
    }

    return true;
}

function getParcelSummary() {
    const state = getParcelState();
    return createParcelSummary(
        state.rows,
        state.operatorKindOverrides,
    );
}

export {
    canExportParcelReport,
    exportParcelSession,
    getParcelSummary,
    importParcelData,
    importParcelSession,
    initializeParcelController,
    renderParcelController,
    resetParcelController,
};
