import { normalizeText, parseClipboardRows } from "../../filter/clipboard-source.js";

const opsHeaders = new Set(["id [ops]", "id ops"]);
const namePrepositions = new Set(["da", "das", "de", "do", "dos"]);

function getLabelerNameParts(name) {
    const words = normalizeText(name).match(/\p{L}+/gu) ?? [];
    return words.filter(word => !namePrepositions.has(word));
}

function getLabelerDirectoryRows(rows) {
    for (const [index, row] of rows.entries()) {
        const column = row.findIndex((cell, columnIndex) =>
            opsHeaders.has(normalizeText(cell)) && normalizeText(row[columnIndex + 1]) === "nome do colaborador");
        if (column !== -1) {
            return rows.slice(index + 1).map(values => [values[column], values[column + 1]]);
        }
    }
    return rows.filter(row => row.length === 2);
}

function parseReceiptLabelerDirectory(text) {
    const rows = getLabelerDirectoryRows(parseClipboardRows(text));
    const directory = [];
    for (const [code, name] of rows) {
        const parts = getLabelerNameParts(name);
        if (parts.length < 2) continue;

        const match = /^(?:(?:ops)?(\d+)|\[\s*ops(\d+)\s*\])$/.exec(normalizeText(code));
        directory.push({ ops: match?.[1] ?? match?.[2] ?? "", parts });
    }
    return directory;
}

function matchesLabelerName(parts, search) {
    if (parts[0] !== search[0]) return false;

    let index = 0;
    return search.slice(1).every(word => {
        index = parts.indexOf(word, index + 1);
        return index !== -1;
    });
}

function findReceiptLabelerOps(name, directory) {
    const search = getLabelerNameParts(name);
    if (search.length < 2) return "";

    const matches = directory.filter(({ parts }) => matchesLabelerName(parts, search));
    const fullMatches = matches.filter(({ parts }) => parts.length === search.length);
    const codes = new Set((fullMatches.length ? fullMatches : matches).map(({ ops }) => ops));
    return codes.size === 1 ? codes.values().next().value : "";
}

export { findReceiptLabelerOps, parseReceiptLabelerDirectory };
