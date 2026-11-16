import {
    getDamageAndLossesState,
    getDamageAndLossesSummary,
    replaceDamageAndLossesData,
    resetDamageAndLossesState,
    restoreDamageAndLossesState,
} from "./state.js";

import {
    initializeDamageAndLossesView,
    renderDamageAndLossesView,
} from "./view.js";

import {
    getLossesState,
    getLossesSummary,
    replaceLossesData,
    resetLossesState,
    restoreLossesState,
} from "./losses-state.js";

import {
    initializeLossesView,
    renderLossesView,
} from "./losses-view.js";

import {
    initializeDamageAndLossesCharts,
    renderDamageAndLossesCharts,
} from "./charts.js";

import {
    initializeLossesCharts,
    renderLossesCharts,
} from "./losses-charts.js";

import {
    initializeDamageAndLossesImport,
} from "./import.js";

import {
    initializeDamageAndLossesActions,
} from "./actions.js";

import { initializeConsolidatedView, renderConsolidatedView } from "./consolidated-view.js";
import { batchReportUpdates } from "../core/report-updates.js";

let damageAndLossesControllerInitialized =
    false;

function initializeDamageAndLossesController() {
    if (
        damageAndLossesControllerInitialized
    ) {
        return true;
    }

    const rootElement =
        document.getElementById(
            "damage-and-losses",
        );

    if (
        !(rootElement instanceof HTMLElement)
    ) {
        return false;
    }

    const initialized =
        [
            initializeDamageAndLossesView,
            initializeDamageAndLossesCharts,
            initializeLossesView,
            initializeLossesCharts,
            initializeConsolidatedView,
            initializeDamageAndLossesImport,
            initializeDamageAndLossesActions,
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

    damageAndLossesControllerInitialized =
        true;

    return true;
}

function renderDamageAndLossesController() {
    const damage = getDamageAndLossesState();
    const losses = getLossesState();
    const damageSummary = getDamageAndLossesSummary(damage);
    const lossesSummary = getLossesSummary(losses);
    return renderDamageAndLossesView(damage, damageSummary) &&
        renderDamageAndLossesCharts(damage, damageSummary) &&
        renderLossesView(losses, lossesSummary) &&
        renderLossesCharts(losses, lossesSummary) &&
        renderConsolidatedView({ damage, losses });
}

function resetDamageAndLossesController() {
    return batchReportUpdates(() => resetDamageAndLossesState() && resetLossesState());
}

function importDamageAndLossesData(
    data,
) {
    return batchReportUpdates(() => {
        const damageImported = replaceDamageAndLossesData(data?.damage || data);
        const lossesImported = data?.losses ? replaceLossesData(data.losses) : true;
        return damageImported && lossesImported;
    });
}

function exportDamageAndLossesSession() {
    return {
        ...getDamageAndLossesState(),
        losses: getLossesState(),
    };
}

function importDamageAndLossesSession(
    sessionState,
) {
    return batchReportUpdates(() => {
        const imported = restoreDamageAndLossesState(sessionState?.damage || sessionState);
        const lossesImported = sessionState?.losses ? restoreLossesState(sessionState.losses) : resetLossesState();
        if (!imported || !lossesImported) {
            throw new TypeError("Os dados da sessão de avarias e perdas são inválidos.");
        }
        return true;
    });
}

function canExportDamageAndLossesController() {
    return (
        getDamageAndLossesSummary(
            getDamageAndLossesState(),
        ).hasData ||
        getLossesSummary(
            getLossesState(),
        ).hasData
    );
}

export {
    canExportDamageAndLossesController,
    exportDamageAndLossesSession,
    importDamageAndLossesData,
    importDamageAndLossesSession,
    initializeDamageAndLossesController,
    renderDamageAndLossesController,
    resetDamageAndLossesController,
};
