import { normalizeText, parseClipboardRows } from "../../filter/clipboard-source.js";
import { createClipboardTable } from "../summary-copy.js";
import { normalizeEmployeeRankingName, readEmployeeOpsCode } from "./model.js";

const MIN_EMPLOYEE_RANKING_ROWS = 150;
const rankingTitle = "RANKING MENSAL DE DESEMPENHO";
const opsHeader = "ID OPS";
const operatorHeaders = ["Colaborador", "Quantidade"];
const rankingHeaders = [opsHeader, ...operatorHeaders];
const receipt = { title: "Mesa de Recebimento", previousTitles: ["Recebimento", "Recebimento de Pacotes"] };
const labelingErrors = { title: "Erros de Etiquetagem" };
const receivedDamage = { title: "Avarias Recebidas" };
const expedition = { title: "Rotas Conferidas", previousTitles: ["Rotas Conferidas e Tempo Médio"] };
const offPackages = { title: "Pacotes OFF" };
const operatorFormulaPrefixes = ["Nome e id do conferente: ", "Nome completo do conferente: "];
const columnWidths = [
    101, 181, 121, 21, 101, 181, 121, 21, 101, 181, 121, 21, 181, 181, 121, 21, 201, 201, 121,
];
// Match the inline cell formatting copied by Google Sheets from the ranking template.
const blankStyle = { background: "#121212", fontSize: 10, inlineFormattingOnly: true };
const titleStyle = {
    ...blankStyle, background: "#323232", fontSize: 20, bold: true, borderSides: ["top", "right", "bottom", "left"],
};
const sectionStyle = { ...titleStyle, fontSize: 12, bold: false };
const gapStyle = { ...blankStyle, borderSides: ["top", "bottom"], borderColor: "#101010" };
const headerStyle = { ...blankStyle, background: "#242424", fontSize: 11, border: true };
const offPackagesRowStyle = { ...blankStyle, border: true };
const rowStyles = [
    { ...blankStyle, background: "#101010", border: true },
    { ...blankStyle, background: "#1b1b1b", border: true },
];

function isOpsHeader(value) {
    return normalizeText(value) === "id ops";
}

function getRankingHeaderColumns(section, row, column) {
    const opsColumn = isOpsHeader(row?.[column]) ? column : -1;
    const nameColumn = opsColumn === -1 ? column : column + 1;
    const hasHeaders = operatorHeaders.every((header, index) => {
        const value = normalizeText(row?.[nameColumn + index]);
        return value === normalizeText(header) ||
            (header === "Quantidade" && value === "qtd") ||
            (section === receipt && header === "Quantidade" && value === "total recebido");
    });
    return hasHeaders ? { nameColumn, opsColumn } : null;
}

function findRankingClipboardBlock(rows, section) {
    const titles = [section.title, ...(section.previousTitles ?? [])].map(normalizeText);
    for (const [rowIndex, row] of rows.entries()) {
        const column = row.findIndex(value => titles.includes(normalizeText(value)));
        if (column === -1) continue;

        const columns = getRankingHeaderColumns(section, rows[rowIndex + 1], column);
        if (!columns) {
            throw new Error(`Confira os cabeçalhos de ${section.title} na seleção copiada.`);
        }
        return { ...columns, startRow: rowIndex + 2 };
    }
    return null;
}

function findIsolatedExpeditionClipboardBlock(rows) {
    // An isolated block from the previous model can still have a third column for time.
    if (rows.every(row => row.length <= 3)) {
        const firstRow = rows.findIndex(row => row.some(value => normalizeText(value)));
        const columns = getRankingHeaderColumns(expedition, rows[firstRow], 0);
        if (columns) return { ...columns, startRow: firstRow + 1 };
        return { nameColumn: 0, opsColumn: -1, startRow: 0 };
    }

    throw new Error("Copie a aba Ranking de Colaboradores com os títulos e as colunas ID OPS (C, G e K). Se estiverem ocultas, reexiba essas colunas antes de copiar.");
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
    if (!html || typeof document === "undefined") return { rows: [], hasOperatorFormulas: false };

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

    return { rows, hasOperatorFormulas };
}

function countOpsHeaders(rows) {
    return rows.reduce((total, row) => total + row.filter(isOpsHeader).length, 0);
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

function readRankingIdentity(value, id) {
    const source = readOperatorFormula(value) ?? value;
    const columnOpsCode = /^\d+$/.test(id) ? `ops${id}` : readEmployeeOpsCode(id);
    const opsCode = columnOpsCode || readEmployeeOpsCode(source);
    const name = normalizeEmployeeRankingName(source);
    return { operator: isEmptyCell(name) && opsCode ? opsCode : name, ...(opsCode && { opsCode }) };
}

function parseRankingClipboardBlock(rows, section, { nameColumn, opsColumn, startRow }) {
    const ranking = [];
    for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const id = readClipboardName(row[opsColumn]);
        const name = readClipboardName(row[nameColumn]);
        const quantity = String(row[nameColumn + 1] ?? "").trim();
        if (isEmptyCell(id) && isEmptyCell(name) && isEmptyCell(quantity)) continue;

        const identity = readRankingIdentity(name, id);
        const count = parseRankingQuantity(quantity);
        if (isEmptyCell(identity.operator) || count === null) {
            throw new Error(`Revise o colaborador e a quantidade de ${section.title} na linha ${rowIndex + 1} da seleção copiada.`);
        }
        ranking.push(section === expedition ? { ...identity, routesChecked: count } : { ...identity, quantity: count });
    }

    return ranking;
}

function parseEmployeeRankingClipboard({ text, html = "" }) {
    const textRows = parseClipboardRows(text);
    const { rows: htmlRows, hasOperatorFormulas } = parseRankingHtmlRows(html);
    const htmlOpsHeaders = countOpsHeaders(htmlRows);
    const useHtml = htmlRows.length > 0 && (textRows.length === 0 ||
        ((hasOperatorFormulas || htmlOpsHeaders > 0) && htmlOpsHeaders >= countOpsHeaders(textRows)));
    const rows = useHtml ? htmlRows : textRows;
    if (rows.length === 0) throw new Error("A área de transferência está vazia.");

    const history = {};
    for (const [key, section] of Object.entries({ receipt, labelingErrors, expedition })) {
        const block = findRankingClipboardBlock(rows, section);
        if (block) history[key] = parseRankingClipboardBlock(rows, section, block);
    }
    if (Object.keys(history).length > 0) return history;

    return { expedition: parseRankingClipboardBlock(rows, expedition, findIsolatedExpeditionClipboardBlock(rows)) };
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
    const emptyCell = cell(null, blankStyle);
    const sectionGap = cell(null, gapStyle, 1, rowCount + 2);
    const sectionRow = (createSectionCells, gap = null) =>
        sections.flatMap(([section, ranking], index) => {
            const cells = createSectionCells(section, ranking);
            return index === 0 ? cells : [gap, ...cells];
        });
    const rows = [
        [cell(rankingTitle, titleStyle, columnWidths.length, 2)],
        Array(columnWidths.length).fill(null),
        Array(columnWidths.length).fill(emptyCell),
        sectionRow(section => [cell(section.title, sectionStyle, rankingHeaders.length)], sectionGap),
        sectionRow(() => rankingHeaders.map(header => cell(header, headerStyle))),
    ];

    for (let index = 0; index < rowCount; index += 1) {
        const stripe = index % rowStyles.length;
        rows.push(sectionRow((section, ranking) => {
            const entry = ranking[index];
            const style = section === offPackages && stripe === 0 ? offPackagesRowStyle : rowStyles[stripe];
            return [cell(entry?.opsCode, style), nameCell(entry?.displayName, style), cell(entry?.quantity, style)];
        }));
    }

    return { ...createClipboardTable(rows, { columnWidths }), rowCount };
}

export { MIN_EMPLOYEE_RANKING_ROWS, createEmployeeRankingClipboard, parseEmployeeRankingClipboard, readEmployeeRankingClipboard };
