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

function formatEmployeeRankingDuration(seconds) {
    if (!Number.isFinite(seconds)) {
        return "—";
    }

    const totalSeconds = Math.round(seconds);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const remainingSeconds = String(totalSeconds % 60).padStart(2, "0");

    return `${minutes}:${remainingSeconds}`;
}

function createEmployeeRankingEntry(record, fromHistory = false) {
    const operator = normalizeEmployeeRankingName(record.operator);
    const opsCode = readEmployeeOpsCode(record.opsCode) || readEmployeeOpsCode(record.operator);
    const name = operator.toLocaleLowerCase("pt-BR");
    const abbreviation = formatEmployeeRankingName(operator).toLocaleLowerCase("pt-BR");
    const abbreviated = fromHistory && !opsCode && !record.fullNameConfirmed && name === abbreviation;
    return { record, operator, opsCode, name, abbreviation, abbreviated, fromHistory };
}

function matchEmployeeRankingEntries(current, imported, knownOperators = []) {
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
        if (!entry.opsCode && codes?.size > 1) {
            entry.key = Symbol(name);
            entry.nameStatus = "ambiguous";
            continue;
        }
        entry.opsCode ||= codes?.values().next().value || "";
        entry.key = entry.opsCode || "name:" + name;

        const employees = employeesByAbbreviation.get(abbreviation) ?? new Map();
        if (!employees.has(entry.key)) employees.set(entry.key, entry);
        employeesByAbbreviation.set(abbreviation, employees);
    }

    for (const entry of entries) {
        if (!entry.abbreviated) continue;

        const employees = employeesByAbbreviation.get(entry.abbreviation);
        if (historyCounts.get(entry.abbreviation) > 1 || employees?.size > 1) {
            entry.key = Symbol(entry.abbreviation);
            entry.nameStatus = "ambiguous";
        } else if (employees?.size === 1) {
            const { key, operator, opsCode } = employees.values().next().value;
            Object.assign(entry, { key, operator, opsCode });
        } else {
            entry.key = "name:" + entry.name;
            entry.nameStatus = "abbreviated";
        }
    }
    return entries;
}

function buildEmployeeExpeditionRanking(currentRanking, importedRanking = [], operatorDirectory = []) {
    const collaborators = new Map();

    for (const { record, operator, key, opsCode, nameStatus } of matchEmployeeRankingEntries(currentRanking, importedRanking, operatorDirectory)) {
        if (!collaborators.has(key)) {
            collaborators.set(key, {
                operator,
                ...(opsCode && { opsCode }),
                ...(nameStatus && { nameStatus }),
                routesChecked: 0,
                totalDurationSeconds: 0,
                routesWithDuration: 0,
            });
        }

        const collaborator = collaborators.get(key);
        collaborator.routesChecked += record.routesChecked;
        collaborator.totalDurationSeconds += record.totalDurationSeconds;
        collaborator.routesWithDuration += record.routesWithDuration;
    }

    return Array.from(collaborators.values(), collaborator => ({
        ...collaborator,
        displayName: formatEmployeeRankingName(collaborator.operator),
        averageDurationSeconds: collaborator.routesWithDuration > 0
            ? collaborator.totalDurationSeconds / collaborator.routesWithDuration
            : null,
    })).sort((first, second) => (
        second.routesChecked - first.routesChecked ||
        (first.averageDurationSeconds ?? Infinity) - (second.averageDurationSeconds ?? Infinity) ||
        first.operator.localeCompare(second.operator, "pt-BR")
    ));
}

function buildEmployeeOccurrenceRanking(current, imported = [], { descending = false, knownOperators = [] } = {}) {
    const collaborators = new Map();
    for (const { record, operator, key, opsCode, nameStatus } of matchEmployeeRankingEntries(current, imported, knownOperators)) {
        if (!Number.isSafeInteger(record.quantity) || record.quantity < 0) continue;

        const collaborator = collaborators.get(key) ?? {
            operator, quantity: 0, ...(opsCode && { opsCode }), ...(nameStatus && { nameStatus }),
        };
        collaborator.quantity += record.quantity;
        collaborators.set(key, collaborator);
    }

    const direction = descending ? -1 : 1;
    return Array.from(collaborators.values(), entry => ({
        ...entry,
        displayName: formatEmployeeRankingName(entry.operator),
    })).sort((first, second) => (
        direction * (first.quantity - second.quantity) ||
        first.displayName.localeCompare(second.displayName, "pt-BR") ||
        first.operator.localeCompare(second.operator, "pt-BR")
    ));
}

function buildEmployeeReceiptRanking(operators, imported, operatorDirectory) {
    const current = operators.map(({ receiver, packagesReceived }) => ({
        operator: receiver,
        quantity: packagesReceived,
    }));
    return buildEmployeeOccurrenceRanking(current, imported, { descending: true, knownOperators: operatorDirectory });
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
    return buildEmployeeOccurrenceRanking(current, imported, { knownOperators });
}

export {
    buildEmployeeExpeditionRanking,
    buildEmployeeLabelingErrorRanking,
    buildEmployeeOccurrenceRanking,
    buildEmployeeReceiptRanking,
    formatEmployeeRankingDuration,
    formatEmployeeRankingName,
    normalizeEmployeeRankingName,
    readEmployeeOpsCode,
};
