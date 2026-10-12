import {
    canExportReverseReport,
    exportReverseSession,
    importReverseData,
    importReverseSession,
    initializeReverseController,
    renderReverseController,
    resetReverseReport,
} from "./controller.js";

const reverseReport =
    Object.freeze({
        id: "reverse",
        init:
            initializeReverseController,
        render:
            renderReverseController,
        reset:
            resetReverseReport,
        importData:
            importReverseData,
        exportSession:
            exportReverseSession,
        importSession:
            importReverseSession,
        canExport:
            canExportReverseReport,
    });

export {
    reverseReport,
};

export default reverseReport;
