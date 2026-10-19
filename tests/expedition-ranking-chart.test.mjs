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
    const context = { strokes: [], texts: [], fills: 0, filledPaths: [], balance: 0, letterSpacing: "0px" };
    let path = [];
    let dash = [];
    context.save = () => { context.balance += 1; };
    context.restore = () => { context.balance -= 1; };
    context.beginPath = () => { path = []; };
    context.moveTo = (...args) => path.push(["moveTo", ...args]);
    context.closePath = () => {};
    context.lineTo = (...args) => path.push(["lineTo", ...args]);
    context.quadraticCurveTo = () => {};
    context.setLineDash = value => { dash = [...value]; };
    context.stroke = () => context.strokes.push({ path: [...path], color: context.strokeStyle, dash });
    context.fill = () => {
        context.fills += 1;
        context.filledPaths.push([...path]);
    };
    context.fillText = (text, x, y) => context.texts.push({
        text, x, y, alignment: context.textAlign, baseline: context.textBaseline, color: context.fillStyle,
    });
    context.strokeText = () => {};
    context.measureText = text => ({ width: text.length * 8 });
    return context;
}

test("canvas do ranking preserva o padding e a grade interna, sem desenhar bordas externas", t => {
    // A moldura do container segue o CSS atual; esta verificação trata apenas do canvas.
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
    assert.equal(chart.options.layout.padding.bottom, 16);
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

    const routeStart = 26, routeLimit = 367, timeStart = 481, timeLimit = 822;
    const referenceX = timeStart + (timeLimit - timeStart) * (600 / 960);
    assert.deepEqual(chart.ctx.strokes.filter(stroke => stroke.color === "#8B0000"), [{
        path: [["moveTo", referenceX, 34], ["lineTo", referenceX, 340]],
        color: "#8B0000", dash: [6, 5],
    }]);
    for (const gridX of [routeStart + (routeLimit - routeStart) * 2 / 22, timeStart + (timeLimit - timeStart) * 2 / 16]) {
        assert.ok(chart.ctx.strokes.some(stroke => stroke.path.length === 2 &&
            stroke.path.every(point => Math.abs(point[1] - gridX) < 1e-8)));
    }
    assert.equal(chart.ctx.fills, 17);
    const firstFront = chart.ctx.filledPaths[4];
    assert.deepEqual(firstFront[0], ["moveTo", routeStart, 75]);
    const routeEnd = routeStart + (routeLimit - routeStart) * 21 / 22;
    assert.ok(firstFront.some(point => Math.abs(point[1] - routeEnd) < 1e-8));
    for (const [index, name, routes, time, routeValue, timeValue] of [
        [0, "Rosa", "21", "06:34", 21, 394],
        [1, "Gabriel", "20", "06:24", 20, 384],
        [2, "Ana", "19", "—", 19, null],
    ]) {
        const rowTop = 70 + (index - .5) * 58;
        const barY = Math.max(70 + index * 58, rowTop + 12 + 14 + 8 + 12);
        assert.ok(chart.ctx.texts.some(label => label.text === name && label.x === routeStart && label.y === rowTop + 26));
        for (const [text, x] of [
            [routes, routeStart + (routeLimit - routeStart) * routeValue / 22 + 20],
            [time, timeStart + (timeLimit - timeStart) * (timeValue ?? 0) / 960 + 20],
        ]) {
            assert.ok(chart.ctx.texts.some(label => label.text === text &&
                Math.abs(label.x - x) < 1e-8 && label.y === barY + 7 && label.alignment === "left"), text);
        }
    }
    assert.ok(chart.ctx.texts.some(label => label.text === "Máximo 10:00"));
    assert.equal(chart.ctx.balance, 0);

    chart.$expeditionRows = [{ operator: "Rosa", routesChecked: 1, averageDurationSeconds: 650 }];
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);
    assert.ok(chart.ctx.texts.some(label => label.text === "1" && label.x === routeStart + (routeLimit - routeStart) / 22 + 20));
    assert.ok(chart.ctx.texts.some(label => label.text === "10:50" && label.color === "#f99400"));

    chart.scales.y.getPixelForValue = index => 200 + index * 300;
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);
    assert.ok(chart.ctx.texts.some(label => label.text === "Rosa" && label.y === 180));

    chart.$expeditionRows = [];
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);
    assert.equal(chart.ctx.fills, 2);
    assert.equal(chart.ctx.texts.length, 1);
    assert.equal(chart.ctx.texts[0].text, "Importe os dados para comparar os conferentes.");
    assert.equal(chart.ctx.balance, 0);
});
