import { getReportContext, subscribeReportContext } from "./core/report-context.js";
import { getReceiptState, getReceiptSummary, subscribeReceiptState } from "./receipt/state.js";
import { getReceiptLinehaulState, getReceiptLinehaulSummary, subscribeReceiptLinehaulState } from "./receipt/linehaul-state.js";
import { getExpeditionState, getExpeditionSummary, getExpeditionErrorAnalysis, getExpeditionOperatorRanking, subscribeExpeditionState } from "./expedition/state.js";
import { setReportNotification } from "./report-notifications.js";

const shiftRows = { AM: 3, PM1: 62, PM2: 121 };
// Each window reserves rows 3:58, 62:117 or 121:176 for the two report blocks.
const summaryRowCount = 56;
const rateFormatter = new Intl.NumberFormat("pt-BR", {
    style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
// Sheets' clipboard fields: centered alignment (64 | 128), font family (4096) and size (8192).
const sheetsFormatFields = 64 | 128 | 4096 | 8192;

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
    // Sheets only applies data-sheets-* formatting when its clipboard origin marker is present.
    const html = '<meta charset="utf-8"><google-sheets-html-origin><table data-sheets-root="1">' + rows.map(row =>
        "<tr>" + row.map(({ value, span, fontSize, fontFamily }) => {
            const format = JSON.stringify({ "2": sheetsFormatFields, "9": 1, "10": 1, "15": fontFamily, "16": fontSize });
            return `<td colspan="${span}" data-sheets-userformat='${format}' align="center" valign="middle" style="text-align:center;vertical-align:middle;font-family:${fontFamily};font-size:${fontSize}pt">${escapeHtml(value)}</td>`;
        }).join("") + "</tr>",
    ).join("") + "</table></google-sheets-html-origin>";
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
    const cell = (value, span = 2, fontSize = 10, fontFamily = "Roboto") => ({ value, span, fontSize, fontFamily });
    const pair = (...values) => values.map(value => cell(value));
    const heading = (...values) => values.map(value => cell(value, 2, 11));
    const title = (value, fontSize = 12) => [cell(value, 4, fontSize)];
    const rate = value => value === null || value === undefined ? "" : rateFormatter.format(value);
    let rows;
    let target;
    let label;
    let hasData;
    let operators;
    let createOperatorRow;
    let listLabel;

    if (kind === "receipt") {
        const received = getReceiptSummary(receipt);
        const unloaded = getReceiptLinehaulSummary(linehaul);
        rows = [
            title("Último Processamento", 11),
            heading("LHs Descarregados", "Volume Descarregado"),
            pair(unloaded.hasData ? unloaded.unloadedCount : null,
                unloaded.hasData ? unloaded.unloadedVolume : null),
            heading("Volume Esperado", "Volume Recebido"),
            pair(receipt.expectedVolume, received.receivedVolume),
            title("Lista de Recebedores"),
            ["Recebor SPX", "Etiquetador", "Recebido", "Erros"].map(value => cell(value, 1, 11)),
        ];
        operators = (receipt.operators ?? []).filter(operator => operator.selected !== false);
        createOperatorRow = operator => [operator?.receiver, operator?.labeler, operator?.packagesReceived, operator?.errorQuantity]
            .map(value => cell(value, 1, 10, "Arial"));
        listLabel = "recebedores";
        target = `A${firstRow}`;
        label = "Resumo de processamento";
        hasData = unloaded.hasData || received.receivedVolume !== null || operators.length > 0;
    } else if (kind === "expedition") {
        const summary = getExpeditionSummary(expedition);
        const analysis = getExpeditionErrorAnalysis(expedition);
        rows = [
            title("Última Expedição"),
            heading("Rotas Conferidas", "Volume Expedido"),
            pair(summary.hasData ? summary.validatedRoutes : null,
                summary.hasData ? summary.volumeChecked : null),
            heading("Volume no Piso", "Duração"),
            pair(summary.hasData ? summary.floorVolume : null,
                summary.hasData ? formatDuration(summary.expeditionDurationSeconds) : null),
            title("Análise de Erros"),
            heading("Sorting", "Etiquetagem"),
            pair(analysis.sortingErrors, analysis.labelingErrors),
            heading("Revertidos", "Taxa de Revertidos"),
            pair(analysis.totalRevertedErrors, rate(analysis.revertedRate)),
            heading("Total de Erros", "Taxa de Erros"),
            pair(analysis.totalErrors, rate(analysis.errorRate)),
            heading("Saldo Final", "Taxa Final"),
            pair(analysis.finalErrors, rate(analysis.finalRate)),
            title("Lista de Conferentes"),
            [cell("Conferente SPX", 2, 11), cell("Rotas Feitas", 1, 11), cell("Tempo Médio", 1, 11)],
        ];
        operators = getExpeditionOperatorRanking(expedition).filter(operator => operator.selected !== false);
        createOperatorRow = operator => [cell(operator?.operator), cell(operator?.routesChecked, 1),
            cell(formatDuration(operator?.averageDurationSeconds), 1)];
        listLabel = "conferentes";
        target = `E${firstRow}`;
        label = "Resumo de expedição e erros";
        hasData = analysis.hasSpXData || analysis.hasErrorData;
    } else {
        throw new Error("Tipo de resumo inválido.");
    }

    const listCapacity = summaryRowCount - rows.length;
    const copyError = operators.length > listCapacity
        ? `A lista de ${listLabel} tem ${operators.length} registros, mas a janela ${shift} comporta ${listCapacity}. Reduza a seleção antes de copiar.`
        : "";
    // Empty rows remove names left by a previous, longer list without touching the next window.
    rows.push(...Array.from({ length: listCapacity }, (_, index) => createOperatorRow(operators[index])));
    return { ...createClipboardTable(rows), target, label, shift, hasData, copyError };
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
            button.title = payload.copyError || `${payload.label}: copiar para ${payload.target} da aba Base do Resumo.`;
            button.setAttribute("aria-label", button.title);
        }
    }

    async function copy() {
        if (busy) return;
        const payload = createReportSummaryClipboard(kind);
        if (!payload.hasData) return;
        if (payload.copyError) {
            setReportNotification({ reportId, type: "error", message: payload.copyError });
            return;
        }
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
