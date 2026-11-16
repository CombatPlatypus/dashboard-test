let pendingUpdates = null;

function requestReportUpdate(render, changes = {}) {
    if (!pendingUpdates) {
        return render(changes);
    }

    pendingUpdates.set(render, { ...pendingUpdates.get(render), ...changes });
    return true;
}

// Aplica primeiro as mudanças de estado e depois atualiza cada prévia uma vez.
// Mantém a atualização síncrona para que a restauração possa reverter uma falha.
function batchReportUpdates(apply) {
    if (pendingUpdates) {
        return apply();
    }

    const updates = new Map();
    pendingUpdates = updates;
    let result;
    try {
        result = apply();
    } finally {
        pendingUpdates = null;
    }

    for (const [render, changes] of updates) {
        render(changes);
    }
    return result;
}

export { batchReportUpdates, requestReportUpdate };
