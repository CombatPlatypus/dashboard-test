import { getReportContext, subscribeReportContext } from "./core/report-context.js";
import { formatReportPersonWithOps } from "./core/person-name.js";
import { getReceiptState, getReceiptSummary, subscribeReceiptState } from "./receipt/state.js";
import { getReceiptLinehaulState, getReceiptLinehaulSummary, subscribeReceiptLinehaulState } from "./receipt/linehaul-state.js";
import { getExpeditionState, getExpeditionSummary, getExpeditionErrorAnalysis, getExpeditionOperatorRanking, subscribeExpeditionState } from "./expedition/state.js";
import { getPlanningState, subscribePlanningState } from "./planning/state.js";
import { columnWidths as planningColumnWidths, createPlanningClipboardRows, getPlanningClipboardData } from "./planning/clipboard.js";
import { createParcelSummary } from "./parcel-sweeper/model.js";
import { getParcelState, subscribeParcelState } from "./parcel-sweeper/state.js";
import { createReverseSummary } from "./reverse/model.js";
import { getReverseState, subscribeReverseState } from "./reverse/state.js";
import { setReportNotification } from "./report-notifications.js";

const shiftRows = { AM: 7, PM1: 67, PM2: 127 };
const operationDataSheet = "Base de Dados";
// Each window reserves rows 7:62, 67:122 or 127:182 for the two report blocks.
const summaryRowCount = 56;
const shiftClipboardPalette = { background: "#101010", color: "#f8faf8", borderColor: "#626262" };
const rateFormatter = new Intl.NumberFormat("pt-BR", {
    style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo",
});
// Sheets' clipboard fields: centered alignment (64 | 128), font family (4096) and size (8192).
const sheetsFormatFields = 64 | 128 | 4096 | 8192;
const sheetsColorFields = 2 | 2048;

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

function sheetsColor(hex) {
    return { "1": 2, "2": Number.parseInt(hex.slice(1), 16) };
}

function createStyledCellAttributes({ background, fontSize, bold, border, bottom }) {
    const color = "#e4e6eb";
    const borderColor = "#626262";
    // Sheets stores fill, text color and bold in fields 4, 14 and 17, with bit flags for each.
    const format = {
        "2": sheetsFormatFields | sheetsColorFields | (bold ? 16384 : 0),
        "4": sheetsColor(background), "9": 1, "10": bottom ? 2 : 1,
        "14": sheetsColor(color), "15": "Open Sans", "16": fontSize,
    };
    if (bold) format["17"] = 1;
    const alignment = bottom ? "bottom" : "middle";
    const css = [
        `background-color:${background}`, `color:${color}`, "font-family:Open Sans",
        `font-size:${fontSize}pt`, `font-weight:${bold ? "bold" : "normal"}`,
        "text-align:center", `vertical-align:${alignment}`, "white-space:nowrap",
        border ? `border:1px solid ${borderColor}` : "border:none",
    ].join(";");
    return `data-sheets-userformat='${JSON.stringify(format)}' align="center" valign="${alignment}" style="${css}"`;
}

function createStyledClipboardCell({ value, span, rowSpan, style }, attributes) {
    if (!attributes.has(style)) attributes.set(style, createStyledCellAttributes(style));
    let typedValue = "";
    if (value != null && value !== "") {
        const data = typeof value === "number" ? { "1": 3, "3": value } : { "1": 2, "2": String(value) };
        typedValue = ` data-sheets-value="${escapeHtml(JSON.stringify(data))}"`;
    }
    return `<td rowspan="${rowSpan}" colspan="${span}" ${attributes.get(style)}${typedValue}>${escapeHtml(value)}</td>`;
}

// HTML carries the template's merges; TSV keeps a placeholder for every physical column.
function createClipboardTable(rows, { columnWidth = 150, columnWidths, palette } = {}) {
    const text = rows.map(row => row.flatMap(cell => {
        if (!cell) return [""];
        const { value, span, style } = cell;
        const content = String(value ?? "");
        const field = style && /[\t\r\n"]/.test(content) ? `"${content.replaceAll('"', '""')}"` : content;
        return [field, ...Array(span - 1).fill("")];
    }).join("\t")).join("\n");
    // Sheets only applies data-sheets-* formatting when its clipboard origin marker is present.
    const columnCount = rows[0].reduce((total, cell) => total + cell.span, 0);
    const widths = columnWidths ?? Array(columnCount).fill(columnWidth);
    const columns = '<colgroup>' + widths.map(width => `<col width="${width}" style="width:${width}px">`).join("") + '</colgroup>';
    const baseFormat = { "2": sheetsFormatFields, "9": 1, "10": 1 };
    const borderColor = palette?.borderColor ?? "#000000";
    let colorStyles = "";
    if (palette) {
        const { background, color } = palette;
        baseFormat["2"] |= sheetsColorFields;
        baseFormat["4"] = sheetsColor(background);
        baseFormat["14"] = sheetsColor(color);
        colorStyles = `background-color:${background};color:${color};`;
    }
    const styledAttributes = new WeakMap();
    const html = '<html><head><meta charset="utf-8"></head><body><!--StartFragment-->' +
        '<google-sheets-html-origin><table xmlns="http://www.w3.org/1999/xhtml" data-sheets-root="1" data-sheets-baot="1" ' +
        'cellspacing="0" cellpadding="0" dir="ltr" style="table-layout:fixed;border-collapse:collapse;font-family:Roboto;font-size:10pt">' +
        columns + '<tbody>' + rows.map(row =>
        '<tr style="height:25px">' + row.map(cell => {
            if (!cell) return "";
            if (cell.style) return createStyledClipboardCell(cell, styledAttributes);
            const { value, span, fontSize, fontFamily } = cell;
            const format = JSON.stringify({ ...baseFormat, "15": fontFamily, "16": fontSize });
            return `<td rowspan="1" colspan="${span}" width="${columnWidth * span}" data-sheets-userformat='${format}' align="center" valign="middle" ` +
                `style="${colorStyles}border:1px solid ${borderColor};width:${columnWidth * span}px;text-align:center;vertical-align:middle;font-family:${fontFamily};font-size:${fontSize}pt;font-weight:normal;white-space:nowrap">${escapeHtml(value)}</td>`;
        }).join("") + "</tr>",
    ).join("") + '</tbody></table></google-sheets-html-origin><!--EndFragment--></body></html>';
    return { text, html };
}

function createReportSummaryClipboard(kind, {
    context = getReportContext(),
    receipt = getReceiptState(),
    linehaul = getReceiptLinehaulState(),
    expedition = getExpeditionState(),
    planning,
    parcel,
    reverse,
    now = new Date(),
} = {}) {
    const shift = context.window;
    const firstRow = shiftRows[shift];
    const cell = (value, span = 2, fontSize = 10, fontFamily = "Roboto") => ({ value, span, fontSize, fontFamily });
    const pair = (...values) => values.map(value => cell(value));
    const heading = (...values) => values.map(value => cell(value, 2, 11));
    const title = (value, fontSize = 12) => [cell(value, 4, fontSize)];
    const rate = value => value === null || value === undefined ? "" : rateFormatter.format(value);

    if (kind === "planning") {
        const state = planning ?? getPlanningState();
        const data = getPlanningClipboardData(state);
        const { status } = data;
        if (!status.hasData || status.copyError) return { ...status, text: "", html: "" };
        const rows = createPlanningClipboardRows(state, data);
        return { ...status, ...createClipboardTable(rows, { columnWidths: planningColumnWidths }) };
    }
    if (kind === "parcel") {
        const state = parcel ?? getParcelState();
        const summary = createParcelSummary(state.rows, state.operatorKindOverrides);
        const rows = [
            [cell("Relatório Parcel Sweeper", 4, 12), cell(dateFormatter.format(now), 4, 12)],
            heading("Porcentagem Total", "Total de Bipado", "Pacotes Exception", "Pacotes Missorted"),
            [cell(summary.expectedTotalCount > 0 ? rate(summary.expectedScannedCount / summary.expectedTotalCount) : null, 1),
                cell(summary.hasData ? "-" : null, 1),
                ...pair(summary.hasData ? summary.scannedCount : null,
                    summary.hasData ? summary.exceptionCount : null,
                    summary.hasData ? summary.missortedCount : null)],
        ];
        return { ...createClipboardTable(rows),
            target: "C185", sheet: operationDataSheet, label: "Relatório Parcel Sweeper",
            shift: null, hasData: summary.hasData, copyError: "",
        };
    }
    if (kind === "reverse") {
        const state = reverse ?? getReverseState();
        const summary = createReverseSummary(state.transfers);
        const types = ["return", "missorted", "liquidate", "confiscated"];
        const rows = [
            [cell("Reversa", 4, 12), cell(dateFormatter.format(now), 4, 12)],
            heading("Return", "Missorted", "Liquidate", "Confiscado"),
            types.map(type => cell(summary.hasData ? summary.quantities[type] : null)),
        ];
        return { ...createClipboardTable(rows),
            target: "C189", sheet: operationDataSheet, label: "Resumo de reversa",
            shift: null, hasData: summary.hasData, copyError: "",
        };
    }
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
        createOperatorRow = operator => [formatReportPersonWithOps(operator?.receiver), formatReportPersonWithOps(operator?.labeler), operator?.packagesReceived, operator?.errorQuantity]
            .map(value => cell(value, 1, 10, "Arial"));
        listLabel = "recebedores";
        target = `C${firstRow}`;
        label = "Resumo de processamento";
        hasData = unloaded.hasData || received.receivedVolume !== null || operators.length > 0;
    } else if (kind === "expedition") {
        const summary = getExpeditionSummary(expedition);
        const analysis = getExpeditionErrorAnalysis(expedition);
        rows = [
            title("Última Expedição"),
            heading("Rotas Conferidas", "Volume Expedido e Inicial"),
            [cell(summary.hasData ? summary.validatedRoutes : null),
                cell(summary.hasData ? summary.volumeChecked : null, 1),
                cell(summary.hasData ? summary.totalInitialOrders : null, 1)],
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
        createOperatorRow = operator => [cell(formatReportPersonWithOps(operator?.operator)), cell(operator?.routesChecked, 1),
            cell(formatDuration(operator?.averageDurationSeconds), 1)];
        listLabel = "conferentes";
        target = `G${firstRow}`;
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
    return { ...createClipboardTable(rows, { palette: shiftClipboardPalette }), target, sheet: operationDataSheet, label, shift, hasData, copyError };
}

function writeSummaryCopyEvent(payload) {
    if (typeof document?.execCommand !== "function" || typeof document?.addEventListener !== "function") return false;
    let handled = false;
    const onCopy = event => {
        if (!event.clipboardData) return;
        event.clipboardData.setData("text/html", payload.html);
        event.clipboardData.setData("text/plain", payload.text);
        event.preventDefault();
        handled = true;
    };
    document.addEventListener("copy", onCopy);
    try {
        return document.execCommand("copy") && handled;
    } catch {
        return false;
    } finally {
        document.removeEventListener("copy", onCopy);
    }
}

async function writeSummaryClipboard(payload) {
    // DataTransfer retains table metadata that the async clipboard path can sanitize.
    // https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/clipboard/README.md#sanitization
    if (writeSummaryCopyEvent(payload)) return;
    const clipboard = navigator.clipboard;
    if (typeof clipboard?.write === "function" && typeof ClipboardItem === "function") {
        await clipboard.write([new ClipboardItem({
            "text/html": new Blob([payload.html], { type: "text/html" }),
            "text/plain": new Blob([payload.text], { type: "text/plain" }),
        })]);
    } else {
        throw new Error("Cópia formatada indisponível.");
    }
}

function bindReportSummaryCopyButton(button, {
    reportId, kind, subscribe, getStatus = () => createReportSummaryClipboard(kind),
}) {
    if (!(button instanceof HTMLButtonElement)) return false;
    if (button.dataset.summaryCopyInitialized === "true") return true;
    button.dataset.summaryCopyInitialized = "true";
    let busy = false;

    const destination = payload => `${payload.target} da ${payload.sheet ? `aba ${payload.sheet}` : "planilha"}`;

    function render() {
        const payload = getStatus();
        button.disabled = busy || !payload.hasData;
        if (!busy) {
            button.title = payload.copyError || `${payload.label}: copiar para ${destination(payload)}.`;
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
                message: `${payload.label} copiado. Cole em ${destination(payload)}${payload.shift ? ` (${payload.shift})` : ""}. Use Ctrl+V para manter mesclagens e alinhamento.`,
            });
        } catch {
            setReportNotification({ reportId, type: "error",
                message: "Não foi possível copiar a tabela com formatação. Verifique a permissão da área de transferência e acesse o dashboard por localhost ou HTTPS.",
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
    const planningButton = root.querySelector("#planningCopySummaryButton");
    const parcelButton = root.querySelector("#parcelCopySummaryButton");
    const reverseButton = root.querySelector("#reverseCopySummaryButton");
    const receiptBound = bindReportSummaryCopyButton(receiptButton, {
        reportId: "receipt", kind: "receipt",
        subscribe: [subscribeReceiptState, subscribeReceiptLinehaulState, subscribeReportContext],
    });
    const expeditionBound = bindReportSummaryCopyButton(expeditionButton, {
        reportId: "expedition", kind: "expedition",
        subscribe: [subscribeExpeditionState, subscribeReportContext],
    });
    const planningBound = bindReportSummaryCopyButton(planningButton, {
        reportId: "planning", kind: "planning", subscribe: [subscribePlanningState],
        getStatus: () => getPlanningClipboardData(getPlanningState()).status,
    });
    const parcelBound = bindReportSummaryCopyButton(parcelButton, {
        reportId: "parcel", kind: "parcel", subscribe: [subscribeParcelState],
    });
    const reverseBound = bindReportSummaryCopyButton(reverseButton, {
        reportId: "reverse", kind: "reverse", subscribe: [subscribeReverseState],
    });
    return receiptBound && expeditionBound && planningBound && parcelBound && reverseBound;
}

export { bindReportSummaryCopyButton, createReportSummaryClipboard, initializeReportSummaryCopy };
