import {
    getReceiptState,
    subscribeReceiptState,
} from "../receipt/state.js";

import { getReceiptLinehaulState, subscribeReceiptLinehaulState } from "../receipt/linehaul-state.js";

import {
    getExpeditionChangeScope,
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
    getParcelSnapshot,
    hasParcelRowsChanged,
    subscribeParcelState,
} from "../parcel-sweeper/state.js";

import {
    getReverseSnapshot,
    subscribeReverseState,
} from "../reverse/state.js";

import {
    createOverallAnalysisData,
    updateOverallAnalysisContext,
    updateOverallAnalysisSources,
} from "./model.js";

import {
    getReportContext,
    subscribeReportContext,
} from "../core/report-context.js";

import { requestReportUpdate } from "../core/report-updates.js";
import { initializeEmployeeRankingController } from "../employee-ranking/controller.js";
import {
    getEmployeeRankingHistory,
    replaceEmployeeRankingHistory,
} from "../employee-ranking/state.js";

import {
    initializeOverallAnalysisView,
    renderOverallAnalysisChanges,
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
let overallAnalysisData = null;
let overallAnalysisReferenceMonth = null;

/* DADOS SEMPRE DERIVADOS DOS RELATÓRIOS DE ORIGEM */

function getCurrentOverallAnalysisData(date = new Date()) {
    return createOverallAnalysisData(
        getReceiptState(),
        getExpeditionState(),
        getLossesRateState(),
        getReportContext(),
        getDamageAndLossesState(),
        getLossesState(),
        getParcelSnapshot(),
        getReverseSnapshot(),
        date,
        getReceiptLinehaulState(),
    );
}

function rebuildOverallAnalysis() {
    const date = new Date();
    const data =
        getCurrentOverallAnalysisData(date);
    overallAnalysisData = data;
    overallAnalysisReferenceMonth = getReferenceMonth(date);

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
            canExportOverallAnalysisController(data),
            data,
        );

    return viewRendered &&
        chartsRendered &&
        actionsRendered;
}

function renderOverallAnalysisUpdate(data) {
    const previous = overallAnalysisData;
    if (data === previous) {
        return true;
    }

    overallAnalysisData = data;
    const viewRendered = renderOverallAnalysisChanges(data, previous);
    const chartsRendered = renderOverallAnalysisCharts(data, previous);
    const actionsRendered = renderOverallAnalysisActions(canExportOverallAnalysisController(data), data);
    return viewRendered && chartsRendered && actionsRendered;
}

function getReferenceMonth(date) {
    return date.getFullYear() * 12 + date.getMonth();
}

function applyOverallAnalysisChanges(changes) {
    if (!overallAnalysisData || Object.keys(changes).length === 0) {
        return rebuildOverallAnalysis();
    }

    const { context, damage, losses, ...sources } = changes;
    let data = context ? updateOverallAnalysisContext(overallAnalysisData, context) : overallAnalysisData;
    const date = new Date();
    const month = getReferenceMonth(date);
    const monthChanged = month !== overallAnalysisReferenceMonth;
    if (damage || losses || monthChanged) {
        sources.occurrences = { damage: damage ?? getDamageAndLossesState(), losses: losses ?? getLossesState() };
    }
    if (monthChanged) {
        sources.lossesRate ??= getLossesRateState();
    }
    if (context && sources.receipt) {
        sources.receipt = { ...sources.receipt, expectedVolume: data.context.plannedVolume };
    }
    if (Object.keys(sources).length > 0) {
        data = updateOverallAnalysisSources(data, sources, date);
    }
    const rendered = renderOverallAnalysisUpdate(data);
    overallAnalysisReferenceMonth = month;
    return rendered;
}

function requestOverallAnalysisUpdate(changes) {
    return requestReportUpdate(applyOverallAnalysisChanges, changes);
}

function renderOverallAnalysisController() {
    return requestOverallAnalysisUpdate();
}

function onExpeditionChange(expedition, change, expeditionDerived) {
    const scope = getExpeditionChangeScope(change);
    if (scope.ranking) {
        requestOverallAnalysisUpdate({ expedition, expeditionDerived, expeditionSummary: true });
    } else if (scope.errors) {
        requestOverallAnalysisUpdate({ expedition, expeditionDerived, expeditionErrors: true });
    } else if (scope.manualField === "floorVolume") {
        requestOverallAnalysisUpdate({ expedition, expeditionDerived, expeditionFloor: true });
    }
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

    initializeEmployeeRankingController(rootElement);

    subscribeReceiptState((receipt, change) => {
        if (change.field === "labeler" || change.field === "useTotalErrorParticipation") return;
        if (change.type === "operator-field-updated" &&
            receipt.operators.find(operator => operator.id === change.operatorId)?.selected === false) return;
        requestOverallAnalysisUpdate({ receipt });
    });
    subscribeReceiptLinehaulState((linehaul, change) => {
        if (change.type === "linehaul-record-updated" && ["driver", "origin"].includes(change.field)) return;
        requestOverallAnalysisUpdate({ linehaul });
    });
    subscribeExpeditionState(onExpeditionChange);
    subscribeLossesRateState((lossesRate, change) => {
        if (change.type !== "active-month-changed") {
            requestOverallAnalysisUpdate({ lossesRate });
        }
    });
    subscribeDamageAndLossesState(damage => requestOverallAnalysisUpdate({ damage }));
    subscribeLossesState(losses => requestOverallAnalysisUpdate({ losses }));
    subscribeParcelState((parcel, change) => {
        if (hasParcelRowsChanged(change)) {
            requestOverallAnalysisUpdate({ parcel });
        }
    });
    subscribeReverseState((reverse, change) => {
        if (change.totalsChanged !== false) {
            requestOverallAnalysisUpdate({ reverse });
        }
    });
    subscribeReportContext(context => requestOverallAnalysisUpdate({ context }));

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
    const { expedition, receipt, labelingErrors } = getEmployeeRankingHistory();
    const session = {};
    if (expedition.length) session.employeeRanking = expedition;
    if (receipt.length || labelingErrors.length) session.processingRanking = { receipt, labelingErrors };
    return session;
}

function importOverallAnalysisSession(session = {}) {
    replaceEmployeeRankingHistory({
        ...session.processingRanking,
        expedition: session.employeeRanking,
    });
    return renderOverallAnalysisController();
}

function canExportOverallAnalysisController(
    data = overallAnalysisData ?? getCurrentOverallAnalysisData(),
) {
    return [
        data.flow.planned,
        data.flow.processed,
        data.processing.unloadedCount ?? null,
        data.flow.expedited,
        data.flow.floor,
        data.expeditionErrors.totalErrors,
        data.cards.lossesRate.rate,
        ...data.lossesRateHistory.monthlyRates,
        data.damageAndLossesComposition.hasData ? 1 : null,
        data.damageAndLosses
            .hasData
            ? 1
            : null,
        data.parcel.hasData ? 1 : null,
        data.reverse.hasData ? 1 : null,
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
