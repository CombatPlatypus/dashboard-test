import {
    canExportOverallAnalysisController,
    exportOverallAnalysisSession,
    importOverallAnalysisData,
    importOverallAnalysisSession,
    initializeOverallAnalysisController,
    renderOverallAnalysisController,
    resetOverallAnalysisController,
} from "./controller.js";

const overallAnalysisReport =
    Object.freeze({
        id: "overall-analysis",

        init:
            initializeOverallAnalysisController,

        render:
            renderOverallAnalysisController,

        reset:
            resetOverallAnalysisController,

        importData:
            importOverallAnalysisData,

        exportSession:
            exportOverallAnalysisSession,

        importSession:
            importOverallAnalysisSession,

        canExport:
            canExportOverallAnalysisController,
    });

export {
    overallAnalysisReport,
};

export default overallAnalysisReport;
