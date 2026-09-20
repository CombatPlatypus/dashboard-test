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
    initializeDamageAndLossesCharts,
    renderDamageAndLossesCharts,
} from "./charts.js";

import {
    initializeDamageAndLossesImport,
} from "./import.js";

import {
    initializeDamageAndLossesActions,
} from "./actions.js";

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
    const state =
        getDamageAndLossesState();

    return (
        renderDamageAndLossesView(
            state,
        ) &&
        renderDamageAndLossesCharts(
            state,
        )
    );
}

function resetDamageAndLossesController() {
    return resetDamageAndLossesState();
}

function importDamageAndLossesData(
    data,
) {
    return replaceDamageAndLossesData(
        data,
    );
}

function exportDamageAndLossesSession() {
    return getDamageAndLossesState();
}

function importDamageAndLossesSession(
    sessionState,
) {
    const imported =
        restoreDamageAndLossesState(
            sessionState,
        );

    if (!imported) {
        throw new TypeError(
            "Os dados da sessão de avarias são inválidos.",
        );
    }

    return true;
}

function canExportDamageAndLossesController() {
    return getDamageAndLossesSummary(
        getDamageAndLossesState(),
    ).hasData;
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
