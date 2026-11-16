let history = [];
const historyListeners = new Set();

function getEmployeeRankingHistory() {
    return history;
}

function replaceEmployeeRankingHistory(rows) {
    const unchanged = rows.length === history.length && rows.every((row, index) => {
        const previous = history[index];
        return row.operator === previous.operator &&
            row.routesChecked === previous.routesChecked &&
            row.totalDurationSeconds === previous.totalDurationSeconds &&
            row.routesWithDuration === previous.routesWithDuration;
    });
    if (unchanged) return;

    history = rows;
    historyListeners.forEach(listener => listener());
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
