import {
    getReceiptState,
    subscribeReceiptState,
} from "../receipt/state.js";

import {
    getExpeditionState,
    subscribeExpeditionState,
} from "../expedition/state.js";

import {
    getLossesRateState,
    subscribeLossesRateState,
} from "../losses-rate/state.js";

import {
    createOverallAnalysisData,
} from "./model.js";

import {
    initializeOverallAnalysisView,
    renderOverallAnalysisView,
} from "./view.js";

import {
    initializeOverallAnalysisCharts,
    renderOverallAnalysisCharts,
} from "./charts.js";

let overallAnalysisControllerInitialized =
    false;

/* DADOS SEMPRE DERIVADOS DOS RELATÓRIOS DE ORIGEM */

function getCurrentOverallAnalysisData() {
    return createOverallAnalysisData(
        getReceiptState(),
        getExpeditionState(),
        getLossesRateState(),
    );
}

function renderOverallAnalysisController() {
    const data =
        getCurrentOverallAnalysisData();

    const viewRendered =
        renderOverallAnalysisView(
            data,
        );

    const chartsRendered =
        renderOverallAnalysisCharts(
            data,
        );

    return viewRendered &&
        chartsRendered;
}

function initializeOverallAnalysisController() {
    if (
        overallAnalysisControllerInitialized
    ) {
        return true;
    }

    const rootElement =
        document.getElementById(
            "overall-analysis",
        );

    if (
        !(rootElement instanceof
            HTMLElement)
    ) {
        return false;
    }

    const initialized =
        initializeOverallAnalysisView(
            rootElement,
        ) &&
        initializeOverallAnalysisCharts(
            rootElement,
        );

    if (!initialized) {
        return false;
    }

    subscribeReceiptState(
        renderOverallAnalysisController,
    );

    subscribeExpeditionState(
        renderOverallAnalysisController,
    );

    subscribeLossesRateState(
        renderOverallAnalysisController,
    );

    overallAnalysisControllerInitialized =
        true;

    return renderOverallAnalysisController();
}

function resetOverallAnalysisController() {
    return renderOverallAnalysisController();
}

function importOverallAnalysisData() {
    return renderOverallAnalysisController();
}

function exportOverallAnalysisSession() {
    return {};
}

function importOverallAnalysisSession() {
    return renderOverallAnalysisController();
}

function canExportOverallAnalysisController() {
    const data =
        getCurrentOverallAnalysisData();

    return [
        data.flow.planned,
        data.flow.processed,
        data.flow.expedited,
        data.flow.floor,
        data.cards.lossesRate.rate,
    ].some(
        function (value) {
            return value !== null;
        },
    );
}

export {
    canExportOverallAnalysisController,
    exportOverallAnalysisSession,
    importOverallAnalysisData,
    importOverallAnalysisSession,
    initializeOverallAnalysisController,
    renderOverallAnalysisController,
    resetOverallAnalysisController,
};
