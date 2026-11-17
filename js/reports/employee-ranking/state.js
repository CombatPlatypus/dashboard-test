const fieldsBySection = {
    receipt: ["operator", "opsCode", "fullNameConfirmed", "quantity"],
    labelingErrors: ["operator", "opsCode", "fullNameConfirmed", "quantity"],
    expedition: ["operator", "opsCode", "fullNameConfirmed", "routesChecked", "totalDurationSeconds", "routesWithDuration"],
    operatorDirectory: ["operator", "opsCode"],
};
let history = { receipt: [], labelingErrors: [], expedition: [], operatorDirectory: [] };
const historyListeners = new Set();

function getEmployeeRankingHistory() {
    return history;
}

function replaceEmployeeRankingHistory(nextHistory) {
    const changes = {};
    for (const [section, fields] of Object.entries(fieldsBySection)) {
        const rows = nextHistory[section] ?? [];
        const previous = history[section];
        if (rows.length === previous.length && rows.every((row, index) =>
            fields.every(field => row[field] === previous[index][field]))) continue;

        changes[section] = rows;
    }
    if (Object.keys(changes).length === 0) return;

    history = { ...history, ...changes };
    const scope = Object.fromEntries(Object.keys(changes).map(section => [section, true]));
    historyListeners.forEach(listener => listener(history, scope));
}

function subscribeEmployeeRankingHistory(listener) {
    historyListeners.add(listener);
    return () => historyListeners.delete(listener);
}

export {
    getEmployeeRankingHistory,
    replaceEmployeeRankingHistory,
    subscribeEmployeeRankingHistory,
};
