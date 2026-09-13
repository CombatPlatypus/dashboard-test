import {
    canExportReceiptController,
    exportReceiptSession,
    importReceiptData,
    importReceiptSession,
    initializeReceiptController,
    renderReceiptController,
    resetReceiptController,
} from "./controller.js";

const receiptReport =
    Object.freeze({
        id: "receipt",

        init:
            initializeReceiptController,

        render:
            renderReceiptController,

        reset:
            resetReceiptController,

        importData:
            importReceiptData,

        exportSession:
            exportReceiptSession,

        importSession:
            importReceiptSession,

        canExport:
            canExportReceiptController,
    });

export {
    receiptReport,
};

export default receiptReport;
