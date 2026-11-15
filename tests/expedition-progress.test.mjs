import assert from "node:assert/strict";
import { test } from "node:test";

import {
    getExpeditionState,
    getExpeditionSummary,
    replaceExpeditionRoutes,
    resetExpeditionReport,
    restoreExpeditionState,
    updateExpeditionOperatorSelection,
} from "../js/reports/expedition/state.js";

test("progresso usa o status de todas as rotas sem depender dos conferentes selecionados", t => {
    t.after(resetExpeditionReport);
    replaceExpeditionRoutes([
        { code: "AT1", status: "Validated", validationOperator: "Ana" },
        { code: "AT2", status: " validado ", validationOperator: "Bruno" },
        { code: "AT3", status: "Not Validated", validationOperator: "Ana" },
        { code: "AT4", status: "In Validation", validationOperator: "Bruno" },
    ]);
    updateExpeditionOperatorSelection("Ana", false);

    function checkProgress() {
        const { totalRoutes, completedRoutes, pendingRoutes, validatedRoutes } = getExpeditionSummary();
        assert.equal(totalRoutes, 4);
        assert.equal(completedRoutes, 2);
        assert.equal(pendingRoutes, 2);
        assert.equal(validatedRoutes, 1);
    }

    checkProgress();
    const savedState = getExpeditionState();
    resetExpeditionReport();
    const { hasData, completedRoutes, pendingRoutes } = getExpeditionSummary();
    assert.equal(hasData, false);
    assert.equal(completedRoutes, 0);
    assert.equal(pendingRoutes, 0);
    restoreExpeditionState(savedState);
    checkProgress();
});
