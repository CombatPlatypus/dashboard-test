import {
    getPlanningState,
    replacePlanningLhs,
    resetPlanningReport,
    restorePlanningState,
} from "./state.js";

import {
    canExportPlanningReport,
    initializePlanningView,
    renderPlanningReport,
} from "./view.js";

import {
    initializePlanningImport,
} from "./import.js";

let planningControllerInitialized =
    false;

function initializePlanningController() {
    if (planningControllerInitialized) {
        return true;
    }

    const rootElement =
        document.getElementById(
            "planning",
        );

    if (
        !(rootElement instanceof HTMLElement)
    ) {
        return false;
    }

    const importInitialized =
        initializePlanningImport(
            rootElement,
        );

    if (importInitialized === false) {
        return false;
    }

    const viewInitialized =
        initializePlanningView(
            rootElement,
        );

    if (viewInitialized === false) {
        return false;
    }

    planningControllerInitialized =
        true;

    return true;
}

function renderPlanningController() {
    return renderPlanningReport(
        getPlanningState(),
    );
}

function resetPlanningController() {
    return resetPlanningReport();
}

function importPlanningData(
    data,
    {
        source = "module",
    } = {},
) {
    const lhs =
        Array.isArray(data)
            ? data
            : data?.lhs;

    if (!Array.isArray(lhs)) {
        throw new TypeError(
            "Os dados importados do planejamento devem possuir uma lista de LHs.",
        );
    }

    return replacePlanningLhs(
        lhs,
        source,
    );
}

function exportPlanningSession() {
    return getPlanningState();
}

function importPlanningSession(
    sessionState,
) {
    const imported =
        restorePlanningState(
            sessionState,
        );

    if (!imported) {
        throw new TypeError(
            "Os dados da sessão do planejamento são inválidos.",
        );
    }

    return true;
}

function canExportPlanningController() {
    return canExportPlanningReport(
        getPlanningState(),
    );
}

export {
    canExportPlanningController,
    exportPlanningSession,
    importPlanningData,
    importPlanningSession,
    initializePlanningController,
    renderPlanningController,
    resetPlanningController,
};
