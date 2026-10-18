import assert from "node:assert/strict";
import { test } from "node:test";
import { initializeExpeditionErrorsCharts } from "../js/reports/expedition/errors-charts.js";
import { replaceExpeditionRoutes, resetExpeditionReport } from "../js/reports/expedition/state.js";

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

test("ocorrências por rua exibe o valor acima de cada barra das duas séries", t => {
    class TestElement {
        dataset = {};
        classList = { contains: () => false };
    }
    class TestCanvas extends TestElement {}
    const elements = new Map();
    const root = { querySelector(selector) {
        if (!elements.has(selector)) {
            elements.set(selector, selector.endsWith("Chart") ? new TestCanvas() : new TestElement());
        }
        return elements.get(selector);
    } };
    const charts = [];
    replaceGlobal(t, "HTMLElement", TestElement);
    replaceGlobal(t, "HTMLCanvasElement", TestCanvas);
    replaceGlobal(t, "MutationObserver", class { observe() {} disconnect() {} });
    replaceGlobal(t, "window", {
        addEventListener() {},
        Chart: class {
            constructor(canvas, config) { Object.assign(this, config, { canvas }); charts.push(this); }
            update() {}
            resize() {}
        },
    });
    resetExpeditionReport();
    t.after(() => resetExpeditionReport());
    replaceExpeditionRoutes([
        { code: "TESTE-A", status: "Validated", corridor: "A-1", finalOrders: 100, missingOrders: 70, missortedOrders: 51 },
        { code: "TESTE-B", status: "Validated", corridor: "B-1", finalOrders: 100, missingOrders: 78, missortedOrders: 42 },
    ]);
    assert.equal(initializeExpeditionErrorsCharts(root), true);
    const [balance, chart] = charts;
    assert.deepEqual(chart.data.labels, ["Rua A", "Rua B"]);
    assert.deepEqual(chart.data.datasets.map(dataset => dataset.data), [[70, 78], [51, 42]]);
    const plugin = chart.plugins.find(item => item.id === "expeditionStreetBarValues");
    const projection = chart.plugins.find(item => item.id === "expeditionStreetBars3D");
    assert.ok(plugin);
    assert.ok(projection);
    assert.ok(!balance.plugins.includes(plugin));
    assert.ok(!balance.plugins.includes(projection));
    assert.equal(chart.options.scales.y.grace, "15%");
    assert.deepEqual(chart.options.layout.padding, { top: 7, right: 8 });
    const faces = [];
    chart.chartArea = { left: 10, top: 10, right: 250, bottom: 250 };
    chart.ctx = {
        currentPath: [],
        save() {}, restore() {},
        beginPath() { this.currentPath = []; },
        moveTo(x, y) { this.currentPath.push([x, y]); },
        lineTo(x, y) { this.currentPath.push([x, y]); },
        closePath() {},
        fill() { faces.push({ points: this.currentPath, color: this.fillStyle }); },
    };
    const projectedBar = {
        getProps(properties, final) {
            assert.deepEqual(properties, ["x", "y", "base", "width"]);
            assert.equal(final, false);
            return { x: 50, y: 40, base: 140, width: 20 };
        },
    };
    projection.beforeDatasetDraw(chart, { index: 0, meta: { data: [projectedBar] } });
    assert.deepEqual(faces, [
        {
            points: [[60, 40], [68, 33], [68, 133], [60, 140]],
            color: "#947004",
        },
        {
            points: [[40, 40], [60, 40], [68, 33], [48, 33]],
            color: "#ffd24c",
        },
    ]);
    chart.chartArea = { top: 10, bottom: 250 };
    chart.isDatasetVisible = () => true;
    const bars = [[{ x: 40, y: 70 }, { x: 140, y: 50 }], [{ x: 70, y: 100 }, { x: 170, y: 130 }]];
    chart.getDatasetMeta = index => ({ data: bars[index] });
    const texts = [];
    let balanceCount = 0;
    chart.ctx = {
        letterSpacing: "0px",
        save() { balanceCount += 1; }, restore() { balanceCount -= 1; },
        strokeText() {},
        fillText(text, x, y) { texts.push({ text, x, y, alignment: this.textAlign, baseline: this.textBaseline }); },
    };
    plugin.afterDatasetsDraw(chart);
    assert.deepEqual(texts, [
        { text: "70", x: 44, y: 55, alignment: "center", baseline: "bottom" },
        { text: "78", x: 144, y: 35, alignment: "center", baseline: "bottom" },
        { text: "51", x: 74, y: 85, alignment: "center", baseline: "bottom" },
        { text: "42", x: 174, y: 115, alignment: "center", baseline: "bottom" },
    ]);
    assert.equal(chart.ctx.letterSpacing, "1px");
    assert.equal(balanceCount, 0);

    texts.length = 0;
    chart.data.datasets[0].data = [0, 1234];
    chart.data.datasets[1].data = [null, NaN];
    plugin.afterDatasetsDraw(chart);
    assert.deepEqual(texts.map(item => item.text), ["0", "1.234"]);
    texts.length = 0;
    chart.isDatasetVisible = index => index === 1;
    chart.data.datasets[1].data = [undefined, 5];
    plugin.afterDatasetsDraw(chart);
    assert.deepEqual(texts.map(item => item.text), ["5"]);
    texts.length = 0;
    chart.chartArea = null;
    plugin.afterDatasetsDraw(chart);
    assert.equal(texts.length, 0);
    assert.equal(balanceCount, 0);

    resetExpeditionReport();
    assert.deepEqual(chart.data.labels, []);
    assert.deepEqual(chart.data.datasets.map(dataset => dataset.data), [[], []]);
});
