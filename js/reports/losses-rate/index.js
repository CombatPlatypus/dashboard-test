import {
    canExportLossesRateController,
    exportLossesRateSession,
    importLossesRateData,
    importLossesRateSession,
    initializeLossesRateController,
    renderLossesRateController,
    resetLossesRateController,
} from "./controller.js";

const lossesRateReport =
    Object.freeze({
        id: "losses-rate",

        init:
            initializeLossesRateController,

        render:
            renderLossesRateController,

        reset:
            resetLossesRateController,

        importData:
            importLossesRateData,

        exportSession:
            exportLossesRateSession,

        importSession:
            importLossesRateSession,

        canExport:
            canExportLossesRateController,
    });

export {
    lossesRateReport,
};

export default lossesRateReport;
