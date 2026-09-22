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
    getDamageAndLossesState,
    subscribeDamageAndLossesState,
} from "../damage-and-losses/state.js";

import {
    getLossesState,
    subscribeLossesState,
} from "../damage-and-losses/losses-state.js";

import {
    createOverallAnalysisData,
} from "./model.js";

import {
    getReportContext,
    subscribeReportContext,
} from "../core/report-context.js";

import {
    initializeOverallAnalysisView,
    renderOverallAnalysisView,
} from "./view.js";

import {
    initializeOverallAnalysisCharts,
    renderOverallAnalysisCharts,
} from "./charts.js";

import {
    initializeOverallAnalysisActions,
    renderOverallAnalysisActions,
} from "./actions.js";

let overallAnalysisControllerInitialized =
    false;

/* DADOS SEMPRE DERIVADOS DOS RELATÓRIOS DE ORIGEM */

function getCurrentOverallAnalysisData() {
    return createOverallAnalysisData(
        getReceiptState(),
        getExpeditionState(),
        getLossesRateState(),
        getReportContext(),
        getDamageAndLossesState(),
        getLossesState(),
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

    const actionsRendered =
        renderOverallAnalysisActions(
            canExportOverallAnalysisController(),
        );

    return viewRendered &&
        chartsRendered &&
        actionsRendered;
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
        ) &&
        initializeOverallAnalysisActions(
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

    subscribeDamageAndLossesState(
        renderOverallAnalysisController,
    );

    subscribeLossesState(
        renderOverallAnalysisController,
    );

    subscribeReportContext(
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
        data.damageAndLosses
            .hasData
            ? 1
            : null,
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
