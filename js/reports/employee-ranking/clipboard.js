import { normalizeText, parseClipboardRows } from "../../filter/clipboard-source.js";
import { createClipboardTable } from "../summary-copy.js";
import { formatEmployeeRankingName, normalizeEmployeeRankingName } from "./model.js";

const MIN_EMPLOYEE_RANKING_ROWS = 150;
const rankingTitle = "RANKING MENSAL DE DESEMPENHO";
const commonHeaders = ["Colaborador", "Quantidade"];
const expedition = { title: "Rotas Conferidas e Tempo Médio", headers: [...commonHeaders, "Tempo"] };
const rankingSections = [
    { title: "Recebimento", headers: commonHeaders },
    { title: "Erros de Etiquetagem", headers: commonHeaders },
    { title: "Avarias Recebidas", headers: commonHeaders },
    expedition,
    { title: "Pacotes OFF", headers: commonHeaders },
];
const operatorHeader = "Nome completo do conferente";
// B:P contains the report, Q is the existing border, R keeps the full name for reimport.
const columnWidths = [181, 121, 20, 181, 121, 20, 181, 121, 20, 181, 121, 81, 20, 201, 121, 50, 260];
// Match the inline cell formatting copied by Google Sheets from the ranking template.
const blankStyle = { background: "#121212", fontSize: 10, inlineFormattingOnly: true };
const titleStyle = { ...blankStyle, background: "#323232", fontSize: 20, bold: true, border: true };
const sectionStyle = { ...titleStyle, fontSize: 12, bold: false };
const headerStyle = { ...blankStyle, background: "#242424", fontSize: 11, border: true };
const rowStyles = [
    { ...blankStyle, border: true },
    { ...blankStyle, background: "#1b1b1b", border: true },
];

function isExpeditionHeader(row, column) {
    return expedition.headers.every((header, index) => normalizeText(row?.[column + index]) === normalizeText(header));
}

function findExpeditionClipboardBlock(rows) {
    for (const [rowIndex, row] of rows.entries()) {
        const column = row.findIndex(value => normalizeText(value) === normalizeText(expedition.title));
        const headers = rows[rowIndex + 1];
        if (column !== -1 && isExpeditionHeader(headers, column)) {
            const operatorColumn = headers.findIndex(value => normalizeText(value) === normalizeText(operatorHeader));
            return { column, operatorColumn, startRow: rowIndex + 2 };
        }
    }

    if (rows.every(row => row.length <= expedition.headers.length)) {
        const firstRow = rows.findIndex(row => row.some(value => normalizeText(value)));
        return {
            column: 0,
            operatorColumn: -1,
            startRow: isExpeditionHeader(rows[firstRow], 0) ? firstRow + 1 : 0,
        };
    }

    throw new Error("Copie a aba Ranking de Colaboradores ou as três colunas do bloco Rotas Conferidas e Tempo Médio.");
}

function parseRouteCount(value) {
    const digits = /^\d{1,3}(?:[. ]\d{3})+$/.test(value) ? value.replace(/[. ]/g, "") : value;
    return /^\d+$/.test(digits) && Number.isSafeInteger(Number(digits)) ? Number(digits) : null;
}

function parseAverageDuration(value) {
    const match = /^(?:(\d+):([0-5]\d)|(\d+)):([0-5]\d)$/.exec(value);
    if (!match) return null;

    const [, hours, minutesAfterHour, minutes, seconds] = match;
    const duration = Number(hours ?? 0) * 3600 + Number(minutes ?? minutesAfterHour) * 60 + Number(seconds);
    return Number.isSafeInteger(duration) ? duration : null;
}

function isEmptyCell(value) {
    return value === "" || value === "—" || value === "–" || value === "-";
}

function readClipboardName(value) {
    return String(value ?? "").trim()
        .replace(/^"((?:[^"]|"")*)"$/, (_, text) => text.replaceAll('""', '"'))
        .replace(/^'(?=[=+@-])/, "");
}

function parseEmployeeRankingClipboardText(text) {
    const rows = parseClipboardRows(text);
    if (rows.length === 0) throw new Error("A área de transferência está vazia.");

    const { column, operatorColumn, startRow } = findExpeditionClipboardBlock(rows);
    const ranking = [];
    for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const cells = expedition.headers.map((_, index) => String(row[column + index] ?? "").trim());
        const [name, quantity, time] = cells;
        const fullName = readClipboardName(row[operatorColumn]);
        if (cells.every(isEmptyCell) && isEmptyCell(fullName)) continue;

        const operator = normalizeEmployeeRankingName(operatorColumn === -1 ? readClipboardName(name) : fullName);
        if (operatorColumn !== -1) {
            const displayedName = normalizeText(readClipboardName(name));
            if (isEmptyCell(operator) || (displayedName !== normalizeText(formatEmployeeRankingName(operator)) &&
                displayedName !== normalizeText(operator))) {
                throw new Error(`Confira o nome completo do conferente na coluna R, na linha ${rowIndex + 1} da seleção copiada.`);
            }
        }
        const routesChecked = parseRouteCount(quantity.replace(/[\u00a0\u202f]/g, " "));
        const hasTime = !isEmptyCell(time);
        const averageDuration = hasTime ? parseAverageDuration(time) : 0;
        const totalDurationSeconds = averageDuration * routesChecked;
        if (isEmptyCell(operator) || routesChecked === null || averageDuration === null || !Number.isSafeInteger(totalDurationSeconds)) {
            throw new Error(`Revise o colaborador, a quantidade e o tempo na linha ${rowIndex + 1} da seleção copiada.`);
        }

        ranking.push({
            operator,
            routesChecked,
            totalDurationSeconds,
            routesWithDuration: hasTime ? routesChecked : 0,
        });
    }

    return ranking;
}

function formatSpreadsheetDuration(seconds) {
    if (!Number.isFinite(seconds)) return "";

    const total = Math.round(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total % 3600 / 60);
    return [hours, minutes, total % 60].map(value => String(value).padStart(2, "0")).join(":");
}

function cell(value, style, span = 1, rowSpan = 1) {
    return { value, style, span, rowSpan };
}

function nameCell(value, style) {
    return {
        ...cell(value, style),
        textValue: /^[=+@-]/.test(value ?? "") ? `'${value}` : value,
    };
}

function createEmployeeRankingClipboard(ranking, previousRowCount = 0) {
    const rowCount = Math.max(ranking.length, MIN_EMPLOYEE_RANKING_ROWS, previousRowCount);
    const emptyCell = cell(null, blankStyle);
    const sectionGap = cell(null, blankStyle, 1, rowCount + 2);
    const rows = [
        [cell(rankingTitle, titleStyle, 15, 2), cell(null, blankStyle, 1, 2), emptyCell],
        [...Array(16).fill(null), emptyCell],
        Array(columnWidths.length).fill(emptyCell),
        [...rankingSections.flatMap(section => [cell(section.title, sectionStyle, section.headers.length), sectionGap]), emptyCell],
        [...rankingSections.flatMap(section => [...section.headers.map(header => cell(header, headerStyle)), null]),
            cell(operatorHeader, headerStyle)],
    ];

    for (let index = 0; index < rowCount; index += 1) {
        const entry = ranking[index];
        const style = rowStyles[index % rowStyles.length];
        const expeditionCells = [
            nameCell(entry?.displayName, style),
            cell(entry?.routesChecked, style),
            // Let the spreadsheet recognize hh:mm:ss as a time value, as in text paste.
            { ...cell(formatSpreadsheetDuration(entry?.averageDurationSeconds), style), inferValueType: true },
        ];
        rows.push([
            ...rankingSections.flatMap(section => [
                ...(section === expedition ? expeditionCells : section.headers.map(() => cell(null, style))),
                null,
            ]),
            nameCell(entry?.operator, style),
        ]);
    }

    return createClipboardTable(rows, { columnWidths });
}

export { MIN_EMPLOYEE_RANKING_ROWS, createEmployeeRankingClipboard, parseEmployeeRankingClipboardText };
