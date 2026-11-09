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

const lastRow = 6000;
const backlogStart = 7;
const scheduledStart = 19;
const segregatedStart = 41;
const tosStart = 63;
const columnWidths = [252, 302, 280, 21, 280, 280];

const blank = { background: "#101010", fontSize: 10 };
const title = { background: "#333333", fontSize: 22, bold: true, border: true };
const section = { background: "#333333", fontSize: 12, border: true };
const heading = { background: "#262626", fontSize: 11, border: true };
const segregationHeading = { ...heading, fontSize: 12 };
const data = { ...blank, border: true, bottom: true };
const stripedData = { ...data, background: "#1b1b1b" };

function hasPlanningLhInformation(lh) {
    return Boolean(lh.code?.trim() || lh.origin?.trim() || Number.isFinite(lh.quantity)
        || lh.segregate || lh.segregateTos || lh.tos?.some(hasPlanningToInformation));
}

function getPlanningClipboardData(state) {
    const status = {
        target: "B2", sheet: "Modelo", label: "Relatório de planejamento",
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
        [tos, lastRow - tosStart + 1, "TOs para segregar"],
        [packages, lastRow - backlogStart + 1, "pacotes normais no backlog"],
        [bulky, lastRow - backlogStart + 1, "pacotes volumosos no backlog"],
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

function createPlanningClipboardRows(state, { lhs, segregated, tos, packages, bulky }) {
    const left = new Map([
        [4, cells(["", "", ""], blank)],
        [5, [cell("Resumo do Planejamento", section, 3)]],
        [6, cells(["Volume Estimado", "SPR Médio", "Cap do Dia"], heading)],
        [7, cells([calculatePlanningEstimatedVolume(state), calculatePlanningAverageSpr(state), state.dailyCapacity], data)],
        [8, [cell("", blank, 3)]],
        [9, [cell("Valores da Collection Pool", section, 3)]],
        [10, cells(["Qtd Backlog Pacotes", "Qtd Backlog Volumosos", "Qtd dentro dos LHs"], heading)],
        [11, cells([
            getPlanningPoolQuantity(state, "backlogPackages"),
            getPlanningPoolQuantity(state, "backlogBulky"),
            getPlanningLhQuantity(lhs),
        ], data)],
        [12, [cell("", blank, 3)]],
        [13, [cell("Operações na Collection Pool", section, 3)]],
        [14, cells(["Inseridos", "Retirados", "Erros"], heading)],
        [15, cells([
            getPlanningPoolQuantity(state, "added"),
            getPlanningPoolQuantity(state, "removed"),
            getPlanningPoolQuantity(state, "errors"),
        ], data)],
        [16, [cell("", blank, 3)]],
        [17, [cell("LHs Programados", section, 3)]],
        [18, cells(["LHs Programados", "Origem", "QTD"], heading)],
        [39, [cell("", blank, 3)]],
        [40, cells(["LHs a Segregar", "Origem", "QTD"], segregationHeading)],
        [61, [cell("", blank, 3)]],
        [62, cells(["TOs para Segregar", "LH", "QTD"], segregationHeading)],
    ]);
    const recordSections = [
        [scheduledStart, 38, lhs.map(lh => [lh.code, lh.origin, lh.quantity])],
        [segregatedStart, 60, segregated.map(lh => [lh.code, lh.origin, getPlanningLhSegregatedQuantity(lh)])],
        [tosStart, lastRow, tos],
    ];
    for (const [start, end, records] of recordSections) {
        for (let row = start; row <= end; row += 1) {
            left.set(row, recordCells(records[row - start], row));
        }
    }

    const rows = [
        [cell("PLANEJAMENTO", title, 6, 2)],
        Array(6).fill(null),
        [...left.get(4), ...cells(["", "", ""], blank)],
        [...left.get(5), cell("", blank), cell("Backlog Adicionado", section, 2)],
        [...left.get(6), cell("", blank), ...cells(["Pacotes Normais", "Pacotes Volumosos"], heading)],
    ];
    // The separator is merged through E6000. Keep the full range so a paste also clears old list entries.
    for (let row = backlogStart; row <= lastRow; row += 1) {
        const separator = row < 17 ? cell("", blank) : row === 17 ? cell("", blank, 1, lastRow - 16) : null;
        const index = row - backlogStart;
        rows.push([...left.get(row), separator, ...cells([packages[index], bulky[index]], dataStyle(row))]);
    }
    return rows;
}

export { columnWidths, createPlanningClipboardRows, getPlanningClipboardData };
