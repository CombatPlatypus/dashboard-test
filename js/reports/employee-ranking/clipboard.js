import { normalizeText, parseClipboardRows } from "../../filter/clipboard-source.js";
import { normalizeEmployeeRankingName } from "./model.js";

const MIN_EMPLOYEE_RANKING_ROWS = 150;
const expeditionTitle = "rotas conferidas e tempo medio";
const expeditionHeaders = ["colaborador", "quantidade", "tempo"];

function isExpeditionHeader(row, column) {
    return expeditionHeaders.every((header, index) => normalizeText(row?.[column + index]) === header);
}

function findExpeditionClipboardBlock(rows) {
    for (const [rowIndex, row] of rows.entries()) {
        const column = row.findIndex(value => normalizeText(value) === expeditionTitle);
        if (column !== -1 && isExpeditionHeader(rows[rowIndex + 1], column)) {
            return { column, startRow: rowIndex + 2 };
        }
    }

    if (rows.every(row => row.length <= expeditionHeaders.length)) {
        const firstRow = rows.findIndex(row => row.some(value => normalizeText(value)));
        return {
            column: 0,
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

function parseEmployeeRankingClipboardText(text) {
    const rows = parseClipboardRows(text);
    if (rows.length === 0) throw new Error("A área de transferência está vazia.");

    const { column, startRow } = findExpeditionClipboardBlock(rows);
    const ranking = [];
    for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
        const cells = expeditionHeaders.map((_, index) => String(rows[rowIndex][column + index] ?? "").trim());
        const [name, quantity, time] = cells;
        if (cells.every(isEmptyCell)) continue;

        const operator = normalizeEmployeeRankingName(name.replace(/^'(?=[=+@-])/, ""));
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

function createEmployeeRankingClipboardText(ranking, previousRowCount = 0) {
    const rowCount = Math.max(ranking.length, MIN_EMPLOYEE_RANKING_ROWS, previousRowCount);
    return Array.from({ length: rowCount }, (_, index) => {
        const row = ranking[index];
        if (!row) return "\t\t";

        const operator = normalizeEmployeeRankingName(row.operator);
        const clipboardName = /^[=+@-]/.test(operator) ? `'${operator}` : operator;
        return [clipboardName, row.routesChecked, formatSpreadsheetDuration(row.averageDurationSeconds)].join("\t");
    }).join("\n");
}

export { MIN_EMPLOYEE_RANKING_ROWS, createEmployeeRankingClipboardText, parseEmployeeRankingClipboardText };
