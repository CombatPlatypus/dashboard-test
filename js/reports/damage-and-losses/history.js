function normalizeHistoryText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeOccurrenceHistory(records) {
    if (!Array.isArray(records)) {
        return [];
    }

    return records.flatMap(record => {
        const date = normalizeHistoryText(record?.date);
        const packageCode = normalizeHistoryText(record?.packageCode);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !packageCode) {
            return [];
        }
        const parsed = new Date(`${date}T12:00:00`);
        const [year, month, day] = date.split("-").map(Number);
        if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month ||
            parsed.getDate() !== day) {
            return [];
        }
        return [{ date, packageCode, situation: normalizeHistoryText(record.situation) }];
    }).sort((first, second) => second.date.localeCompare(first.date));
}

function formatOccurrenceDate(date) {
    return date.split("-").reverse().join("/");
}

function getMonthlyOccurrenceHistory(records, referenceDate = new Date()) {
    const history = normalizeOccurrenceHistory(records);
    const period = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 12);
    for (let offset = 0; offset < 2; offset += 1) {
        const prefix = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}-`;
        const selected = history.filter(record => record.date.startsWith(prefix));
        if (selected.length > 0) return selected;
        period.setMonth(period.getMonth() - 1);
    }
    return [];
}

function createHistoryClipboardText(records) {
    return [
        ["Data", "Código BR", "Situação"],
        ...records.map(record => [
            formatOccurrenceDate(record.date), record.packageCode, record.situation,
        ]),
    ].map(row => row.join("\t")).join("\n");
}

export { createHistoryClipboardText, formatOccurrenceDate, getMonthlyOccurrenceHistory, normalizeOccurrenceHistory };
