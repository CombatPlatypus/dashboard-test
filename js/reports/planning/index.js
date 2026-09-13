import {
    canExportPlanningController,
    exportPlanningSession,
    importPlanningData,
    importPlanningSession,
    initializePlanningController,
    renderPlanningController,
    resetPlanningController,
} from "./controller.js";

const planningReport =
    Object.freeze({
        id: "planning",

        init:
            initializePlanningController,

        render:
            renderPlanningController,

        reset:
            resetPlanningController,

        importData:
            importPlanningData,

        exportSession:
            exportPlanningSession,

        importSession:
            importPlanningSession,

        canExport:
            canExportPlanningController,
    });

export {
    planningReport,
};

export default planningReport;
