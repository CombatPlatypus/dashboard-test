import {
    canExportParcelReport,
    exportParcelSession,
    importParcelData,
    importParcelSession,
    initializeParcelController,
    renderParcelController,
    resetParcelController,
} from "./controller.js";

const parcelReport =
    Object.freeze({
        id: "parcel",
        init:
            initializeParcelController,
        render:
            renderParcelController,
        reset:
            resetParcelController,
        importData:
            importParcelData,
        exportSession:
            exportParcelSession,
        importSession:
            importParcelSession,
        canExport:
            canExportParcelReport,
    });

export {
    parcelReport,
};

export default parcelReport;
