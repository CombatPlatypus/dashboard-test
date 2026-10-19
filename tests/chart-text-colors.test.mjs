import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { CHART_TEXT_COLOR } from "../js/charts/theme.js";
import { initializeDamageAndLossesCharts } from "../js/reports/damage-and-losses/charts.js";
import { initializeLossesCharts } from "../js/reports/damage-and-losses/losses-charts.js";
import { initializeLossesRateCharts } from "../js/reports/losses-rate/charts.js";
import { initializeParcelCharts } from "../js/reports/parcel-sweeper/charts.js";
import { initializeExpeditionErrorsCharts } from "../js/reports/expedition/errors-charts.js";
import { initializeOverallAnalysisCharts } from "../js/reports/overall-analysis/charts.js";
import { initializeReceiptCharts } from "../js/reports/receipt/charts.js";
import { initializeExpeditionCharts } from "../js/reports/expedition/charts.js";

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

function createContext() {
    const noop = () => {};
    return {
        texts: [], letterSpacing: "0px",
        save: noop, restore: noop, beginPath: noop, closePath: noop,
        moveTo: noop, lineTo: noop, quadraticCurveTo: noop, stroke: noop, fill: noop, setLineDash: noop,
        strokeText: noop, fillRect: noop,
        measureText(text) { return { width: String(text).length * 8 }; },
        fillText(text) { this.texts.push({ text, color: this.fillStyle }); },
    };
}

test("eixos e indicadores manuais usam a cor compartilhada, preservando os dois rankings", t => {
    const elements = new Map();
    class Element {
        constructor(id) { this.id = id; this.dataset = {}; this.textContent = ""; }
        classList = { contains: () => false, toggle() {} };
        style = { getPropertyValue() { return ""; }, setProperty() {} };
        querySelector(selector) {
            const id = selector.replace(/^#/, "");
            if (!elements.has(id)) elements.set(id, id.endsWith("Chart") ? new Canvas(id) : new Element(id));
            return elements.get(id);
        }
        querySelectorAll() { return []; }
        closest() { return null; }
        setAttribute() {}
        addEventListener() {}
        getBoundingClientRect() { return { height: 0 }; }
    }
    class Canvas extends Element { parentElement = { style: {} }; }
    const charts = [];
    replaceGlobal(t, "HTMLElement", Element);
    replaceGlobal(t, "HTMLCanvasElement", Canvas);
    const documentRoot = new Element("document");
    replaceGlobal(t, "document", {
        getElementById: id => documentRoot.querySelector(`#${id}`),
        querySelector: selector => documentRoot.querySelector(selector),
    });
    replaceGlobal(t, "MutationObserver", class { observe() {} disconnect() {} });
    replaceGlobal(t, "ResizeObserver", class { observe() {} disconnect() {} });
    replaceGlobal(t, "window", {
        addEventListener() {}, requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
        Chart: class {
            constructor(canvas, config) { Object.assign(this, config, { canvas, config }); charts.push(this); }
            update() {} resize() {}
        },
    });
    for (const [id, initialize] of [
        ["damage-and-losses", initializeDamageAndLossesCharts],
        ["damage-and-losses", initializeLossesCharts],
        ["losses-rate", initializeLossesRateCharts],
        ["parcel", initializeParcelCharts],
        ["expedition", initializeExpeditionErrorsCharts],
        ["overall-analysis", initializeOverallAnalysisCharts],
    ]) {
        const root = new Element(id);
        elements.set(id, root);
        assert.equal(initialize(root), true, `Inicialização de ${id}`);
    }
    assert.equal(charts.length, 20);
    const testedPlugins = new Set();
    for (const chart of charts) {
        for (const [axis, scale] of Object.entries(chart.options.scales ?? {})) {
            if (scale.ticks?.color !== undefined) {
                assert.equal(scale.ticks.color, CHART_TEXT_COLOR, `${chart.canvas.id}: eixo ${axis}`);
            }
            if (scale.title?.color !== undefined) assert.equal(scale.title.color, CHART_TEXT_COLOR);
        }
        const context = createContext();
        const bar = { x: 50, y: 80, base: 140, height: 24, getProps() { return this; } };
        Object.assign(chart, {
            ctx: context, chartArea: { left: 0, right: 250, top: 0, bottom: 200 },
            scales: { y: { getPixelForValue: value => 200 - Number(value) * 10 } },
            getDatasetMeta: () => ({ data: [bar], hidden: false }), isDatasetVisible: () => true,
            $damageDailyAverage: 2, $lossesDailyAverage: 2,
            $damageChartDays: [{ soc: 4, hub: 3 }],
            $lossesChartDays: [{ underReview: 4, confirmedLosses: 3 }],
            $parcelHasDistribution: true,
        });
        chart.data.datasets.forEach(dataset => { dataset.data = [5]; });
        for (const plugin of chart.plugins ?? []) {
            const previousCount = context.texts.length;
            plugin.afterDatasetsDraw?.(chart);
            plugin.afterDraw?.(chart, {}, {});
            if (context.texts.length > previousCount) testedPlugins.add(plugin.id);
        }
        for (const { text, color } of context.texts) {
            assert.equal(color, CHART_TEXT_COLOR, `${chart.canvas.id}: ${text}`);
        }
    }
    assert.deepEqual([...testedPlugins].sort(), [
        "damageChartAverage", "damageChartLabels", "damageSocLabels",
        "expeditionStreetBarValues", "lossesAverage", "lossesPeriodLabels", "lossesRecoveryLabels",
        "lossesRateHistoryLabels", "lossesRateMaximumReference", "overallAnalysisBarValues",
        "parcelAgingValueLabels", "parcelHorizontalValues",
    ].sort());

    for (const [id, initialize, pluginId] of [
        ["receipt", initializeReceiptCharts, "receiptAlignedComparison"],
        ["expedition", initializeExpeditionCharts, "expeditionAlignedComparison"],
    ]) {
        const root = new Element(id);
        elements.set(id, root);
        assert.equal(initialize(root), true);
        const chart = charts.at(-1);
        Object.assign(chart, {
            ctx: createContext(), chartArea: { left: 16, right: 896, top: 38, bottom: 340 },
            scales: { x: {}, y: { getPixelForValue: index => 70 + index * 58 } },
            $receiptAlignedVolumeMaximum: 2500, $receiptAlignedErrorMaximum: 1,
            $receiptAlignedRows: [{ receiver: "Mariane", packagesReceived: 1949, errorMetric: .2 }],
            $expeditionRouteMaximum: 22, $expeditionTimeMaximum: 960,
            $expeditionRows: [{ operator: "Rosa", routesChecked: 21, averageDurationSeconds: 650 }],
        });
        chart.plugins.find(plugin => plugin.id === pluginId).beforeDatasetsDraw(chart);
        assert.ok(chart.ctx.texts.some(text => text.text === (id === "receipt" ? "Mariane" : "Rosa")
            && text.color === "#a8a9ad"), `${id}: ${JSON.stringify(chart.ctx.texts)}`);
        if (id === "receipt") {
            assert.ok(chart.ctx.texts.some(text => text.text === "20,00%" && text.color === "#a8a9ad"));
        } else {
            assert.ok(chart.ctx.texts.some(text => text.text === "10:50" && text.color === "#f99400"));
            assert.ok(chart.ctx.texts.some(text => text.text === "Máximo 10:00" && text.color === "#8B0000"));
        }
    }
});

test("gráficos de análise usam cinza nos valores, percentuais, legendas, eixos e título", () => {
    const source = readFileSync(new URL("../js/data-analysis/charts.js", import.meta.url), "utf8");
    const context = {
        document: { getElementById() { return {}; } },
        formatAnalysisNumber: value => String(value),
    };
    runInNewContext(`${source}\nglobalThis.testApi = {
        chartPercentagePlugin, chartValueLabelsPlugin, createPieLegendLabels, createChartScales,
        color: ANALYSIS_CHART_TEXT_COLOR,
    };`, context);
    const api = context.testApi;
    assert.equal(api.color, CHART_TEXT_COLOR);
    for (const type of ["pie", "bar", "line"]) {
        const ctx = createContext();
        const chart = {
            ctx, config: { type }, data: { labels: ["Rua A"], datasets: [{ data: [5], backgroundColor: ["#8B0000"] }] },
            getDatasetMeta: () => ({ data: [{ x: 50, y: 50, base: 150, tooltipPosition: () => ({ x: 50, y: 50 }) }] }),
            getDataVisibility: () => true,
        };
        api.chartPercentagePlugin.afterDatasetsDraw(chart);
        api.chartValueLabelsPlugin.afterDatasetsDraw(chart);
        assert.ok(ctx.texts.length > 0);
        assert.ok(ctx.texts.every(text => text.color === CHART_TEXT_COLOR));
        assert.ok(api.createPieLegendLabels(chart).every(label => label.fontColor === CHART_TEXT_COLOR));
    }
    const scales = api.createChartScales({ values: [5], labels: ["Rua A"] });
    for (const scale of Object.values(scales)) assert.equal(scale.ticks.color, CHART_TEXT_COLOR);
    assert.match(source, /title:\s*\{[\s\S]*?color: ANALYSIS_CHART_TEXT_COLOR/);
});
