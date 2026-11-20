import {
    calculatePlanningAverageSpr,
    calculatePlanningEstimatedVolume,
    canExportPlanningReport,
    getPlanningBacklogCodes,
    getPlanningLhQuantity,
    getPlanningLhSegregatedQuantity,
    getPlanningPoolQuantity,
    hasPlanningToInformation,
} from "./calculations.js";

const modelLastRow = 6000;
const backlogStart = 7;
const scheduledStart = 7;
const segregatedStart = 29;
const tosStart = 51;
const columnWidths = [252, 302, 101, 21, 181, 181, 21, 101, 101, 101];
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo",
});
const timeFormat = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Sao_Paulo",
});

const blank = { background: "#101010", fontSize: 10, inlineFormattingOnly: true };
const section = { ...blank, background: "#333333", fontSize: 12, border: true };
const title = { ...section, fontSize: 20, bold: true };
const heading = { ...blank, background: "#262626", fontSize: 11, border: true };
const segregationHeading = { ...heading, fontSize: 12 };
const data = { ...blank, border: true };
const stripedData = { ...data, background: "#1b1b1b" };
const summaryLabel = { ...data, textAlign: "left" };
const stripedSummaryLabel = { ...stripedData, textAlign: "left" };
const gap = { ...blank, borderColor: "#101010", borderSides: ["left", "right"] };
const blankSummary = { ...blank, border: true, borderColor: "#101010" };
const separatorTop = { ...blank, borderColor: "#101010", borderSides: ["top"] };
const separatorBottom = { ...blank, borderColor: "#101010", borderSides: ["bottom"] };

function hasPlanningLhInformation(lh) {
    return Boolean(lh.code?.trim() || lh.origin?.trim() || Number.isFinite(lh.quantity)
        || lh.segregate || lh.segregateTos || lh.tos?.some(hasPlanningToInformation));
}

function getPlanningClipboardData(state) {
    const status = {
        target: "C2:L3", sheet: "Modelo", label: "Relatório de planejamento",
        shift: null, hasData: canExportPlanningReport(state), copyError: "",
    };
    const lhs = [...state.lhs];
    while (lhs.length > 0 && !hasPlanningLhInformation(lhs.at(-1))) lhs.pop();

    const segregated = lhs.filter(lh => lh.segregate);
    const tos = segregated.filter(lh => lh.segregateTos).flatMap(lh =>
        (lh.tos ?? []).filter(hasPlanningToInformation).map(to => [to.code, lh.code, to.quantity]),
    );
    const packages = getPlanningBacklogCodes(state, "packages");
    const bulky = getPlanningBacklogCodes(state, "bulky");
    const overflow = [
        [lhs, 20, "LHs programados"],
        [segregated, 20, "LHs a segregar"],
        [tos, modelLastRow - tosStart + 1, "TOs para segregar"],
        [packages, modelLastRow - backlogStart + 1, "pacotes normais no backlog"],
        [bulky, modelLastRow - backlogStart + 1, "pacotes volumosos no backlog"],
    ].find(([records, limit]) => records.length > limit);
    if (overflow) {
        const [records, limit, label] = overflow;
        status.copyError = `O modelo comporta até ${limit} ${label}, mas o relatório possui ${records.length}.`;
    }
    return { status, lhs, segregated, tos, packages, bulky };
}

function cell(value, style, span = 1, rowSpan = 1) {
    return { value, style, span, rowSpan };
}

function cells(values, style) {
    return values.map(value => cell(value, style));
}

function dataStyle(row) {
    return row % 2 === 0 ? stripedData : data;
}

function recordCells(record, row) {
    const values = record
        ? record.map(value => value == null || value === "" ? "—" : value)
        : ["", "", ""];
    return cells(values, dataStyle(row));
}

function createPlanningSummaryRows(state, lhs) {
    const sections = [
        [5, "Resumo do Planejamento", [
            ["Volume Estimado", calculatePlanningEstimatedVolume(state)],
            ["SPR Médio", calculatePlanningAverageSpr(state)],
            ["Cap do Dia", state.dailyCapacity],
        ]],
        [10, "Valores da Collection Pool", [
            ["Qtd Backlog Pacotes", getPlanningPoolQuantity(state, "backlogPackages")],
            ["Qtd Backlog Volumosos", getPlanningPoolQuantity(state, "backlogBulky")],
            ["Qtd dentro dos LHs", getPlanningLhQuantity(lhs)],
        ]],
        [15, "Operações na Collection Pool", [
            ["Qtd Pacotes Inseridos", getPlanningPoolQuantity(state, "added")],
            ["Qtd Pacotes Retirados", getPlanningPoolQuantity(state, "removed")],
            ["Qtd Pacotes com Erros", getPlanningPoolQuantity(state, "errors")],
        ]],
    ];
    const rows = new Map();
    for (const [start, label, metrics] of sections) {
        rows.set(start, [cell(label, section, 3)]);
        for (const [index, [name, value]] of metrics.entries()) {
            const striped = index % 2 !== 0;
            rows.set(start + index + 1, [
                cell(name, striped ? stripedSummaryLabel : summaryLabel, 2),
                cell(value, striped ? stripedData : data),
            ]);
        }
        rows.set(start + metrics.length + 1, [cell("", gap, 3)]);
    }
    return rows;
}

function createPlanningClipboardRows(state, { lhs, segregated, tos, packages, bulky }, { shift, now }) {
    const lastUsedRow = Math.max(
        18,
        scheduledStart + lhs.length - 1,
        segregated.length > 0 ? segregatedStart + segregated.length - 1 : 0,
        tos.length > 0 ? tosStart + tos.length - 1 : 0,
        backlogStart + Math.max(packages.length, bulky.length) - 1,
    );
    const left = new Map([
        [5, [cell("LHs Programados", section, 3)]],
        [6, cells(["LHs Programados", "Origem", "QTD"], heading)],
        [27, [cell("", gap, 3)]],
        [28, cells(["LHs a Segregar", "Origem", "QTD"], segregationHeading)],
        [49, [cell("", gap, 3)]],
        [50, cells(["TOs para Segregar", "LH", "QTD"], segregationHeading)],
    ]);
    const recordSections = [
        [scheduledStart, 26, lhs.map(lh => [lh.code, lh.origin, lh.quantity])],
        [segregatedStart, 48, segregated.map(lh => [lh.code, lh.origin, getPlanningLhSegregatedQuantity(lh)])],
        [tosStart, modelLastRow, tos],
    ];
    for (const [start, end, records] of recordSections) {
        const lastSectionRow = Math.min(end, lastUsedRow);
        for (let row = start; row <= lastSectionRow; row += 1) {
            left.set(row, recordCells(records[row - start], row));
        }
    }

    const reportTitle = `PLANEJAMENTO LM HUB SP 63 - ${shift} ${dateFormat.format(now)} ${timeFormat.format(now)}`;
    const rows = [
        [cell(reportTitle, title, columnWidths.length, 2)],
        Array(columnWidths.length).fill(null),
        [...cells(["", "", "", ""], blank), cell("", blank, 2), ...cells(["", "", "", ""], blank)],
    ];
    const summary = createPlanningSummaryRows(state, lhs);
    const emptySummary = [cell("", blankSummary, 3)];
    const backlogHeadings = new Map([
        [5, [cell("Backlog Adicionado", section, 2)]],
        [6, cells(["Pacotes Normais", "Pacotes Volumosos"], heading)],
    ]);
    for (let row = 5; row <= lastUsedRow; row += 1) {
        const backlogIndex = row - backlogStart;
        const backlog = backlogHeadings.get(row) ?? cells([packages[backlogIndex], bulky[backlogIndex]], dataStyle(row));
        // As faixas F e I são separadores vazios dentro das linhas copiadas.
        const separatorStyle = row === 5 ? separatorTop : row === modelLastRow ? separatorBottom : blank;
        const separator = cell("", separatorStyle);
        rows.push([...left.get(row), separator, ...backlog, separator, ...(summary.get(row) ?? emptySummary)]);
    }
    return rows;
}

export { columnWidths, createPlanningClipboardRows, getPlanningClipboardData };
