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

function getData(lossesState = getLossesState(), parcelState = null, reverseState = null) {
    return createOverallAnalysisData(getReceiptState(), getExpeditionState(), null, {},
        getDamageAndLossesState(), lossesState, parcelState, reverseState);
}

function getCardData(plannedVolume = null, lost = null) {
    const months = Array.from({ length: 12 }, () => ({
        moved: null, lost: null, damage: null, possibleLosses: null,
    }));
    months[9] = {
        moved: 1000000, lost, damage: lost === null ? null : 0, possibleLosses: 0,
    };
    return createOverallAnalysisData(getReceiptState(), getExpeditionState(),
        { activeMonth: 9, year: 2026, months }, { plannedVolume, shiftCapacity: 20000 },
        getDamageAndLossesState(), getLossesState());
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
    return { root, rows, charts, elements };
}

test("HTML adiciona retornados abaixo de perdas confirmadas com sete períodos", () => {
    assert.deepEqual([...tableHtml.matchAll(/data-overall-damage-losses-field="([^"]+)"/g)].map(match => match[1]),
        ["hub", "soc", "underReview", "confirmedLosses", "returnedPackages"]);
    const returnedRow = tableHtml.match(/<tr data-overall-damage-losses-field="returnedPackages">([\s\S]*?)<\/tr>/)[1];
    assert.match(returnedRow, /<th scope="row">Pacotes Retornados<\/th>/);
    assert.equal([...returnedRow.matchAll(/<td>—<\/td>/g)].length, 7);
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

test("gráfico do card de pacotes em análise mantém #f99400 na criação e atualização", t => {
    const { root, charts } = createElements(t);
    assert.equal(initializeOverallAnalysisCharts(root), true);
    const chart = charts.find(item => item.canvas === root.querySelector("#overallAnalysisPackagesAnalysisChart"));
    assert.deepEqual(chart.data.datasets[0].backgroundColor, ["#f99400", "#4b4b4b"]);
    assert.equal(renderOverallAnalysisCharts(getData(sample)), true);
    assert.deepEqual(chart.data.datasets[0].backgroundColor, ["#f99400", "#4b4b4b"]);
    assert.deepEqual(chart.data.datasets[0].hoverBackgroundColor, ["#f99400", "#4b4b4b"]);
    assert.equal(chart.data.datasets[0].data[0], .88);
    assert.equal(renderOverallAnalysisCharts(getData({ ...sample, days: [] })), true);
    assert.deepEqual(chart.data.datasets[0].backgroundColor, ["#f99400", "#4b4b4b"]);
    assert.deepEqual(chart.data.datasets[0].data, [0, 1]);
});

test("card de capacidade fica verde até 100% e vermelho somente acima, sem recriar gráficos", t => {
    const { root, charts } = createElements(t);
    assert.equal(initializeOverallAnalysisCharts(root), true);
    const chart = charts.find(item => item.canvas === root.querySelector("#overallAnalysisCapacityChart"));
    for (const [plannedVolume, color] of [
        [0, "#007A48"], [10000, "#007A48"], [19999, "#007A48"], [20000, "#007A48"],
        [20001, "#8B0000"], [23000, "#8B0000"], [20000, "#007A48"],
    ]) {
        const data = getCardData(plannedVolume);
        assert.equal(renderOverallAnalysisCharts(data), true);
        assert.deepEqual(chart.data.datasets[0].backgroundColor, [color, "#4b4b4b"], `Planejamento: ${plannedVolume}`);
        assert.deepEqual(chart.data.datasets[0].hoverBackgroundColor, [color, "#4b4b4b"]);
        assert.equal(chart.data.datasets[0].data[0], Math.min(plannedVolume / 20000, 1));
        assert.equal(data.cards.capacity.used, plannedVolume);
        assert.equal(charts.length, 7);
    }
});

test("taxa de perdas usa verde abaixo de 0,025%, amarelo até 0,030% e vermelho acima", t => {
    const { root, charts } = createElements(t);
    assert.equal(initializeOverallAnalysisCharts(root), true);
    const chart = charts.find(item => item.canvas === root.querySelector("#overallAnalysisLossRateChart"));
    for (const [lost, color] of [
        [0, "#007A48"], [240, "#007A48"], [249, "#007A48"],
        [250, "#f99400"], [251, "#f99400"], [299, "#f99400"], [300, "#f99400"],
        [301, "#8B0000"], [350, "#8B0000"], [300, "#f99400"], [249, "#007A48"],
    ]) {
        const data = getCardData(null, lost);
        assert.equal(data.cards.lossesRate.limit, 0.0003);
        assert.equal(data.cards.lossesRate.rate, lost / 1000000);
        assert.equal(renderOverallAnalysisCharts(data), true);
        assert.deepEqual(chart.data.datasets[0].backgroundColor, [color, "#4b4b4b"], `Perdas: ${lost} em 1.000.000`);
        assert.deepEqual(chart.data.datasets[0].hoverBackgroundColor, [color, "#4b4b4b"]);
        assert.equal(chart.data.datasets[0].data[0], Math.min(data.cards.lossesRate.rate / 0.0003, 1));
        assert.equal(charts.length, 7);
    }
});

test("limpar os dados mantém os cards de capacidade e perdas vazios e neutros", t => {
    const { root, charts } = createElements(t);
    assert.equal(initializeOverallAnalysisCharts(root), true);
    const cardCharts = ["#overallAnalysisCapacityChart", "#overallAnalysisLossRateChart"]
        .map(selector => charts.find(item => item.canvas === root.querySelector(selector)));
    for (const chart of cardCharts) {
        assert.deepEqual(chart.data.datasets[0].backgroundColor, ["#e4e6eb", "#4b4b4b"]);
    }
    renderOverallAnalysisCharts(getCardData(23000, 350));
    renderOverallAnalysisCharts(getCardData());
    for (const chart of cardCharts) {
        assert.deepEqual(chart.data.datasets[0].backgroundColor, ["#e4e6eb", "#4b4b4b"]);
        assert.deepEqual(chart.data.datasets[0].hoverBackgroundColor, ["#e4e6eb", "#4b4b4b"]);
        assert.deepEqual(chart.data.datasets[0].data, [0, 1]);
    }
});

test("Parcel e Reversa exibem totais, cobertura de esperados e composição e voltam ao estado vazio", t => {
    const { root, charts, elements } = createElements(t);
    assert.equal(initializeOverallAnalysisView(root), true);
    assert.equal(initializeOverallAnalysisCharts(root), true);
    const parcelChart = charts.find(chart => chart.canvas === elements.get("overallAnalysisParcelCoverageChart"));
    const reverseChart = charts.find(chart => chart.canvas === elements.get("overallAnalysisReverseCompositionChart"));
    const render = (parcel, reverse) => {
        const data = getData(undefined, parcel, reverse);
        assert.equal(renderOverallAnalysisView(data), true);
        assert.equal(renderOverallAnalysisCharts(data), true);
    };
    const text = suffix => elements.get(`overallAnalysis${suffix}`).textContent;
    render();
    assert.equal(text("ParcelScanned"), "—");
    assert.equal(text("ReverseReturn"), "—");
    const rows = [
        ["Backlog", "Y"], ["Exception", "Y"], ["Mis-sorted", "Y"],
        ["Missing", "Y"], ["Missing", "Y"], ["Backlog", "N"],
    ].map(([countType, expected], index) => ({ trackingNumber: `BR${index}`, countType, expected }));
    const transfers = [{ to: "TO1", quantities: { return: 3, missorted: 2, liquidate: 1, confiscated: 4 } }];
    render({ rows }, { transfers });
    assert.deepEqual(["ParcelScanned", "ParcelBacklog", "ParcelException", "ParcelMissorted"].map(text),
        ["4", "2", "1", "1"]);
    assert.deepEqual([text("ParcelCoverageScanned"), text("ParcelCoverageUnscanned")], ["60,00%", "40,00%"]);
    assert.deepEqual(parcelChart.data.datasets[0].data, [3, 2]);
    assert.equal(parcelChart.$parcelTotal, 5);
    assert.equal(parcelChart.$parcelScanned, 3);
    assert.deepEqual(["Return", "Missorted", "Liquidate", "Confiscated"].map(type => text(`Reverse${type}`)),
        ["3", "2", "1", "4"]);
    assert.deepEqual(["Return", "Missorted", "Liquidate", "Confiscated"].map(type => text(`ReverseComposition${type}`)),
        ["3 (30%)", "2 (20%)", "1 (10%)", "4 (40%)"]);
    assert.deepEqual(reverseChart.data.datasets[0].data, [3, 2, 1, 4]);
    assert.equal(reverseChart.options.plugins.reverseCenterText.text, "10");
    render({ rows: rows.map(row => ({ ...row, expected: "N" })) }, { transfers: [] });
    assert.equal(text("ParcelCoverageScanned"), "—");
    assert.equal(text("ReverseReturn"), "—");
    render();
    assert.equal(text("ParcelScanned"), "—");
    assert.equal(text("ReverseCompositionReturn"), "—");
    assert.deepEqual(parcelChart.data.datasets[0].data, [0, 0]);
    assert.deepEqual(reverseChart.data.datasets[0].data, [0, 0, 0, 0]);
    assert.equal(reverseChart.options.plugins.reverseCenterText.text, "—");
    assert.equal(charts.length, 7);
});
