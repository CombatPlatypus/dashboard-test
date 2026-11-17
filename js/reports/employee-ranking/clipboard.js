import { normalizeText, parseClipboardRows } from "../../filter/clipboard-source.js";
import { createClipboardTable } from "../summary-copy.js";
import { formatEmployeeRankingName, normalizeEmployeeRankingName, readEmployeeOpsCode } from "./model.js";

const MIN_EMPLOYEE_RANKING_ROWS = 150;
const rankingTitle = "RANKING MENSAL DE DESEMPENHO";
const rankingHeaders = ["Colaborador", "Quantidade"];
const receipt = { title: "Recebimento", alternateTitle: "Recebimento de Pacotes" };
const labelingErrors = { title: "Erros de Etiquetagem" };
const receivedDamage = { title: "Avarias Recebidas" };
const expedition = { title: "Rotas Conferidas", alternateTitle: "Rotas Conferidas e Tempo Médio" };
const offPackages = { title: "Pacotes OFF" };
const rankingSections = [receipt, labelingErrors, receivedDamage, expedition, offPackages];
const operatorHeader = "Nome completo do conferente";
const operatorFormulaPrefix = "Nome e id do conferente: ";
const operatorFormulaPrefixes = [operatorFormulaPrefix, `${operatorHeader}: `];
const directoryHeaders = ["Código Ops", "Nome do Colaborador"];
const columnWidths = [181, 121, 21, 181, 121, 21, 181, 141, 21, 181, 121, 21, 201, 121, 21, 121, 301];
// Match the inline cell formatting copied by Google Sheets from the ranking template.
const blankStyle = { background: "#121212", fontSize: 10, inlineFormattingOnly: true };
const titleStyle = {
    ...blankStyle, background: "#323232", fontSize: 20, bold: true, borderSides: ["top", "right", "bottom", "left"],
};
const sectionStyle = { ...titleStyle, fontSize: 12, bold: false };
const gapStyle = { ...blankStyle, borderSides: ["top", "bottom"], borderColor: "#101010" };
const headerStyle = { ...blankStyle, background: "#242424", fontSize: 11, border: true };
const rowStyles = [
    { ...blankStyle, border: true },
    { ...blankStyle, background: "#1b1b1b", border: true },
];

function isRankingHeader(section, row, column) {
    return rankingHeaders.every((header, index) => {
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
    // An isolated block from the previous model can still have a third column for time.
    if (rows.every(row => row.length <= 3)) {
        const firstRow = rows.findIndex(row => row.some(value => normalizeText(value)));
        return {
            column: 0,
            operatorColumn: -1,
            startRow: isRankingHeader(expedition, rows[firstRow], 0) ? firstRow + 1 : 0,
        };
    }

    throw new Error("Copie a aba Ranking de Colaboradores ou o bloco Rotas Conferidas.");
}

function parseRankingQuantity(value) {
    const normalized = value.replace(/[\u00a0\u202f]/g, " ");
    const digits = /^\d{1,3}(?:[. ]\d{3})+$/.test(normalized) ? normalized.replace(/[. ]/g, "") : normalized;
    return /^\d+$/.test(digits) && Number.isSafeInteger(Number(digits)) ? Number(digits) : null;
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
    const match = /^\s*=?\s*"(?:[^"]|"")*"\s*&\s*T\(\s*N\(\s*"((?:[^"]|"")*)"\s*\)\s*\)\s*$/i.exec(formula);
    const metadata = match?.[1];
    const prefix = operatorFormulaPrefixes.find(candidate => metadata?.startsWith(candidate));
    return prefix ? metadata.slice(prefix.length).replaceAll('""', '"') : null;
}

function findDirectoryHeader(rows) {
    const codeHeader = normalizeText(directoryHeaders[0]);
    const nameHeader = normalizeText(directoryHeaders[1]);
    for (const [index, row] of rows.entries()) {
        const column = row.findIndex(value => normalizeText(value) === codeHeader);
        if (column >= 0 && normalizeText(row[column + 1]) === nameHeader) return { column, startRow: index + 1 };
    }
    return null;
}

function readOperatorDirectory(rows) {
    const header = findDirectoryHeader(rows);
    if (!header) return null;

    const { column, startRow } = header;
    const operators = new Map();
    for (let index = startRow; index < rows.length; index += 1) {
        const code = readClipboardName(rows[index][column]);
        const operator = normalizeEmployeeRankingName(readClipboardName(rows[index][column + 1]));
        if (isEmptyCell(code) && isEmptyCell(operator)) continue;

        const opsCode = readEmployeeOpsCode(code);
        if (!opsCode || isEmptyCell(operator)) {
            throw new Error(`Confira Código Ops e Nome do Colaborador na linha ${index + 1} da seleção copiada.`);
        }
        if (!operators.has(opsCode)) operators.set(opsCode, { opsCode, operator });
    }
    return [...operators.values()];
}

function parseRankingHtmlRows(html) {
    if (!html.includes("data-sheets-formula") && !html.includes(directoryHeaders[0])) return [];

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

    return hasOperatorFormulas || findDirectoryHeader(rows) ? rows : [];
}

async function readEmployeeRankingClipboard(clipboard = navigator.clipboard) {
    let text = "";
    if (typeof clipboard?.read === "function") {
        for (const options of [{ unsanitized: ["text/html"] }, undefined]) {
            try {
                const items = options ? await clipboard.read(options) : await clipboard.read();
                const readType = async type => {
                    const item = items.find(candidate => candidate.types.includes(type));
                    return item ? (await item.getType(type)).text() : "";
                };
                const [plain, rich] = await Promise.allSettled([readType("text/plain"), readType("text/html")]);
                if (plain.status === "fulfilled" && plain.value) text = plain.value;
                if (rich.status === "fulfilled" && (rich.value || (!options && text))) return { text, html: rich.value };
            } catch (error) {
                if (error?.name === "NotAllowedError") break;
                // Try the standard read() when the unsanitized format option is unavailable.
            }
        }
    }

    return { text: text || await clipboard.readText(), html: "" };
}

function readRankingIdentity(displayValue, storedValue, { fromLegacyColumn, rowIndex }) {
    const formulaName = readOperatorFormula(displayValue);
    const source = formulaName ?? (fromLegacyColumn ? storedValue : displayValue);
    const operator = normalizeEmployeeRankingName(source);
    const opsCode = readEmployeeOpsCode(source);
    if (fromLegacyColumn) {
        const displayedName = normalizeText(displayValue);
        if (isEmptyCell(operator) || (displayedName !== normalizeText(operator) &&
            displayedName !== normalizeText(formatEmployeeRankingName(operator)))) {
            throw new Error(`Confira o nome completo do conferente na coluna R, na linha ${rowIndex + 1} da seleção copiada.`);
        }
    }
    return { operator, ...(opsCode && { opsCode }), ...((formulaName !== null || fromLegacyColumn) && { fullNameConfirmed: true }) };
}

function parseRankingClipboardBlock(rows, section, { column, operatorColumn, startRow }) {
    const hasOperatorFormulas = operatorColumn !== -1 &&
        rows.slice(startRow).some(row => readOperatorFormula(readClipboardName(row[column])) !== null);
    const legacyNameColumn = hasOperatorFormulas ? -1 : operatorColumn;
    const ranking = [];
    for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const name = String(row[column] ?? "").trim();
        const quantity = String(row[column + 1] ?? "").trim();
        const legacyName = readClipboardName(row[legacyNameColumn]);
        if (isEmptyCell(name) && isEmptyCell(quantity) && isEmptyCell(legacyName)) continue;

        const displayValue = readClipboardName(name);
        const identity = readRankingIdentity(displayValue, legacyName, {
            fromLegacyColumn: legacyNameColumn !== -1,
            rowIndex,
        });
        const count = parseRankingQuantity(quantity);
        if (isEmptyCell(identity.operator) || count === null) {
            throw new Error(`Revise o colaborador e a quantidade de ${section.title} na linha ${rowIndex + 1} da seleção copiada.`);
        }
        ranking.push(section === expedition ? { ...identity, routesChecked: count } : { ...identity, quantity: count });
    }

    return ranking;
}

function parseEmployeeRankingClipboard({ text, html = "" }) {
    const htmlRows = parseRankingHtmlRows(html);
    const textRows = parseClipboardRows(text);
    const rows = htmlRows.length ? htmlRows : textRows;
    if (rows.length === 0) throw new Error("A área de transferência está vazia.");

    const history = {};
    for (const [key, section] of Object.entries({ receipt, labelingErrors, expedition })) {
        const block = findRankingClipboardBlock(rows, section);
        if (block) history[key] = parseRankingClipboardBlock(rows, section, block);
    }
    const operatorDirectory = readOperatorDirectory(textRows) ?? readOperatorDirectory(htmlRows);
    if (operatorDirectory !== null) history.operatorDirectory = operatorDirectory;
    if (Object.keys(history).length > 0) return history;

    return { expedition: parseRankingClipboardBlock(rows, expedition, findLegacyExpeditionClipboardBlock(rows)) };
}

function cell(value, style, span = 1, rowSpan = 1) {
    return { value, style, span, rowSpan };
}

function formatStoredRankingIdentity(entry) {
    return entry.opsCode ? `[${entry.opsCode}] ${entry.operator}` : entry.operator;
}

function collectOperatorDirectory(rankings, existingDirectory) {
    const operators = new Map();
    for (const entry of [...rankings.flat(), ...existingDirectory]) {
        const opsCode = readEmployeeOpsCode(entry.opsCode);
        if (opsCode && !operators.has(opsCode)) {
            operators.set(opsCode, { opsCode, operator: entry.operator });
        }
    }
    return [...operators.values()].sort((first, second) =>
        first.operator.localeCompare(second.operator, "pt-BR") || first.opsCode.localeCompare(second.opsCode, "pt-BR"));
}

function nameCell(value, style) {
    return {
        ...cell(value, style),
        textValue: /^[=+@-]/.test(value ?? "") ? `'${value}` : value,
    };
}

function createRankingNameCell(entry, style) {
    if (!entry) return cell(null, style);

    const { displayName } = entry;
    const displayed = nameCell(displayName, style);
    const identity = formatStoredRankingIdentity(entry);
    if (!identity) return displayed;

    const escapeFormulaText = value => value.replaceAll('"', '""');
    return {
        ...displayed,
        // T(N(text)) is empty in Sheets, so the formula keeps the full name without displaying it.
        formula: `="${escapeFormulaText(displayName)}"&T(N("${operatorFormulaPrefix}${escapeFormulaText(identity)}"))`,
    };
}

function createEmployeeRankingClipboard({
    receiptRanking = [], labelingErrorsRanking = [], receivedDamageRanking = [],
    expeditionRanking = [], offPackagesRanking = [], operatorDirectory = [],
}, previousRowCount = 0) {
    const rankingsBySection = new Map([
        [receipt, receiptRanking],
        [labelingErrors, labelingErrorsRanking],
        [receivedDamage, receivedDamageRanking],
        [expedition, expeditionRanking],
        [offPackages, offPackagesRanking],
    ]);
    const directory = collectOperatorDirectory([receiptRanking, expeditionRanking, labelingErrorsRanking], operatorDirectory);
    const rowCount = Math.max(MIN_EMPLOYEE_RANKING_ROWS, previousRowCount, directory.length,
        ...Array.from(rankingsBySection.values(), ranking => ranking.length));
    const emptyCell = cell(null, blankStyle);
    const sectionGap = cell(null, gapStyle, 1, rowCount + 2);
    const sectionRow = (createSectionCells, gap = null) => rankingSections.flatMap((section, index) =>
        index === 0 ? createSectionCells(section) : [gap, ...createSectionCells(section)],
    );
    const rows = [
        [cell(rankingTitle, titleStyle, columnWidths.length, 2)],
        Array(columnWidths.length).fill(null),
        Array(columnWidths.length).fill(emptyCell),
        [...sectionRow(section => [cell(section.title, sectionStyle, rankingHeaders.length)], sectionGap),
            sectionGap, cell("Base de Colaboradores", sectionStyle, directoryHeaders.length)],
        [...sectionRow(() => rankingHeaders.map(header => cell(header, headerStyle))), null,
            ...directoryHeaders.map(header => cell(header, headerStyle))],
    ];

    for (let index = 0; index < rowCount; index += 1) {
        const style = rowStyles[index % rowStyles.length];
        const operator = directory[index];
        rows.push([...sectionRow(section => {
            const entry = rankingsBySection.get(section)[index];
            return [createRankingNameCell(entry, style), cell(entry?.quantity, style)];
        }), null, cell(operator?.opsCode, style), nameCell(operator?.operator, style)]);
    }

    return { ...createClipboardTable(rows, { columnWidths }), rowCount };
}

export { MIN_EMPLOYEE_RANKING_ROWS, createEmployeeRankingClipboard, parseEmployeeRankingClipboard, readEmployeeRankingClipboard };
