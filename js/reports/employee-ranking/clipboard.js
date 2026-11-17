import { normalizeText, parseClipboardRows } from "../../filter/clipboard-source.js";
import { createClipboardTable } from "../summary-copy.js";
import { formatEmployeeRankingName, normalizeEmployeeRankingName } from "./model.js";

const MIN_EMPLOYEE_RANKING_ROWS = 150;
const rankingTitle = "RANKING MENSAL DE DESEMPENHO";
const commonHeaders = ["Colaborador", "Quantidade"];
const receipt = { title: "Recebimento", headers: commonHeaders, alternateTitle: "Recebimento de Pacotes" };
const labelingErrors = { title: "Erros de Etiquetagem", headers: commonHeaders };
const receivedDamage = { title: "Avarias Recebidas", headers: commonHeaders };
const expedition = { title: "Rotas Conferidas e Tempo Médio", headers: [...commonHeaders, "Tempo"] };
const offPackages = { title: "Pacotes OFF", headers: commonHeaders };
const rankingSections = [
    receipt,
    labelingErrors,
    receivedDamage,
    expedition,
    offPackages,
];
const operatorHeader = "Nome completo do conferente";
const operatorFormulaPrefix = `${operatorHeader}: `;
const columnWidths = [181, 121, 20, 181, 121, 20, 181, 121, 20, 181, 121, 81, 20, 201, 121];
// Match the inline cell formatting copied by Google Sheets from the ranking template.
const blankStyle = { background: "#121212", fontSize: 10, inlineFormattingOnly: true };
const titleStyle = { ...blankStyle, background: "#323232", fontSize: 20, bold: true, border: true };
const sectionStyle = { ...titleStyle, fontSize: 12, bold: false };
const sectionStyleWithoutRightBorder = { ...sectionStyle, borderRight: false };
const headerStyle = { ...blankStyle, background: "#242424", fontSize: 11, border: true };
const rowStyles = [
    { ...blankStyle, border: true },
    { ...blankStyle, background: "#1b1b1b", border: true },
];

function isRankingHeader(section, row, column) {
    return section.headers.every((header, index) => {
        const value = normalizeText(row?.[column + index]);
        return value === normalizeText(header) ||
            (header === "Quantidade" && value === "qtd") ||
            (section === receipt && header === "Quantidade" && value === "total recebido");
    });
}

function findRankingClipboardBlock(rows, section) {
    const titles = [section.title, section.alternateTitle].filter(Boolean).map(normalizeText);
    for (const [rowIndex, row] of rows.entries()) {
        const column = row.findIndex(value => titles.includes(normalizeText(value)));
        if (column === -1) continue;

        const headers = rows[rowIndex + 1];
        if (!isRankingHeader(section, headers, column)) {
            throw new Error(`Confira os cabeçalhos de ${section.title} na seleção copiada.`);
        }
        const operatorColumn = section === expedition
            ? headers.findIndex(value => normalizeText(value) === normalizeText(operatorHeader))
            : -1;
        return { column, operatorColumn, startRow: rowIndex + 2 };
    }
    return null;
}

function findLegacyExpeditionClipboardBlock(rows) {
    if (rows.every(row => row.length <= expedition.headers.length)) {
        const firstRow = rows.findIndex(row => row.some(value => normalizeText(value)));
        return {
            column: 0,
            operatorColumn: -1,
            startRow: isRankingHeader(expedition, rows[firstRow], 0) ? firstRow + 1 : 0,
        };
    }

    throw new Error("Copie a aba Ranking de Colaboradores ou as três colunas do bloco Rotas Conferidas e Tempo Médio.");
}

function parseRankingQuantity(value) {
    const normalized = value.replace(/[\u00a0\u202f]/g, " ");
    const digits = /^\d{1,3}(?:[. ]\d{3})+$/.test(normalized) ? normalized.replace(/[. ]/g, "") : normalized;
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

function readOperatorFormula(formula) {
    const match = /^=\s*"(?:[^"]|"")*"\s*&\s*T\(\s*N\(\s*"((?:[^"]|"")*)"\s*\)\s*\)$/i.exec(formula);
    return match?.[1].startsWith(operatorFormulaPrefix)
        ? match[1].slice(operatorFormulaPrefix.length).replaceAll('""', '"')
        : null;
}

function parseRankingHtmlRows(html) {
    if (!html.includes("data-sheets-formula")) return [];

    // The clipboard HTML stays in an inert template and is read as data.
    const template = document.createElement("template");
    template.innerHTML = html;
    const tableRows = Array.from(template.content.querySelector("table")?.rows ?? []);
    const rows = tableRows.map(() => []);
    let hasOperatorFormulas = false;

    for (const [rowIndex, row] of tableRows.entries()) {
        let column = 0;
        for (const cell of row.cells) {
            while (rows[rowIndex][column] !== undefined) column += 1;

            const rowEnd = Math.min(rowIndex + (cell.rowSpan || 1), rows.length);
            const columnEnd = column + cell.colSpan;
            for (let index = rowIndex; index < rowEnd; index += 1) {
                for (let slot = column; slot < columnEnd; slot += 1) {
                    rows[index][slot] = "";
                }
            }
            const formula = cell.getAttribute("data-sheets-formula") ??
                cell.querySelector("[data-sheets-formula]")?.getAttribute("data-sheets-formula");
            const isOperatorFormula = readOperatorFormula(formula) !== null;
            hasOperatorFormulas ||= isOperatorFormula;
            rows[rowIndex][column] = isOperatorFormula ? formula : cell.textContent;
            column = columnEnd;
        }
    }

    return hasOperatorFormulas ? rows : [];
}

async function readEmployeeRankingClipboard(clipboard = navigator.clipboard) {
    if (typeof clipboard?.read === "function") {
        try {
            const items = await clipboard.read({ unsanitized: ["text/html"] });
            const item = items.find(item => item.types.includes("text/html") || item.types.includes("text/plain"));
            if (item) {
                const readType = async type => item.types.includes(type) ? (await item.getType(type)).text() : "";
                const [text, html] = await Promise.all([readType("text/plain"), readType("text/html")]);
                if (text || html) return { text, html };
            }
        } catch {
            // Browsers with text-only clipboard access can still read the earlier format.
        }
    }

    return { text: await clipboard.readText(), html: "" };
}

function parseRankingClipboardBlock(rows, section, { column, operatorColumn, startRow }) {
    const hasOperatorFormulas = operatorColumn !== -1 &&
        rows.slice(startRow).some(row => readOperatorFormula(readClipboardName(row[column])) !== null);
    const legacyNameColumn = hasOperatorFormulas ? -1 : operatorColumn;
    const ranking = [];
    for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const cells = section.headers.map((_, index) => String(row[column + index] ?? "").trim());
        const [name, quantity, time] = cells;
        const fullName = readClipboardName(row[legacyNameColumn]);
        if (cells.every(isEmptyCell) && isEmptyCell(fullName)) continue;

        const displayValue = readClipboardName(name);
        const originalName = readOperatorFormula(displayValue) ?? (legacyNameColumn === -1 ? displayValue : fullName);
        const operator = normalizeEmployeeRankingName(originalName);
        if (legacyNameColumn !== -1) {
            const displayedName = normalizeText(displayValue);
            if (isEmptyCell(operator) || (displayedName !== normalizeText(formatEmployeeRankingName(operator)) &&
                displayedName !== normalizeText(operator))) {
                throw new Error(`Confira o nome completo do conferente na coluna R, na linha ${rowIndex + 1} da seleção copiada.`);
            }
        }
        const count = parseRankingQuantity(quantity);
        if (isEmptyCell(operator) || count === null) {
            throw new Error(`Revise o colaborador e a quantidade de ${section.title} na linha ${rowIndex + 1} da seleção copiada.`);
        }
        if (section !== expedition) {
            ranking.push({ operator, quantity: count });
            continue;
        }

        const hasTime = !isEmptyCell(time);
        const averageDuration = hasTime ? parseAverageDuration(time) : 0;
        const totalDurationSeconds = averageDuration * count;
        if (averageDuration === null || !Number.isSafeInteger(totalDurationSeconds)) {
            throw new Error(`Revise o tempo de Expedição na linha ${rowIndex + 1} da seleção copiada.`);
        }

        ranking.push({
            operator,
            routesChecked: count,
            totalDurationSeconds,
            routesWithDuration: hasTime ? count : 0,
        });
    }

    return ranking;
}

function parseEmployeeRankingClipboard({ text, html = "" }) {
    const htmlRows = parseRankingHtmlRows(html);
    const rows = htmlRows.length ? htmlRows : parseClipboardRows(text);
    if (rows.length === 0) throw new Error("A área de transferência está vazia.");

    const history = {};
    for (const [key, section] of Object.entries({ receipt, labelingErrors, expedition })) {
        const block = findRankingClipboardBlock(rows, section);
        if (block) history[key] = parseRankingClipboardBlock(rows, section, block);
    }
    if (Object.keys(history).length > 0) return history;

    return { expedition: parseRankingClipboardBlock(rows, expedition, findLegacyExpeditionClipboardBlock(rows)) };
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

function createRankingNameCell(entry, style) {
    if (!entry) return cell(null, style);

    const { displayName, operator } = entry;
    const escapeFormulaText = value => value.replaceAll('"', '""');
    return {
        ...cell(displayName, style),
        textValue: /^[=+@-]/.test(displayName) ? `'${displayName}` : displayName,
        // T(N(text)) is empty in Sheets, so the formula keeps the full name without displaying it.
        formula: `="${escapeFormulaText(displayName)}"&T(N("${operatorFormulaPrefix}${escapeFormulaText(operator)}"))`,
    };
}

function createEmployeeRankingClipboard({
    receiptRanking = [], labelingErrorsRanking = [], receivedDamageRanking = [],
    expeditionRanking = [], offPackagesRanking = [],
}, previousRowCount = 0) {
    const countsBySection = new Map([
        [receipt, receiptRanking],
        [labelingErrors, labelingErrorsRanking],
        [receivedDamage, receivedDamageRanking],
        [offPackages, offPackagesRanking],
    ]);
    const rowCount = Math.max(MIN_EMPLOYEE_RANKING_ROWS, previousRowCount, expeditionRanking.length,
        ...Array.from(countsBySection.values(), ranking => ranking.length));
    const emptyCell = cell(null, blankStyle);
    const sectionGap = cell(null, blankStyle, 1, rowCount + 2);
    const sectionRow = (createSectionCells, gap = null) => rankingSections.flatMap((section, index) =>
        index === 0 ? createSectionCells(section) : [gap, ...createSectionCells(section)],
    );
    const rows = [
        [cell(rankingTitle, titleStyle, columnWidths.length, 2)],
        Array(columnWidths.length).fill(null),
        Array(columnWidths.length).fill(emptyCell),
        sectionRow(section => {
            const style = section === receivedDamage || section === offPackages
                ? sectionStyleWithoutRightBorder
                : sectionStyle;
            return [cell(section.title, style, section.headers.length)];
        }, sectionGap),
        sectionRow(section => section.headers.map(header => cell(header, headerStyle))),
    ];

    for (let index = 0; index < rowCount; index += 1) {
        const entry = expeditionRanking[index];
        const style = rowStyles[index % rowStyles.length];
        const expeditionCells = [
            createRankingNameCell(entry, style),
            cell(entry?.routesChecked, style),
            // Let the spreadsheet recognize hh:mm:ss as a time value, as in text paste.
            { ...cell(formatSpreadsheetDuration(entry?.averageDurationSeconds), style), inferValueType: true },
        ];
        rows.push(sectionRow(section => {
            if (section === expedition) return expeditionCells;
            const occurrence = countsBySection.get(section)?.[index];
            return [createRankingNameCell(occurrence, style), cell(occurrence?.quantity, style)];
        }));
    }

    return createClipboardTable(rows, { columnWidths });
}

export { MIN_EMPLOYEE_RANKING_ROWS, createEmployeeRankingClipboard, parseEmployeeRankingClipboard, readEmployeeRankingClipboard };
