import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import {
    getExpeditionState,
    getExpeditionSummary,
    replaceExpeditionRoutes,
    resetExpeditionReport,
    restoreExpeditionState,
    subscribeExpeditionState,
    updateExpeditionManualQuantity,
} from "../js/reports/expedition/state.js";
import { getReceiptState } from "../js/reports/receipt/state.js";
import { getDamageAndLossesState } from "../js/reports/damage-and-losses/state.js";
import { getLossesState } from "../js/reports/damage-and-losses/losses-state.js";
import { createOverallAnalysisData } from "../js/reports/overall-analysis/model.js";
import { readExpeditionFile } from "../js/reports/expedition/import.js";

const routes = [{
    code: "AT20261001TEST",
    status: "Validated",
    scannedOrders: 6689,
    initialOrders: 6689,
    validationOperator: "Conferente",
}];

function getAnalysis() {
    return createOverallAnalysisData(
        getReceiptState(),
        getExpeditionState(),
        null,
        { plannedVolume: 8000 },
        getDamageAndLossesState(),
        getLossesState(),
    );
}

beforeEach(() => resetExpeditionReport());

test("retirados inicia em zero e não cria expedição sem dados", () => {
    assert.equal(getExpeditionState().withdrawnOrders, 0);
    assert.equal(getAnalysis().flow.expedited, null);
});

test("retirados desconta apenas Expedido e atualiza o gap e o backlog", () => {
    replaceExpeditionRoutes(routes);
    assert.equal(getAnalysis().flow.expedited, 6689);
    updateExpeditionManualQuantity("withdrawnOrders", 100);

    const summary = getExpeditionSummary();
    const analysis = getAnalysis();
    assert.equal(summary.withdrawnOrders, 100);
    assert.equal(summary.volumeChecked, 6689);
    assert.equal(analysis.expedition.volumeChecked, 6689);
    assert.equal(analysis.flow.expedited, 6589);
    assert.equal(analysis.flow.gap, 1411);
    assert.equal(analysis.flow.floor, 1411);
});

test("valores vazios ou zero não descontam e valores inválidos são rejeitados", () => {
    replaceExpeditionRoutes(routes);
    updateExpeditionManualQuantity("withdrawnOrders", 50);
    assert.equal(updateExpeditionManualQuantity("withdrawnOrders", -1), false);
    assert.equal(updateExpeditionManualQuantity("withdrawnOrders", 1.5), false);
    assert.equal(updateExpeditionManualQuantity("withdrawnOrders", "abc"), false);
    assert.equal(getExpeditionState().withdrawnOrders, 50);
    updateExpeditionManualQuantity("withdrawnOrders", "");
    assert.equal(getExpeditionSummary().withdrawnOrders, 0);
    assert.equal(getAnalysis().flow.expedited, 6689);
    updateExpeditionManualQuantity("withdrawnOrders", 0);
    assert.equal(getAnalysis().flow.expedited, 6689);
});

test("Expedido não fica negativo quando retirados supera o volume conferido", () => {
    replaceExpeditionRoutes(routes);
    updateExpeditionManualQuantity("withdrawnOrders", 7000);
    assert.equal(getAnalysis().flow.expedited, 0);
    assert.equal(getAnalysis().flow.gap, 8000);
});

test("a sessão salva e restaura retirados e aceita sessões antigas sem o campo", () => {
    replaceExpeditionRoutes(routes);
    updateExpeditionManualQuantity("withdrawnOrders", 100);
    const savedState = JSON.parse(JSON.stringify(getExpeditionState()));

    resetExpeditionReport();
    assert.equal(restoreExpeditionState(savedState), true);
    assert.equal(getExpeditionState().withdrawnOrders, 100);
    assert.equal(getAnalysis().flow.expedited, 6589);

    delete savedState.withdrawnOrders;
    assert.equal(restoreExpeditionState(savedState), true);
    assert.equal(getExpeditionState().withdrawnOrders, 0);
    assert.equal(getAnalysis().flow.expedited, 6689);
});

test("limpar e importar outro arquivo reinicializa retirados", () => {
    replaceExpeditionRoutes(routes);
    updateExpeditionManualQuantity("withdrawnOrders", 100);
    replaceExpeditionRoutes(routes, "outro-arquivo.csv");
    assert.equal(getExpeditionState().withdrawnOrders, 0);

    updateExpeditionManualQuantity("withdrawnOrders", 100);
    resetExpeditionReport();
    assert.equal(getExpeditionState().withdrawnOrders, 0);
    assert.equal(getAnalysis().flow.expedited, null);
});

test("editar retirados notifica os painéis inscritos", () => {
    const events = [];
    const unsubscribe = subscribeExpeditionState((state, event) => events.push({ state, event }));
    updateExpeditionManualQuantity("withdrawnOrders", 100);
    unsubscribe();
    assert.equal(events.length, 1);
    assert.equal(events[0].state.withdrawnOrders, 100);
});

test("o HTML apresenta os quatro controles e Retirados à direita de Exceção", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const css = readFileSync(new URL("../css/reports-style.css", import.meta.url), "utf8");
    const controls = html.match(/<div class="input-group">\s*(<div>\s*<h4>No Piso<\/h4>[\s\S]*?)<div class="input-group" id="expeditionOperatorControls">/)[1];
    assert.deepEqual(Array.from(controls.matchAll(/<h4>(.*?)<\/h4>/g), match => match[1]), ["No Piso", "Exceção", "Duplicados", "Retirados"]);
    assert.equal(Array.from(html.matchAll(/id="expeditionWithdrawnInput"/g)).length, 1);
    assert.equal(Array.from(html.matchAll(/id="expeditionPreviewWithdrawn"/g)).length, 1);
    assert.match(html, /<th>Pacotes Exceção<\/th>\s*<th>Pacotes Retirados<\/th>/);
    assert.match(html, /<td id="expeditionPreviewException">—<\/td>\s*<td id="expeditionPreviewWithdrawn">—<\/td>/);
    assert.match(css, /#expedition \.report-controls \.input-group\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit, minmax\(117px, 1fr\)\)/);
});

test("o CSV continua importando e retirados desconta o volume importado", async () => {
    const require = createRequire(import.meta.url);
    const previousWindow = globalThis.window;
    globalThis.window = { XLSX: require("../js/libraries/xlsx.full.min.js") };
    try {
        const csv = [
            "AT/TO,Corridor/Cage,Total Initial Orders Inside AT/TO,Total Final Orders Inside AT/TO,Total Scanned Orders,Missorted Orders,Missing Orders,Validation Start Time,Validation End Time,Validation Operator,Revalidation Operator,Revalidated Count,AT/TO Validation Status,Remark",
            "AT20261001TEST,A1,6689,6689,6689,0,0,2026-10-01 10:00:00,2026-10-01 11:00:00,Conferente,,0,Validated,",
        ].join("\n");
        const file = new File([csv], "expedition-test.csv", { type: "text/csv" });
        const imported = await readExpeditionFile(file);
        assert.equal(imported.routes.length, 1);
        replaceExpeditionRoutes(imported.routes, file.name);
        updateExpeditionManualQuantity("withdrawnOrders", 100);
        assert.equal(getExpeditionSummary().volumeChecked, 6689);
        assert.equal(getAnalysis().flow.expedited, 6589);
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
    }
});
