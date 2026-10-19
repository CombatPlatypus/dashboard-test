import assert from "node:assert/strict";
import { test } from "node:test";
import { initializeReceiptCharts } from "../js/reports/receipt/charts.js";

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

function createContext() {
    const context = { strokes: [], texts: [], fills: [], balance: 0, letterSpacing: "0px" };
    let path = [];
    context.save = () => { context.balance += 1; };
    context.restore = () => { context.balance -= 1; };
    context.beginPath = () => { path = []; };
    context.closePath = () => {};
    context.moveTo = (...args) => path.push(["moveTo", ...args]);
    context.lineTo = (...args) => path.push(["lineTo", ...args]);
    context.quadraticCurveTo = () => {};
    context.stroke = () => context.strokes.push({ path: [...path], color: context.strokeStyle });
    context.fill = () => context.fills.push({ path: [...path], color: context.fillStyle });
    context.fillText = (text, x, y) => context.texts.push({
        text, x, y, alignment: context.textAlign, baseline: context.textBaseline,
    });
    context.strokeText = () => {};
    return context;
}

test("ranking de recebedores posiciona os textos acima das barras sem as bordas esquerda, superior e direita", t => {
    class TestElement {
        dataset = {};
        style = { getPropertyValue() { return ""; }, setProperty() {} };
        classList = { contains: () => false };
        getBoundingClientRect() { return { height: 0 }; }
        setAttribute() {}
        querySelector(selector) { return root.querySelector(selector); }
    }
    class TestCanvas extends TestElement {
        parentElement = new TestElement();
    }
    const elements = new Map();
    const root = new TestElement();
    root.querySelector = selector => {
        if (!elements.has(selector)) {
            elements.set(selector, selector === "#receiptAlignedComparisonChart"
                ? new TestCanvas() : new TestElement());
        }
        return elements.get(selector);
    };
    let chart;
    replaceGlobal(t, "HTMLElement", TestElement);
    replaceGlobal(t, "HTMLCanvasElement", TestCanvas);
    replaceGlobal(t, "MutationObserver", class { observe() {} disconnect() {} });
    replaceGlobal(t, "ResizeObserver", class { observe() {} disconnect() {} });
    replaceGlobal(t, "window", {
        requestAnimationFrame(callback) { callback(); return 1; },
        cancelAnimationFrame() {}, addEventListener() {},
        Chart: class {
            constructor(canvas, config) { Object.assign(this, config, { canvas }); chart = this; }
            resize() {}
            update() {}
        },
    });

    assert.equal(initializeReceiptCharts(root), true);
    const plugin = chart.plugins.find(item => item.id === "receiptAlignedComparison");
    chart.chartArea = { left: 16, right: 896, top: 38, bottom: 340 };
    chart.scales = { y: { getPixelForValue: index => 70 + index * 58 } };
    chart.$receiptAlignedVolumeMaximum = 2500;
    chart.$receiptAlignedErrorMaximum = 1;
    chart.$receiptAlignedRows = [
        { receiver: "Mariane", packagesReceived: 1949, errorMetric: 10 / 33 },
        { receiver: "Tamires", packagesReceived: 1539, errorMetric: 5 / 33 },
        { receiver: "Ana", packagesReceived: 0, errorMetric: null },
    ];
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);

    const volumeStart = 26, volumeLimit = 367, errorStart = 481, errorLimit = 822;
    for (const [index, name, quantity, percentage, volume, error] of [
        [0, "Mariane", "1.949", "30,30%", 1949, 10 / 33],
        [1, "Tamires", "1.539", "15,15%", 1539, 5 / 33],
        [2, "Ana", "0", "—", 0, null],
    ]) {
        const rowTop = 70 + (index - 0.5) * 58;
        const barY = Math.max(70 + index * 58, rowTop + 12 + 14 + 8 + 12);
        const nameLabel = chart.ctx.texts.find(label => label.text === name);
        assert.equal(nameLabel.x, volumeStart);
        assert.equal(nameLabel.y, rowTop + 26);
        for (const [text, x] of [
            [quantity, volumeStart + (volumeLimit - volumeStart) * volume / 2500 + 20],
            [percentage, errorStart + (errorLimit - errorStart) * (error ?? 0) + 20],
        ]) {
            const label = chart.ctx.texts.find(label => label.text === text && Math.abs(label.x - x) < 1e-8);
            assert.ok(label, "Valor fora da barra: " + text);
            assert.equal(label.y, barY + 7);
            assert.equal(label.alignment, "left");
        }
    }
    const volumeBar = chart.ctx.fills.find(fill => fill.color === "#007A48");
    assert.deepEqual(volumeBar.path[0], ["moveTo", 26, 75]);
    const volumeEnd = volumeStart + (volumeLimit - volumeStart) * 1949 / 2500;
    assert.ok(volumeBar.path.some(point => Math.abs(point[1] - volumeEnd) < 1e-9));
    assert.equal(chart.ctx.fills.filter(fill => fill.color === "#29292a").length, 2);
    assert.ok(!chart.ctx.fills.some(fill => fill.color === "rgba(228, 230, 235, 0.07)"));
    for (const gridX of [volumeStart + (volumeLimit - volumeStart) / 5, volumeLimit, errorStart + (errorLimit - errorStart) * .2]) {
        assert.ok(chart.ctx.strokes.some(stroke => stroke.path.length === 2 &&
            stroke.path.every(point => Math.abs(point[1] - gridX) < 1e-8)));
    }
    assert.ok(chart.ctx.texts.some(label => label.text === "100%" && label.x === errorLimit));
    assert.equal(chart.ctx.balance, 0);

    chart.$receiptAlignedRows = [{ receiver: "Mariane", packagesReceived: 2500, errorMetric: 1.2 }];
    chart.$receiptAlignedErrorMaximum = 1.2;
    chart.scales.y.getPixelForValue = index => 200 + index * 300;
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);
    assert.ok(chart.ctx.texts.some(label => label.text === "Mariane" && label.y === 180));
    assert.ok(chart.ctx.texts.some(label => label.text === "120,00%" && label.y === 207 && label.x === errorLimit + 20));
    assert.ok(chart.ctx.texts.some(label => label.text === "120%" && label.x === errorLimit));

    chart.$receiptAlignedRows = [];
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);
    assert.ok(!chart.ctx.fills.some(fill => fill.color === "#007A48" || fill.color === "#8B0000"));
    assert.ok(chart.ctx.texts.some(label => label.text === "Importe os dados para comparar os recebedores."));
    assert.equal(chart.ctx.balance, 0);
});
