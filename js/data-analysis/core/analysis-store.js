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

export {
    analysisStore,
    createAnalysisStore,
};
