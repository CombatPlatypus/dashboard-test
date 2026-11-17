import { formatReportPersonFirstName } from "../core/person-name.js";

const NAME_PREPOSITIONS = new Set(["da", "das", "de", "do", "dos"]);
const OPS_PREFIX = /^\[\s*(ops\d+)\s*\]\s*/i;

function readEmployeeOpsCode(value) {
    const text = String(value ?? "").trim();
    return (OPS_PREFIX.exec(text)?.[1] ?? /^ops\d+$/i.exec(text)?.[0] ?? "").toLowerCase();
}

function normalizeEmployeeRankingName(value) {
    return String(value ?? "")
        .normalize("NFC")
        .trim()
        .replace(OPS_PREFIX, "")
        .replace(/\s+/g, " ");
}

function formatEmployeeRankingName(name) {
    const [firstName, ...surnameParts] = name.split(" ");
    const secondName = surnameParts.find(part => !NAME_PREPOSITIONS.has(part.toLocaleLowerCase("pt-BR")));

    return [firstName, secondName]
        .filter(Boolean)
        .map(part => formatReportPersonFirstName(part))
        .join(" ");
}

function createEmployeeRankingEntry(record, fromHistory = false) {
    const operator = normalizeEmployeeRankingName(record.operator);
    const opsCode = readEmployeeOpsCode(record.opsCode) || readEmployeeOpsCode(record.operator);
    const name = operator.toLocaleLowerCase("pt-BR");
    const abbreviation = formatEmployeeRankingName(operator).toLocaleLowerCase("pt-BR");
    const abbreviated = fromHistory && !opsCode && !record.fullNameConfirmed && name === abbreviation;
    return { record, operator, opsCode, name, abbreviation, abbreviated, fromHistory };
}

function resolveEmployeeRankingEntries(current, imported, knownOperators) {
    const validName = ({ operator }) => operator && !/^[-–—]$/.test(operator);
    const entries = [
        ...current.map(record => createEmployeeRankingEntry(record)),
        ...imported.map(record => createEmployeeRankingEntry(record, true)),
    ].filter(validName);
    const known = [...entries, ...knownOperators.map(record => createEmployeeRankingEntry(record)).filter(validName)];
    const codesByName = new Map();
    for (const { name, opsCode } of known) {
        if (!opsCode) continue;
        const codes = codesByName.get(name) ?? new Set();
        codes.add(opsCode);
        codesByName.set(name, codes);
    }

    const employeesByAbbreviation = new Map();
    const historyCounts = new Map();
    for (const entry of known) {
        const { name, abbreviation, fromHistory, abbreviated } = entry;
        if (fromHistory) historyCounts.set(abbreviation, (historyCounts.get(abbreviation) ?? 0) + 1);
        if (abbreviated) continue;

        const codes = codesByName.get(name);
        if (!entry.opsCode && codes?.size === 1) entry.opsCode = codes.values().next().value;

        // Uncoded names still help detect ambiguity in a copied abbreviation.
        const key = entry.opsCode || "name:" + name;
        const employees = employeesByAbbreviation.get(abbreviation) ?? new Map();
        if (!employees.has(key)) employees.set(key, entry);
        employeesByAbbreviation.set(abbreviation, employees);
    }

    for (const entry of entries) {
        if (!entry.abbreviated) continue;

        const employees = employeesByAbbreviation.get(entry.abbreviation);
        if (historyCounts.get(entry.abbreviation) === 1 && employees?.size === 1) {
            const { operator, opsCode } = employees.values().next().value;
            if (opsCode) Object.assign(entry, { operator, opsCode });
        }
    }
    return entries;
}

function hasQuantity(value) {
    return Number.isSafeInteger(value) && value >= 0;
}

function sortEmployeeQuantities(entries, descending = false) {
    const direction = descending ? -1 : 1;
    return Array.from(entries, entry => ({
        ...entry,
        displayName: formatEmployeeRankingName(entry.operator),
    })).sort((first, second) => (
        direction * (first.quantity - second.quantity) ||
        first.displayName.localeCompare(second.displayName, "pt-BR") ||
        first.operator.localeCompare(second.operator, "pt-BR")
    ));
}

function buildOperationalRanking(current, imported = [], { descending = false, knownOperators = [] } = {}) {
    const collaborators = new Map();
    const pending = [];
    for (const { record, operator, opsCode } of resolveEmployeeRankingEntries(current, imported, knownOperators)) {
        if (!hasQuantity(record.quantity)) continue;
        if (!opsCode) {
            pending.push({ operator, quantity: record.quantity });
            continue;
        }

        const collaborator = collaborators.get(opsCode) ?? { operator, opsCode, quantity: 0 };
        collaborator.quantity += record.quantity;
        collaborators.set(opsCode, collaborator);
    }
    return { ranking: sortEmployeeQuantities(collaborators.values(), descending), pending };
}

function buildEmployeeOccurrenceRanking(operators) {
    const collaborators = new Map();
    for (const { operator: rawName, quantity } of operators) {
        const operator = normalizeEmployeeRankingName(rawName);
        if (!operator || /^[-–—]$/.test(operator) || !hasQuantity(quantity)) continue;

        const key = operator.toLocaleLowerCase("pt-BR");
        const collaborator = collaborators.get(key) ?? { operator, quantity: 0 };
        collaborator.quantity += quantity;
        collaborators.set(key, collaborator);
    }
    return sortEmployeeQuantities(collaborators.values());
}

function buildEmployeeExpeditionRanking(currentRanking, importedRanking = [], operatorDirectory = []) {
    const routesToQuantity = ({ operator, opsCode, fullNameConfirmed, routesChecked }) => ({
        operator, opsCode, fullNameConfirmed, quantity: routesChecked,
    });
    return buildOperationalRanking(currentRanking.map(routesToQuantity), importedRanking.map(routesToQuantity), {
        descending: true, knownOperators: operatorDirectory,
    });
}

function buildEmployeeReceiptRanking(operators, imported, operatorDirectory) {
    const current = operators.map(({ receiver, packagesReceived }) => ({
        operator: receiver,
        quantity: packagesReceived,
    }));
    return buildOperationalRanking(current, imported, { descending: true, knownOperators: operatorDirectory });
}

function buildEmployeeLabelingErrorRanking(operators, imported, operatorDirectory = []) {
    const current = operators.map(({ receiver, labeler, errorQuantity }) => {
        const labelerName = normalizeEmployeeRankingName(labeler);
        return {
            operator: labelerName && !/^[-–—]$/.test(labelerName) ? labeler : receiver,
            quantity: errorQuantity,
        };
    });
    const knownOperators = [...operators.map(({ receiver }) => ({ operator: receiver })), ...operatorDirectory];
    return buildOperationalRanking(current, imported, { knownOperators });
}

export {
    buildEmployeeExpeditionRanking,
    buildEmployeeLabelingErrorRanking,
    buildEmployeeOccurrenceRanking,
    buildEmployeeReceiptRanking,
    formatEmployeeRankingName,
    normalizeEmployeeRankingName,
    readEmployeeOpsCode,
};
