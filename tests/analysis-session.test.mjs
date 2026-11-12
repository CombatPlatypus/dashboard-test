import assert from "node:assert/strict";
import { test } from "node:test";
import { createAnalysisStore, initializeAnalysisSession } from "../js/data-analysis/core/analysis-store.js";

test("a base de Análises volta na mesma sessão e desaparece ao descartar", () => {
    const items = new Map();
    const storage = {
        getItem: key => items.get(key) ?? null,
        setItem: (key, value) => items.set(key, value),
        removeItem: key => items.delete(key),
    };
    const notification = { set() {} };
    const dataset = {
        sourceFileName: "base.csv",
        sheetName: "Dados",
        columnCount: 1,
        headers: ["Código BR"],
        rows: [["BR1"]],
        columnProfiles: [{ kind: "text" }],
    };
    const store = createAnalysisStore();
    initializeAnalysisSession(store, notification, storage);
    store.setDataset(dataset);

    const reloaded = createAnalysisStore();
    initializeAnalysisSession(reloaded, notification, storage);
    assert.deepEqual(reloaded.getSnapshot().dataset, dataset);
    reloaded.clearDataset();
    assert.equal(items.size, 0);
});
