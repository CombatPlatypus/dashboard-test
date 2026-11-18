import { normalizeText, parseClipboardRows } from "../../filter/clipboard-source.js";
import { createClipboardTable } from "../summary-copy.js";
import { normalizeEmployeeRankingName, readEmployeeOpsCode } from "./model.js";

const MIN_EMPLOYEE_RANKING_ROWS = 150;
const rankingTitle = "RANKING MENSAL DE DESEMPENHO";
const rankingHeaders = ["Colaborador", "Quantidade"];
const receipt = { title: "Mesa de Recebimento", previousTitles: ["Recebimento", "Recebimento de Pacotes"] };
const labelingErrors = { title: "Erros de Etiquetagem" };
const receivedDamage = { title: "Avarias Recebidas" };
const expedition = { title: "Rotas Conferidas", previousTitles: ["Rotas Conferidas e Tempo Médio"] };
const offPackages = { title: "Pacotes OFF" };
const operatorFormulaPrefix = "Nome e id do conferente: ";
const operatorFormulaPrefixes = [operatorFormulaPrefix, "Nome completo do conferente: "];
const columnWidths = [80, 181, 121, 21, 181, 121, 21, 181, 121, 21, 181, 121, 21, 201, 121, 80];
// Match the inline cell formatting copied by Google Sheets from the ranking template.
const blankStyle = { background: "#121212", fontSize: 10, inlineFormattingOnly: true };
const titleStyle = {
    ...blankStyle, background: "#323232", fontSize: 20, bold: true, borderSides: ["top", "right", "bottom", "left"],
};
const sectionStyle = { ...titleStyle, fontSize: 12, bold: false };
const gapStyle = { ...blankStyle, borderSides: ["top", "bottom"], borderColor: "#101010" };
const marginStyle = { ...blankStyle, background: "#101010" };
const titleMarginStyle = { ...marginStyle, borderSides: ["top"], borderColor: "#101010" };
const sectionMarginStyle = { ...gapStyle, background: "#101010" };
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
    const titles = [section.title, ...(section.previousTitles ?? [])].map(normalizeText);
    for (const [rowIndex, row] of rows.entries()) {
        const column = row.findIndex(value => titles.includes(normalizeText(value)));
        if (column === -1) continue;

        const headers = rows[rowIndex + 1];
        if (!isRankingHeader(section, headers, column)) {
            throw new Error(`Confira os cabeçalhos de ${section.title} na seleção copiada.`);
        }
        return { column, startRow: rowIndex + 2 };
    }
    return null;
}

function findLegacyExpeditionClipboardBlock(rows) {
    // An isolated block from the previous model can still have a third column for time.
    if (rows.every(row => row.length <= 3)) {
        const firstRow = rows.findIndex(row => row.some(value => normalizeText(value)));
        return {
            column: 0,
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

function readRankingIdentity(value) {
    const source = readOperatorFormula(value) ?? value;
    const opsCode = readEmployeeOpsCode(source);
    const name = normalizeEmployeeRankingName(source);
    return { operator: isEmptyCell(name) && opsCode ? opsCode : name, ...(opsCode && { opsCode }) };
}

function parseRankingClipboardBlock(rows, section, { column, startRow }) {
    const ranking = [];
    for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const name = readClipboardName(row[column]);
        const quantity = String(row[column + 1] ?? "").trim();
        if (isEmptyCell(name) && isEmptyCell(quantity)) continue;

        const identity = readRankingIdentity(name);
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

function cell(value, style, span = 1, rowSpan = 1) {
    return { value, style, span, rowSpan };
}

function nameCell(value, style) {
    return {
        ...cell(value, style),
        textValue: /^[=+@-]/.test(value ?? "") ? `'${value}` : value,
    };
}

function createRankingNameCell(entry, style) {
    if (!entry) return cell(null, style);

    const { displayName, opsCode, operator } = entry;
    const displayed = nameCell(displayName, style);
    if (!opsCode) return displayed;

    const identity = `[${opsCode}] ${operator}`;
    const escapeFormulaText = value => value.replaceAll('"', '""');
    return {
        ...displayed,
        // T(N(text)) keeps the OPS and full name in the formula while displaying only the short name.
        formula: `="${escapeFormulaText(displayName)}"&T(N("${operatorFormulaPrefix}${escapeFormulaText(identity)}"))`,
    };
}

function createEmployeeRankingClipboard({
    receiptRanking = [], labelingErrorsRanking = [], receivedDamageRanking = [],
    expeditionRanking = [], offPackagesRanking = [],
}, previousRowCount = 0) {
    const sections = [
        [receipt, receiptRanking],
        [labelingErrors, labelingErrorsRanking],
        [expedition, expeditionRanking],
        [receivedDamage, receivedDamageRanking],
        [offPackages, offPackagesRanking],
    ];
    const rowCount = Math.max(MIN_EMPLOYEE_RANKING_ROWS, previousRowCount, ...sections.map(([, ranking]) => ranking.length));
    const innerWidth = columnWidths.length - 2;
    const titleMargin = cell(null, titleMarginStyle, 1, 2);
    const emptyCell = cell(null, blankStyle);
    const emptyMargin = cell(null, marginStyle);
    const sectionGap = cell(null, gapStyle, 1, rowCount + 2);
    const sectionMargin = cell(null, sectionMarginStyle, 1, rowCount + 2);
    const sectionRow = (createSectionCells, gap = null, margin = null) => [
        margin,
        ...sections.flatMap(([section, ranking], index) => {
            const cells = createSectionCells(section, ranking);
            return index === 0 ? cells : [gap, ...cells];
        }),
        margin,
    ];
    const rows = [
        [titleMargin, cell(rankingTitle, titleStyle, innerWidth, 2), titleMargin],
        Array(columnWidths.length).fill(null),
        [emptyMargin, ...Array(innerWidth).fill(emptyCell), emptyMargin],
        sectionRow(section => [cell(section.title, sectionStyle, rankingHeaders.length)], sectionGap, sectionMargin),
        sectionRow(() => rankingHeaders.map(header => cell(header, headerStyle))),
    ];

    for (let index = 0; index < rowCount; index += 1) {
        const style = rowStyles[index % rowStyles.length];
        rows.push(sectionRow((_, ranking) => {
            const entry = ranking[index];
            return [createRankingNameCell(entry, style), cell(entry?.quantity, style)];
        }));
    }

    return { ...createClipboardTable(rows, { columnWidths }), rowCount };
}

export { MIN_EMPLOYEE_RANKING_ROWS, createEmployeeRankingClipboard, parseEmployeeRankingClipboard, readEmployeeRankingClipboard };
