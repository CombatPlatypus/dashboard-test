import { getReportContext, subscribeReportContext } from "./core/report-context.js";
import { getReceiptState, getReceiptSummary, subscribeReceiptState } from "./receipt/state.js";
import { getReceiptLinehaulState, getReceiptLinehaulSummary, subscribeReceiptLinehaulState } from "./receipt/linehaul-state.js";
import { getExpeditionState, getExpeditionSummary, getExpeditionErrorAnalysis, subscribeExpeditionState } from "./expedition/state.js";
import { setReportNotification } from "./report-notifications.js";

const shiftRows = { AM: 1, PM1: 22, PM2: 43 };
const rateFormatter = new Intl.NumberFormat("pt-BR", {
    style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function formatDuration(seconds) {
    if (seconds === null || seconds === undefined) return "";
    const total = Math.max(0, Math.round(seconds));
    return [Math.floor(total / 3600), Math.floor(total % 3600 / 60), total % 60]
        .map(value => String(value).padStart(2, "0")).join(":");
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
}

// HTML carries the template's merges; TSV keeps a placeholder for every physical column.
function createClipboardTable(rows) {
    const text = rows.map(row => row.flatMap(({ value, span }) =>
        [String(value ?? ""), ...Array(span - 1).fill("")],
    ).join("\t")).join("\n");
    const html = '<meta charset="utf-8"><table>' + rows.map(row =>
        "<tr>" + row.map(({ value, span }) =>
            `<td colspan="${span}">${escapeHtml(value)}</td>`,
        ).join("") + "</tr>",
    ).join("") + "</table>";
    return { text, html };
}

function createReportSummaryClipboard(kind, {
    context = getReportContext(),
    receipt = getReceiptState(),
    linehaul = getReceiptLinehaulState(),
    expedition = getExpeditionState(),
} = {}) {
    const shift = context.window;
    const firstRow = shiftRows[shift];
    const cell = (value, span = 2) => ({ value, span });
    const pair = (...values) => values.map(value => cell(value));
    const rate = value => value === null || value === undefined ? "" : rateFormatter.format(value);
    let rows;
    let target;
    let label;
    let hasData;

    if (kind === "receipt") {
        const received = getReceiptSummary(receipt);
        const unloaded = getReceiptLinehaulSummary(linehaul);
        rows = [
            [cell("Último Processamento", 4)],
            pair("LHs Descarregados", "Volume Descarregado"),
            pair(unloaded.hasData ? unloaded.unloadedCount : null,
                unloaded.hasData ? unloaded.unloadedVolume : null),
            pair("Volume Esperado", "Volume Recebido"),
            pair(receipt.expectedVolume, received.receivedVolume),
        ];
        target = `A${firstRow + 1}`;
        label = "Resumo de processamento";
        hasData = unloaded.hasData || received.receivedVolume !== null;
    } else if (kind === "expedition") {
        const summary = getExpeditionSummary(expedition);
        const analysis = getExpeditionErrorAnalysis(expedition);
        rows = [
            [cell("Última Expedição", 4)],
            pair("Rotas Conferidas", "Volume Expedido"),
            pair(summary.hasData ? summary.validatedRoutes : null,
                summary.hasData ? summary.volumeChecked : null),
            pair("Volume no Piso", "Duração"),
            pair(summary.hasData ? summary.floorVolume : null,
                summary.hasData ? formatDuration(summary.expeditionDurationSeconds) : null),
            [cell("Análise de Erros", 4)],
            pair("Erros de Sorting", "Erros de Etiquetagem"),
            pair(analysis.sortingErrors, analysis.labelingErrors),
            pair("Erros Revertidos", "Taxa de Revertidos"),
            pair(analysis.totalRevertedErrors, rate(analysis.revertedRate)),
            pair("Total de Erros", "Taxa de Erros"),
            pair(analysis.totalErrors, rate(analysis.errorRate)),
            pair("Total Final de Erros", "Taxa Final"),
            pair(analysis.finalErrors, rate(analysis.finalRate)),
        ];
        target = `A${firstRow + 6}`;
        label = "Resumo de expedição e erros";
        hasData = analysis.hasSpXData || analysis.hasErrorData;
    } else {
        throw new Error("Tipo de resumo inválido.");
    }

    return { ...createClipboardTable(rows), target, label, shift, hasData };
}

async function writeSummaryClipboard(payload) {
    const clipboard = navigator.clipboard;
    if (typeof clipboard?.write === "function" && typeof ClipboardItem === "function") {
        await clipboard.write([new ClipboardItem({
            "text/html": new Blob([payload.html], { type: "text/html" }),
            "text/plain": new Blob([payload.text], { type: "text/plain" }),
        })]);
    } else if (typeof clipboard?.writeText === "function") {
        await clipboard.writeText(payload.text);
    } else {
        throw new Error("Área de transferência indisponível.");
    }
}

function bindReportSummaryCopyButton(button, { reportId, kind, subscribe }) {
    if (!(button instanceof HTMLButtonElement)) return false;
    if (button.dataset.summaryCopyInitialized === "true") return true;
    button.dataset.summaryCopyInitialized = "true";
    let busy = false;

    function render() {
        const payload = createReportSummaryClipboard(kind);
        button.disabled = busy || !payload.hasData;
        if (!busy) {
            button.title = `${payload.label}: copiar para ${payload.target} da aba Base do Resumo.`;
            button.setAttribute("aria-label", button.title);
        }
    }

    async function copy() {
        if (busy) return;
        const payload = createReportSummaryClipboard(kind);
        if (!payload.hasData) return;
        busy = true;
        button.disabled = true;
        button.title = "Copiando dados...";
        button.setAttribute("aria-busy", "true");

        try {
            await writeSummaryClipboard(payload);
            setReportNotification({ reportId, type: "success",
                message: `${payload.label} copiado. Cole em ${payload.target} da aba Base do Resumo (${payload.shift}).`,
            });
        } catch {
            setReportNotification({ reportId, type: "error",
                message: "Não foi possível copiar os dados. Verifique a permissão da área de transferência e acesse o dashboard por localhost ou HTTPS.",
            });
        } finally {
            busy = false;
            button.removeAttribute("aria-busy");
            render();
        }
    }

    button.addEventListener("click", copy);
    subscribe.forEach(listen => listen(render));
    render();
    return true;
}

function initializeReportSummaryCopy(root = document) {
    const receiptButton = root.querySelector("#receiptCopySummaryButton");
    const expeditionButton = root.querySelector("#expeditionCopySummaryButton");
    const receiptBound = bindReportSummaryCopyButton(receiptButton, {
        reportId: "receipt", kind: "receipt",
        subscribe: [subscribeReceiptState, subscribeReceiptLinehaulState, subscribeReportContext],
    });
    const expeditionBound = bindReportSummaryCopyButton(expeditionButton, {
        reportId: "expedition", kind: "expedition",
        subscribe: [subscribeExpeditionState, subscribeReportContext],
    });
    return receiptBound && expeditionBound;
}

export { bindReportSummaryCopyButton, createReportSummaryClipboard, initializeReportSummaryCopy };
