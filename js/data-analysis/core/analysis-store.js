const ANALYSIS_SESSION_STORAGE_KEY = "dashboard-analysis-session-v1";

function validateDataset(dataset) {
    return Boolean(
        dataset &&
        typeof dataset === "object" &&
        Array.isArray(dataset.headers) &&
        Array.isArray(dataset.rows) &&
        Array.isArray(dataset.columnProfiles),
    );
}

function createAnalysisStore() {
    let dataset = null;

    const listeners =
        new Set();

    function getSnapshot() {
        return Object.freeze({
            dataset,
            hasData:
                dataset !== null,
        });
    }

    function notify(change) {
        const snapshot =
            getSnapshot();

        listeners.forEach(
            function (listener) {
                listener(
                    snapshot,
                    change,
                );
            },
        );
    }

    function setDataset(nextDataset) {
        if (!validateDataset(nextDataset)) {
            throw new TypeError(
                "A base de dados importada é inválida.",
            );
        }

        dataset = nextDataset;

        notify({
            type: "dataset-loaded",
        });

        return dataset;
    }

    function clearDataset() {
        dataset = null;

        notify({
            type: "dataset-cleared",
        });
    }

    function subscribe(listener) {
        if (
            typeof listener !==
            "function"
        ) {
            return function () {};
        }

        listeners.add(listener);

        listener(
            getSnapshot(),
            {
                type: "initial-state",
            },
        );

        return function () {
            listeners.delete(listener);
        };
    }

    return Object.freeze({
        clearDataset,
        getSnapshot,
        setDataset,
        subscribe,
    });
}

const analysisStore =
    createAnalysisStore();

function initializeAnalysisSession(store, notification, storage) {
    try {
        const saved = (storage ?? window.sessionStorage).getItem(ANALYSIS_SESSION_STORAGE_KEY);
        if (saved) {
            store.setDataset(JSON.parse(saved));
            notification.set("Base de análise recuperada da sessão desta aba.", "success");
        }
    } catch (error) {
        console.warn("Não foi possível recuperar a base de análise da sessão da aba.", error);
        notification.set("Não foi possível recuperar a base de análise desta aba.", "warning");
    }

    return store.subscribe(({ dataset }, { type }) => {
        if (type === "initial-state") return;

        try {
            const session = storage ?? window.sessionStorage;
            if (dataset) {
                session.setItem(ANALYSIS_SESSION_STORAGE_KEY, JSON.stringify(dataset));
            } else {
                session.removeItem(ANALYSIS_SESSION_STORAGE_KEY);
            }
        } catch (error) {
            console.warn("Não foi possível guardar a análise na sessão da aba.", error);
            queueMicrotask(() => notification.set("A base de análise atual não pôde ser guardada nesta aba.", "warning"));
        }
    });
}

export {
    analysisStore,
    createAnalysisStore,
    initializeAnalysisSession,
};
