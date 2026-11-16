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

function buildEmployeeExpeditionRanking(currentRanking, importedRanking = []) {
    const collaborators = new Map();

    for (const entry of [...currentRanking, ...importedRanking]) {
        const operator = normalizeEmployeeRankingName(entry.operator);
        if (!operator) {
            continue;
        }

        const key = operator.toLocaleLowerCase("pt-BR");
        if (!collaborators.has(key)) {
            collaborators.set(key, {
                operator,
                routesChecked: 0,
                totalDurationSeconds: 0,
                routesWithDuration: 0,
            });
        }

        const collaborator = collaborators.get(key);
        collaborator.routesChecked += entry.routesChecked;
        collaborator.totalDurationSeconds += entry.totalDurationSeconds;
        collaborator.routesWithDuration += entry.routesWithDuration;
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

export {
    buildEmployeeExpeditionRanking,
    formatEmployeeRankingDuration,
    normalizeEmployeeRankingName,
};
