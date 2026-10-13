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

    for (const [index, name, quantity, percentage] of [
        [0, "Mariane", "1.949", "30,30%"], [1, "Tamires", "1.539", "15,15%"], [2, "Ana", "0", "—"],
    ]) {
        const rowTop = 70 + (index - 0.5) * 58;
        const labelY = rowTop + 12 + 14;
        for (const [text, x, alignment] of [[name, 26, "left"], [quantity, 431, "right"], [percentage, 481, "left"]]) {
            assert.ok(chart.ctx.texts.some(label => label.text === text && label.x === x && label.y === labelY &&
                label.alignment === alignment && label.baseline === "bottom"), `Posição acima da barra: ${text}`);
        }
    }
    const volumeBar = chart.ctx.fills.find(fill => fill.color === "#4caf50");
    assert.deepEqual(volumeBar.path[0], ["moveTo", 29, 75]);
    const volumeEnd = 26 + (431 - 26) * 1949 / 2500;
    assert.ok(volumeBar.path.some(point => Math.abs(point[1] - volumeEnd) < 1e-9));
    assert.equal(chart.ctx.strokes.length, 14);
    // A grade ocupa o container; os textos e as barras têm padding interno de 10px.
    for (const gridX of [101, 441, 471]) {
        assert.ok(chart.ctx.strokes.some(stroke => JSON.stringify(stroke.path) ===
            JSON.stringify([["moveTo", gridX, 38], ["lineTo", gridX, 340]])));
    }
    assert.ok(!chart.ctx.strokes.some(stroke => stroke.path.every(point => point[1] === chart.chartArea.left)));
    assert.ok(chart.ctx.texts.some(label => label.text === "0" && label.x === chart.chartArea.left));
    assert.ok(!chart.ctx.strokes.some(stroke => stroke.path.every(point => point[2] === chart.chartArea.top)));
    assert.ok(!chart.ctx.strokes.some(stroke => stroke.path.every(point => point[1] === 886 || point[1] === 896)));
    assert.ok(chart.ctx.strokes.some(stroke => JSON.stringify(stroke.path) ===
        JSON.stringify([["moveTo", 16, 340], ["lineTo", 896, 340]])));
    assert.ok(chart.ctx.texts.some(label => label.text === "100%" && label.x === 896));
    assert.equal(chart.ctx.letterSpacing, "1px");
    assert.equal(chart.ctx.balance, 0);

    chart.$receiptAlignedRows = [{ receiver: "Mariane", packagesReceived: 2500, errorMetric: 1.2 }];
    chart.$receiptAlignedErrorMaximum = 1.2;
    chart.scales.y.getPixelForValue = index => 200 + index * 300;
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);
    assert.ok(chart.ctx.texts.some(label => label.text === "Mariane" && label.y === 182));
    assert.ok(chart.ctx.texts.some(label => label.text === "120,00%" && label.y === 182));
    assert.ok(chart.ctx.texts.some(label => label.text === "120%" && label.x === 896));

    chart.$receiptAlignedRows = [];
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);
    assert.equal(chart.ctx.fills.length, 0);
    assert.ok(!chart.ctx.strokes.some(stroke => stroke.path.every(point => point[1] === chart.chartArea.left)));
    assert.ok(chart.ctx.texts.some(label => label.text === "Importe os dados para comparar os recebedores."));
    assert.equal(chart.ctx.balance, 0);
});
