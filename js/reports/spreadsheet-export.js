import { getReceiptState, subscribeReceiptState } from "./receipt/state.js";
import { getReceiptLinehaulState, subscribeReceiptLinehaulState } from "./receipt/linehaul-state.js";
import { getExpeditionState, subscribeExpeditionState } from "./expedition/state.js";
import { canExportReceiptSpreadsheet, createReceiptSpreadsheetBlob, createReceiptSpreadsheetFileName } from "./receipt/spreadsheet.js";
import { canExportExpeditionSpreadsheet, createExpeditionSpreadsheetBlob, createExpeditionSpreadsheetFileName } from "./expedition/spreadsheet.js";
import { subscribeReportContext } from "./core/report-context.js";
import { downloadReportBlob } from "./export.js";
import { setReportNotification } from "./report-notifications.js";

function bindReportSpreadsheetDownload(button, { reportId, label, getSnapshot, canExport, createBlob, fileName, subscribe }) {
    if (!(button instanceof HTMLButtonElement)) return false;
    if (button.dataset.spreadsheetDownloadInitialized === "true") return true;
    button.dataset.spreadsheetDownloadInitialized = "true";
    let busy = false;

    function render() {
        button.disabled = busy || !canExport(getSnapshot());
        button.title = busy ? "Gerando planilha..." : `Baixar planilha de ${label}`;
        button.setAttribute("aria-label", button.title);
    }

    async function download() {
        if (busy) return;
        const snapshot = getSnapshot();
        if (!canExport(snapshot)) return;
        busy = true;
        button.setAttribute("aria-busy", "true");
        render();
        try {
            const date = new Date();
            const blob = await createBlob(snapshot, date);
            const name = fileName(date);
            downloadReportBlob(blob, name);
            setReportNotification({ reportId, type: "success", message: `Planilha de ${label} salva em ${name}.` });
        } catch (error) {
            console.error(`Não foi possível gerar a planilha de ${label}:`, error);
            setReportNotification({ reportId, type: "error", message: error instanceof Error
                ? error.message : `Não foi possível gerar a planilha de ${label}.` });
        } finally {
            busy = false;
            button.removeAttribute("aria-busy");
            render();
        }
    }

    button.addEventListener("click", download);
    subscribe.forEach(listen => listen(render));
    render();
    return true;
}

function initializeReportSpreadsheetDownloads(root = document) {
    const receipt = bindReportSpreadsheetDownload(root.querySelector("#receiptSpreadsheetDownloadButton"), {
        reportId: "receipt", label: "processamento",
        getSnapshot: () => ({ receipt: getReceiptState(), linehaul: getReceiptLinehaulState() }),
        canExport: canExportReceiptSpreadsheet, createBlob: createReceiptSpreadsheetBlob, fileName: createReceiptSpreadsheetFileName,
        subscribe: [subscribeReceiptState, subscribeReceiptLinehaulState, subscribeReportContext],
    });
    const expedition = bindReportSpreadsheetDownload(root.querySelector("#expeditionSpreadsheetDownloadButton"), {
        reportId: "expedition", label: "expedição", getSnapshot: getExpeditionState,
        canExport: canExportExpeditionSpreadsheet, createBlob: createExpeditionSpreadsheetBlob, fileName: createExpeditionSpreadsheetFileName,
        subscribe: [subscribeExpeditionState, subscribeReportContext],
    });
    return receipt && expedition;
}

export { bindReportSpreadsheetDownload, initializeReportSpreadsheetDownloads };
