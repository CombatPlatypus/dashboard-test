import { formatReportPersonFirstName } from "../core/person-name.js";

const NAME_PREPOSITIONS = new Set(["da", "das", "de", "do", "dos"]);
const OPS_PREFIX = /^\[\s*(ops\d+)\s*\]\s*/i;
const SHOPEE_ACCOUNT_EMAIL = /^[^\s@]+@shopee\.com$/i;

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

function formatRankedEmployeeName(name, position) {
    return name ? `${position}º ${name}` : "";
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

function buildOperationalRanking(current, imported = [], { descending = false } = {}) {
    const collaborators = new Map();
    const pending = [];
    for (const { operator: source, opsCode: code, quantity } of [...current, ...imported]) {
        if (!hasQuantity(quantity)) continue;
        const name = normalizeEmployeeRankingName(source);
        if (SHOPEE_ACCOUNT_EMAIL.test(name)) continue;

        const opsCode = readEmployeeOpsCode(code) || readEmployeeOpsCode(source);
        const operator = name && !/^[-–—]$/.test(name) ? name : opsCode;
        if (!operator) continue;
        if (!opsCode) {
            pending.push({ operator, quantity });
            continue;
        }

        const collaborator = collaborators.get(opsCode) ?? { operator, opsCode, quantity: 0 };
        collaborator.quantity += quantity;
        collaborators.set(opsCode, collaborator);
    }
    return { ranking: sortEmployeeQuantities(collaborators.values(), descending), pending };
}

function buildEmployeeOccurrenceRanking(operators) {
    const collaborators = new Map();
    for (const { operator: rawName, quantity } of operators) {
        const operator = normalizeEmployeeRankingName(rawName);
        if (!operator || /^[-–—]$/.test(operator) || SHOPEE_ACCOUNT_EMAIL.test(operator) || !hasQuantity(quantity)) continue;

        const key = operator.toLocaleLowerCase("pt-BR");
        const collaborator = collaborators.get(key) ?? { operator, quantity: 0 };
        collaborator.quantity += quantity;
        collaborators.set(key, collaborator);
    }
    return sortEmployeeQuantities(collaborators.values());
}

function buildEmployeeExpeditionRanking(currentRanking, importedRanking = []) {
    const routesToQuantity = ({ operator, opsCode, routesChecked }) => ({ operator, opsCode, quantity: routesChecked });
    return buildOperationalRanking(currentRanking.map(routesToQuantity), importedRanking.map(routesToQuantity), { descending: true });
}

function buildEmployeeReceiptRanking(operators, imported) {
    const current = operators.map(({ receiver, packagesReceived }) => ({
        operator: receiver,
        quantity: packagesReceived,
    }));
    return buildOperationalRanking(current, imported, { descending: true });
}

function buildEmployeeLabelingErrorRanking(operators, imported) {
    const current = operators.map(({ receiver, labeler, errorQuantity }) => ({
        operator: readEmployeeOpsCode(labeler) ? labeler : receiver,
        quantity: errorQuantity,
    }));
    return buildOperationalRanking(current, imported);
}

export {
    buildEmployeeExpeditionRanking,
    buildEmployeeLabelingErrorRanking,
    buildEmployeeOccurrenceRanking,
    buildEmployeeReceiptRanking,
    formatRankedEmployeeName,
    normalizeEmployeeRankingName,
    readEmployeeOpsCode,
};
