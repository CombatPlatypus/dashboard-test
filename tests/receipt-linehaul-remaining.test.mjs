import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, test } from "node:test";
import {
    getReceiptLinehaulState, getReceiptLinehaulSummary, replaceReceiptLinehauls,
    resetReceiptLinehaulState, restoreReceiptLinehaulState,
    updateReceiptLinehaulRecord, updateReceiptLinehaulSelection,
} from "../js/reports/receipt/linehaul-state.js";

const linehauls = [
    { code: "LH1", loadedOrders: 1000 },
    { code: "LH2", loadedOrders: 500 },
    { code: "LH3", loadedOrders: 250 },
];
const getId = code => getReceiptLinehaulState().linehauls.find(item => item.code === code).id;
const select = (code, selected = true) => updateReceiptLinehaulSelection(getId(code), selected);

beforeEach(() => resetReceiptLinehaulState());

test("restante é o volume esperado menos os LHs marcados como descarregados", () => {
    replaceReceiptLinehauls(linehauls);
    assert.equal(getReceiptLinehaulState().expectedVolume, 1750);
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 1750);
    assert.equal(getReceiptLinehaulSummary().allLinehaulsUnloaded, false);
    select("LH1");
    assert.equal(getReceiptLinehaulSummary().unloadedVolume, 1000);
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 750);
    assert.equal(getReceiptLinehaulSummary().allLinehaulsUnloaded, false);
    select("LH2");
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 250);
    select("LH1", false);
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 1250);
    select("LH1"); select("LH3");
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 0);
    assert.equal(getReceiptLinehaulSummary().allLinehaulsUnloaded, true);
    assert.equal(getReceiptLinehaulSummary().unloadedVolume, 1750);
    select("LH2", false);
    assert.equal(getReceiptLinehaulSummary().allLinehaulsUnloaded, false);
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 500);
    assert.equal(getReceiptLinehaulState().expectedVolume, 1750);
});

test("correções nas quantidades recalculam o volume restante", () => {
    replaceReceiptLinehauls(linehauls);
    select("LH1");
    assert.equal(updateReceiptLinehaulRecord(getId("LH2"), "loadedOrders", "2.185"), true);
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 2435);
    assert.equal(updateReceiptLinehaulRecord(getId("LH1"), "loadedOrders", "3000"), true);
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 2435);
    assert.equal(getReceiptLinehaulSummary().unloadedVolume, 3000);
});

test("reimportação e restauração derivam o restante dos dados atuais, sem salvar um total separado", () => {
    replaceReceiptLinehauls(linehauls); select("LH1");
    replaceReceiptLinehauls([{ code: "LH1", loadedOrders: 400 }, { code: "LH4", loadedOrders: 600 }]);
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 600);
    const savedState = JSON.parse(JSON.stringify(getReceiptLinehaulState()));
    resetReceiptLinehaulState();
    assert.equal(restoreReceiptLinehaulState(savedState), true);
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 600);
    assert.equal(restoreReceiptLinehaulState({ linehauls: [{ code: "LH1", loadedOrders: 100, selected: true }] }), true);
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 0);
});

test("sem dados ou quantidade conhecida, não apresenta um zero inventado", () => {
    assert.equal(getReceiptLinehaulSummary().remainingVolume, null);
    assert.equal(getReceiptLinehaulSummary().allLinehaulsUnloaded, false);
    replaceReceiptLinehauls([{ code: "LH1", loadedOrders: null }]); select("LH1");
    assert.equal(getReceiptLinehaulState().expectedVolume, null);
    assert.equal(getReceiptLinehaulSummary().remainingVolume, null);
    replaceReceiptLinehauls([{ code: "LH2", loadedOrders: 0 }]);
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 0);
    resetReceiptLinehaulState();
    assert.equal(getReceiptLinehaulSummary().remainingVolume, null);
});

test("restante nunca fica negativo e volumes esperados inválidos não são calculados", () => {
    const state = { expectedVolume: 500, linehauls: [{ code: "LH1", loadedOrders: 600, selected: true }] };
    assert.equal(getReceiptLinehaulSummary(state).remainingVolume, 0);
    for (const expectedVolume of [null, undefined, "500", NaN, -1, 1.5]) {
        assert.equal(getReceiptLinehaulSummary({ ...state, expectedVolume }).remainingVolume, null);
    }
});

test("só conclui após marcar todos os LHs, mesmo quando o volume restante já é zero", () => {
    replaceReceiptLinehauls([{ code: "LH1", loadedOrders: 100 }, { code: "LH2", loadedOrders: 0 }]);
    select("LH1");
    assert.equal(getReceiptLinehaulSummary().remainingVolume, 0);
    assert.equal(getReceiptLinehaulSummary().allLinehaulsUnloaded, false);
    select("LH2");
    assert.equal(getReceiptLinehaulSummary().allLinehaulsUnloaded, true);
    assert.equal(getReceiptLinehaulSummary().unloadedVolume, 100);
});

test("HTML acrescenta Volume Restante após Volume Esperado e a visualização usa o resumo", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const firstTable = html.match(/id="receiptLinehaulExportArea">[\s\S]*?<table>([\s\S]*?)<\/table>/)[1];
    assert.match(firstTable, /<th>Volume Esperado<\/th>\s*<th id="receiptLinehaulPreviewVolumeLabel">Volume Restante<\/th>\s*<th>Volume Descarregado<\/th>/);
    assert.match(firstTable, /id="receiptLinehaulPreviewExpected">—<\/td>\s*<td id="receiptLinehaulPreviewRemainingVolume">—<\/td>/);
    assert.equal([...html.matchAll(/id="receiptLinehaulPreviewRemainingVolume"/g)].length, 1);
    const view = readFileSync(new URL("../js/reports/receipt/linehaul-view.js", import.meta.url), "utf8");
    assert.match(view, /previewRemainingVolume:\s*getReceiptLinehaulElement\(\s*rootElement,\s*"receiptLinehaulPreviewRemainingVolume"/);
    assert.match(view, /elements\.previewRemainingVolume\s*\.textContent\s*=\s*hasData\s*\? formatReceiptLinehaulQuantity\(\s*summary\.allLinehaulsUnloaded\s*\? summary\.unloadedVolume\s*:\s*summary\.remainingVolume,/);
    assert.match(view, /previewVolumeLabel:\s*getReceiptLinehaulElement\(\s*rootElement,\s*"receiptLinehaulPreviewVolumeLabel"/);
    assert.match(view, /elements\.previewVolumeLabel\.textContent\s*=\s*summary\.allLinehaulsUnloaded\s*\? "Volume Descarregado"\s*:\s*"Volume Restante"/);
});
