import {
    canExportExpeditionController,
    exportExpeditionSession,
    importExpeditionData,
    importExpeditionSession,
    initializeExpeditionController,
    renderExpeditionController,
    resetExpeditionController,
} from "./controller.js";

const expeditionReport =
    Object.freeze({
        id: "expedition",

        init:
            initializeExpeditionController,

        render:
            renderExpeditionController,

        reset:
            resetExpeditionController,

        importData:
            importExpeditionData,

        exportSession:
            exportExpeditionSession,

        importSession:
            importExpeditionSession,

        canExport:
            canExportExpeditionController,
    });

export {
    expeditionReport,
};

export default expeditionReport;
