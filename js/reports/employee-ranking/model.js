import { formatReportPersonFirstName } from "../core/person-name.js";

const NAME_PREPOSITIONS = new Set(["da", "das", "de", "do", "dos"]);

function normalizeEmployeeRankingName(value) {
    return String(value ?? "")
        .normalize("NFC")
        .trim()
        .replace(/^\[\s*ops\d+\s*\]\s*/i, "")
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

function matchEmployeeRankingEntries(current, imported) {
    const entries = [...current, ...imported].map((record, index) => {
        const operator = normalizeEmployeeRankingName(record.operator);
        return { record, operator, key: operator.toLocaleLowerCase("pt-BR"), fromHistory: index >= current.length };
    }).filter(({ operator }) => operator && !/^[-–—]$/.test(operator));
    if (imported.length === 0) return entries;

    const namesByAbbreviation = new Map();
    const historyCounts = new Map();
    for (const entry of entries) {
        const { operator, key, fromHistory, record } = entry;
        const abbreviation = formatEmployeeRankingName(operator).toLocaleLowerCase("pt-BR");
        if (fromHistory) {
            historyCounts.set(abbreviation, (historyCounts.get(abbreviation) ?? 0) + 1);
            if (!record.fullNameConfirmed && key === abbreviation) {
                entry.abbreviation = abbreviation;
                continue;
            }
        }

        const names = namesByAbbreviation.get(abbreviation) ?? new Map();
        if (!names.has(key)) names.set(key, operator);
        namesByAbbreviation.set(abbreviation, names);
    }

    for (const entry of entries) {
        if (!entry.abbreviation) continue;

        const names = namesByAbbreviation.get(entry.abbreviation);
        if (historyCounts.get(entry.abbreviation) > 1 || names?.size > 1) {
            // Keep each unverified line when the abbreviation can stand for different people.
            entry.key = Symbol(entry.abbreviation);
            entry.nameStatus = "ambiguous";
        } else if (names?.size === 1) {
            [entry.key, entry.operator] = names.entries().next().value;
        } else {
            entry.nameStatus = "abbreviated";
        }
    }
    return entries;
}

function buildEmployeeExpeditionRanking(currentRanking, importedRanking = []) {
    const collaborators = new Map();

    for (const { record, operator, key, nameStatus } of matchEmployeeRankingEntries(currentRanking, importedRanking)) {
        if (!collaborators.has(key)) {
            collaborators.set(key, {
                operator,
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

function buildEmployeeOccurrenceRanking(current, imported = [], { descending = false } = {}) {
    const collaborators = new Map();
    for (const { record, operator, key, nameStatus } of matchEmployeeRankingEntries(current, imported)) {
        if (!Number.isSafeInteger(record.quantity) || record.quantity < 0) continue;

        const collaborator = collaborators.get(key) ?? { operator, quantity: 0, ...(nameStatus && { nameStatus }) };
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

function buildEmployeeReceiptRanking(operators, imported) {
    const current = operators.map(({ receiver, packagesReceived }) => ({
        operator: receiver,
        quantity: packagesReceived,
    }));
    return buildEmployeeOccurrenceRanking(current, imported, { descending: true });
}

function buildEmployeeLabelingErrorRanking(operators, imported) {
    const current = operators.map(({ receiver, labeler, errorQuantity }) => {
        const labelerName = normalizeEmployeeRankingName(labeler);
        return {
            operator: labelerName && !/^[-–—]$/.test(labelerName) ? labelerName : receiver,
            quantity: errorQuantity,
        };
    });
    return buildEmployeeOccurrenceRanking(current, imported);
}

export {
    buildEmployeeExpeditionRanking,
    buildEmployeeLabelingErrorRanking,
    buildEmployeeOccurrenceRanking,
    buildEmployeeReceiptRanking,
    formatEmployeeRankingDuration,
    formatEmployeeRankingName,
    normalizeEmployeeRankingName,
};
