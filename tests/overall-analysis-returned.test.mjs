import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getReceiptState } from "../js/reports/receipt/state.js";
import { getExpeditionState } from "../js/reports/expedition/state.js";
import { getDamageAndLossesState } from "../js/reports/damage-and-losses/state.js";
import {
    getLossesState, getLossesSummary, replaceLossesData, resetLossesState, subscribeLossesState,
} from "../js/reports/damage-and-losses/losses-state.js";
import { createOverallAnalysisData } from "../js/reports/overall-analysis/model.js";
import { initializeOverallAnalysisView, renderOverallAnalysisView } from "../js/reports/overall-analysis/view.js";
import { initializeOverallAnalysisCharts, renderOverallAnalysisCharts } from "../js/reports/overall-analysis/charts.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const tableHtml = html.match(/<table id="overallAnalysisDamageAndLossesTable">([\s\S]*?)<\/table>/)[1];
const periodKeys = ["today", "yesterday", "dayBeforeYesterday", "days3to7", "days8to14", "days15toMonthStart", "totalMonth"];
const sample = {
    monthIndex: 9, year: 2026,
    days: [[31, 2], [30, 3], [29, 5], [28, 7], [24, 11], [23, 13], [17, 17], [16, 19], [1, 23]]
        .map(([day, returnedPackages]) => ({
            date: `2026-10-${String(day).padStart(2, "0")}`, returnedPackages,
            underReview: day === 31 ? 88 : 0, confirmedLosses: day === 30 ? 12 : 0,
        })),
};

function getData(lossesState = getLossesState()) {
    return createOverallAnalysisData(getReceiptState(), getExpeditionState(), null, {},
        getDamageAndLossesState(), lossesState);
}

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

function createElements(t) {
    class Element {
        constructor() { this.textContent = ""; this.dataset = {}; this.classList = { contains: () => false }; }
        setAttribute(name, value) { this[name] = value; }
    }
    class Canvas extends Element {}
    replaceGlobal(t, "HTMLElement", Element);
    replaceGlobal(t, "HTMLCanvasElement", Canvas);
    replaceGlobal(t, "MutationObserver", class { observe() {} disconnect() {} });
    const charts = [];
    replaceGlobal(t, "window", {
        setTimeout: () => 1, clearTimeout() {}, addEventListener() {},
        Chart: class {
            constructor(canvas, config) { Object.assign(this, config); this.canvas = canvas; charts.push(this); }
            update() {} resize() {}
        },
    });
    const elements = new Map([...html.matchAll(/id="(overallAnalysis[^"]+)"/g)]
        .map(([, id]) => [id, id.endsWith("Chart") ? new Canvas() : new Element()]));
    const rows = new Map([...tableHtml.matchAll(/data-overall-damage-losses-field="([^"]+)"/g)]
        .map(([, field]) => {
            const cells = periodKeys.map(() => new Element());
            return [field, { dataset: { overallDamageLossesField: field }, cells, querySelectorAll: () => cells }];
        }));
    elements.get("overallAnalysisDamageAndLossesTable").querySelectorAll = () => [...rows.values()];
    const root = new Element();
    root.querySelector = selector => elements.get(selector.slice(1));
    return { root, rows, charts };
}

test("HTML adiciona retornados abaixo de perdas confirmadas com sete períodos", () => {
    assert.deepEqual([...tableHtml.matchAll(/data-overall-damage-losses-field="([^"]+)"/g)].map(match => match[1]),
        ["hub", "soc", "underReview", "confirmedLosses", "returnedPackages"]);
    const returnedRow = tableHtml.match(/<tr data-overall-damage-losses-field="returnedPackages">([\s\S]*?)<\/tr>/)[1];
    assert.match(returnedRow, /<th scope="row">Pacotes Retornados<\/th>/);
    assert.equal([...returnedRow.matchAll(/<td>-<\/td>/g)].length, 7);
});

test("Análise Geral reutiliza os retornados de todos os períodos sem somá-los às perdas", () => {
    const analysis = getData(sample);
    const source = getLossesSummary(sample);
    assert.deepEqual(periodKeys.map(key => analysis.damageAndLosses.traditionalAnalysis[key].returnedPackages),
        [2, 3, 5, 18, 30, 42, 100]);
    for (const key of periodKeys) {
        assert.equal(analysis.damageAndLosses.traditionalAnalysis[key].returnedPackages,
            source.traditionalAnalysis[key].returnedPackages);
    }
    assert.equal(analysis.cards.packagesAnalysis.value, 88);
    assert.equal(analysis.cards.packagesAnalysis.total, 100);
    assert.equal(analysis.cards.packagesAnalysis.rate, .88);
});

test("retornados aparecem também sem perdas e ficam sem valor quando não há dados", () => {
    const returnedOnly = getData({ ...sample, days: [{ date: "2026-10-31", returnedPackages: 7 }] });
    assert.equal(returnedOnly.damageAndLosses.hasData, true);
    assert.equal(returnedOnly.damageAndLosses.traditionalAnalysis.today.returnedPackages, 7);
    assert.equal(returnedOnly.damageAndLosses.traditionalAnalysis.yesterday.returnedPackages, 0);
    assert.equal(returnedOnly.damageAndLosses.traditionalAnalysis.totalMonth.returnedPackages, 7);
    assert.equal(returnedOnly.cards.packagesAnalysis.value, null);
    const empty = getData({ ...sample, days: [] });
    for (const key of periodKeys) assert.equal(empty.damageAndLosses.traditionalAnalysis[key].returnedPackages, null);
});

test("linha acompanha importação, reimportação e limpeza com a formatação da tabela", t => {
    const { root, rows } = createElements(t);
    assert.equal(initializeOverallAnalysisView(root), true);
    const unsubscribe = subscribeLossesState(() => renderOverallAnalysisView(getData()));
    t.after(() => { unsubscribe(); resetLossesState(); });
    const values = () => rows.get("returnedPackages").cells.map(cell => cell.textContent);
    replaceLossesData(sample);
    assert.deepEqual(values(), ["2", "3", "5", "18", "30", "42", "100"]);
    replaceLossesData({ ...sample, days: [{ date: "2026-10-31", returnedPackages: 2185 }] });
    assert.deepEqual(values(), ["2.185", "0", "0", "0", "0", "0", "2.185"]);
    resetLossesState();
    assert.deepEqual(values(), periodKeys.map(() => "—"));
});

test("gráfico do card de pacotes em análise mantém #f0ad4e na criação e atualização", t => {
    const { root, charts } = createElements(t);
    assert.equal(initializeOverallAnalysisCharts(root), true);
    const chart = charts.find(item => item.canvas === root.querySelector("#overallAnalysisPackagesAnalysisChart"));
    assert.deepEqual(chart.data.datasets[0].backgroundColor, ["#f0ad4e", "#4b4b4b"]);
    assert.equal(renderOverallAnalysisCharts(getData(sample)), true);
    assert.deepEqual(chart.data.datasets[0].backgroundColor, ["#f0ad4e", "#4b4b4b"]);
    assert.deepEqual(chart.data.datasets[0].hoverBackgroundColor, ["#f0ad4e", "#4b4b4b"]);
    assert.equal(chart.data.datasets[0].data[0], .88);
    assert.equal(renderOverallAnalysisCharts(getData({ ...sample, days: [] })), true);
    assert.deepEqual(chart.data.datasets[0].backgroundColor, ["#f0ad4e", "#4b4b4b"]);
    assert.deepEqual(chart.data.datasets[0].data, [0, 1]);
});
