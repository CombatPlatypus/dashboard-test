const EMPTY_SPREADSHEET_VALUE = "—";
const percentageFormatter = new Intl.NumberFormat("pt-BR", {
    style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function spreadsheetText(value) {
    return String(value ?? "").trim() || EMPTY_SPREADSHEET_VALUE;
}

function spreadsheetQuantity(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : EMPTY_SPREADSHEET_VALUE;
}

function spreadsheetRate(numerator, denominator) {
    return typeof numerator === "number" && typeof denominator === "number" && denominator > 0
        ? percentageFormatter.format(numerator / denominator) : EMPTY_SPREADSHEET_VALUE;
}

function spreadsheetDuration(seconds) {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) return EMPTY_SPREADSHEET_VALUE;
    const duration = Math.max(0, Math.round(seconds));
    const minutes = String(Math.floor(duration / 60) % 60).padStart(2, "0");
    const remainder = String(duration % 60).padStart(2, "0");
    return duration >= 3600 ? `${String(Math.floor(duration / 3600)).padStart(2, "0")}:${minutes}:${remainder}`
        : `${minutes}:${remainder}`;
}

function createReportSpreadsheetFileName(kind, date = new Date()) {
    const datePart = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")].join("-");
    return `relatorio-de-${kind}-${datePart}.xlsx`;
}

// Descobre as linhas existentes no modelo, sem sobrescrever a seção seguinte.
function fillSpreadsheetTable(template, cells, { columns, headers, rows, label }) {
    const header = [...template.cellValues].find(([reference, value]) =>
        reference.match(new RegExp(`^${columns[0]}[1-9]\\d*$`)) && value === headers[0] &&
        columns.every((column, index) => template.cellValues.get(`${column}${reference.slice(columns[0].length)}`) === headers[index]));
    if (!header) throw new Error(`A seção ${label} não foi encontrada no modelo XLSX.`);
    const startRow = Number(header[0].slice(columns[0].length)) + 1;
    const references = new Set([...template.worksheetXml.matchAll(/<c\b[^>]*\br="([A-Z]+[1-9]\d*)"/g)].map(match => match[1]));
    let rowCount = 0;
    while (columns.every(column => references.has(`${column}${startRow + rowCount}`))) rowCount += 1;
    if (rows.length > rowCount) {
        throw new Error(`O modelo comporta até ${rowCount} ${label}, mas o relatório possui ${rows.length}.`);
    }
    for (let index = 0; index < rowCount; index += 1) {
        columns.forEach((column, columnIndex) => cells.set(`${column}${startRow + index}`,
            rows[index]?.[columnIndex] ?? EMPTY_SPREADSHEET_VALUE));
    }
}

export { createReportSpreadsheetFileName, fillSpreadsheetTable, spreadsheetDuration, spreadsheetQuantity, spreadsheetRate, spreadsheetText };
