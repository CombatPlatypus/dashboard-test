import assert from "node:assert/strict";
import { test } from "node:test";
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
    const context = { strokes: [], texts: [], fills: 0, balance: 0, letterSpacing: "0px" };
    let path = [];
    let dash = [];
    context.save = () => { context.balance += 1; };
    context.restore = () => { context.balance -= 1; };
    context.beginPath = () => { path = []; };
    context.moveTo = (...args) => path.push(["moveTo", ...args]);
    context.lineTo = (...args) => path.push(["lineTo", ...args]);
    context.quadraticCurveTo = () => {};
    context.setLineDash = value => { dash = [...value]; };
    context.stroke = () => context.strokes.push({ path: [...path], color: context.strokeStyle, dash });
    context.fill = () => { context.fills += 1; };
    context.fillText = text => context.texts.push(text);
    context.strokeText = () => {};
    context.measureText = text => ({ width: text.length * 8 });
    return context;
}

test("ranking de conferentes não desenha grades e preserva barras, escalas e limite de tempo", t => {
    class TestElement {
        dataset = {};
        style = {};
        classList = { contains: () => false };
    }
    class TestCanvas extends TestElement {
        parentElement = new TestElement();
    }
    const elements = new Map();
    const root = {
        querySelector(selector) {
            if (!elements.has(selector)) {
                elements.set(selector, selector === "#expeditionAlignedComparisonChart"
                    ? new TestCanvas() : new TestElement());
            }
            return elements.get(selector);
        },
    };
    let chart;
    replaceGlobal(t, "HTMLElement", TestElement);
    replaceGlobal(t, "HTMLCanvasElement", TestCanvas);
    replaceGlobal(t, "MutationObserver", class { observe() {} disconnect() {} });
    replaceGlobal(t, "window", {
        Chart: class {
            constructor(canvas, config) {
                Object.assign(this, config, { canvas });
                chart = this;
            }
            resize() {}
            update() {}
        },
    });

    assert.equal(initializeExpeditionCharts(root), true);
    assert.equal(chart.options.scales.x.display, false);
    assert.equal(chart.options.scales.y.display, false);
    const plugin = chart.plugins.find(item => item.id === "expeditionAlignedComparison");
    chart.chartArea = { left: 16, right: 896, top: 38, bottom: 340 };
    chart.scales = { x: {}, y: { getPixelForValue: index => 70 + index * 58 } };
    chart.$expeditionRouteMaximum = 22;
    chart.$expeditionTimeMaximum = 16 * 60;
    chart.$expeditionRows = [
        { operator: "Rosa", routesChecked: 21, averageDurationSeconds: 394 },
        { operator: "Gabriel", routesChecked: 20, averageDurationSeconds: 384 },
        { operator: "Ana", routesChecked: 19, averageDurationSeconds: null },
    ];
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);

    const referenceX = 471 + (896 - 471) * (600 / 960);
    assert.deepEqual(chart.ctx.strokes, [{
        path: [["moveTo", referenceX, 34], ["lineTo", referenceX, 340]],
        color: "#d9534f",
        dash: [6, 5],
    }]);
    assert.equal(chart.ctx.fills, 11);
    for (const text of ["Rosa", "Gabriel", "Ana", "21 rotas", "06:34", "22", "16M", "Máximo 10:00"]) {
        assert.ok(chart.ctx.texts.includes(text), `Texto preservado: ${text}`);
    }
    assert.equal(chart.ctx.balance, 0);

    chart.$expeditionRows = [];
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);
    assert.deepEqual(chart.ctx.strokes, []);
    assert.ok(chart.ctx.texts.includes("Importe os dados para comparar os conferentes."));
    assert.equal(chart.ctx.balance, 0);
});
