import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("ranking preserva o padding e a grade interna, sem as bordas externas", t => {
    const styles = readFileSync(new URL("../css/reports-style.css", import.meta.url), "utf8");
    assert.match(styles, /#expeditionChartsExportArea\s*>\s*\.chart\s*\{\s*border:\s*0;/);
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

    const referenceX = 481 + (886 - 481) * (600 / 960);
    assert.deepEqual(chart.ctx.strokes.filter(stroke => stroke.color === "#d9534f"), [{
        path: [["moveTo", referenceX, 34], ["lineTo", referenceX, 340]],
        color: "#d9534f",
        dash: [6, 5],
    }]);
    assert.equal(chart.ctx.strokes.length, 20);
    // As bordas dos dois conjuntos de barras não fazem parte da grade interna.
    for (const borderX of [16, 441, 471, 896]) {
        assert.ok(!chart.ctx.strokes.some(stroke => stroke.path.every(point => point[1] === borderX)));
    }
    for (const borderY of [38, 340]) {
        assert.ok(!chart.ctx.strokes.some(stroke => stroke.path.every(point => point[2] === borderY)));
    }
    assert.ok(!chart.ctx.strokes.some(stroke =>
        JSON.stringify(stroke.path) === JSON.stringify([["moveTo", 16, 215], ["lineTo", 896, 215]])));
    for (const gridX of [16 + 425 * 2 / 22, 471 + 425 * 2 / 16]) {
        assert.ok(chart.ctx.strokes.some(stroke =>
            stroke.path.every(point => Math.abs(point[1] - gridX) < 1e-9) &&
            stroke.path[0][2] === 38 && stroke.path[1][2] === 340));
    }
    assert.ok(chart.ctx.strokes.some(stroke =>
        JSON.stringify(stroke.path) === JSON.stringify([["moveTo", 16, 99], ["lineTo", 896, 99]])));
    assert.equal(chart.ctx.fills, 11);
    const getHorizontalBounds = path => {
        const points = path.filter(([command]) => command === "moveTo" || command === "lineTo");
        return [Math.min(...points.map(point => point[1])), Math.max(...points.map(point => point[1]))];
    };
    assert.deepEqual(getHorizontalBounds(chart.ctx.filledPaths[0]), [26, 431]);
    assert.deepEqual(getHorizontalBounds(chart.ctx.filledPaths[2]), [481, 886]);
    const firstRouteBounds = getHorizontalBounds(chart.ctx.filledPaths[1]);
    assert.equal(firstRouteBounds[0], 26);
    assert.ok(Math.abs(firstRouteBounds[1] - (26 + (431 - 26) * 21 / 22)) < 1e-9);
    for (const [index, name, routes, time] of [
        [0, "Rosa", "21", "06:34"], [1, "Gabriel", "20", "06:24"], [2, "Ana", "19", "—"],
    ]) {
        const rowTop = 70 + (index - 0.5) * 58;
        const labelY = rowTop + 12 + 14;
        for (const [text, x, alignment] of [[name, 26, "left"], [routes, 431, "right"], [time, 481, "left"]]) {
            const label = chart.ctx.texts.find(label => label.text === text);
            assert.ok(label, `Texto preservado: ${text}`);
            assert.equal(label.x, x);
            assert.equal(label.y, labelY);
            assert.equal(label.alignment, alignment);
            assert.equal(label.baseline, "bottom");
            assert.equal(label.y - 14 - rowTop, 12);
        }
    }
    assert.equal(chart.ctx.texts.length, 10);
    assert.ok(chart.ctx.texts.some(label => label.text === "Máximo 10:00"));
    assert.ok(chart.ctx.texts.every(label => label.y < chart.chartArea.bottom));
    assert.equal(chart.ctx.balance, 0);

    chart.$expeditionRows = [{ operator: "Rosa", routesChecked: 1, averageDurationSeconds: 650 }];
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);
    assert.ok(chart.ctx.texts.some(label => label.text === "1" && label.x === 431 && label.alignment === "right"));
    assert.ok(chart.ctx.texts.some(label => label.text === "10:50" && label.x === 481 && label.color === "#ffc107"));
    assert.ok(chart.ctx.strokes.every(stroke => stroke.path[0][2] !== stroke.path[1][2]));

    // A single operator in a tall row keeps its vertical centering.
    chart.scales.y.getPixelForValue = index => 200 + index * 300;
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);
    assert.ok(chart.ctx.texts.some(label => label.text === "Rosa" && label.y === 182));

    chart.$expeditionRows = [];
    chart.ctx = createContext();
    plugin.beforeDatasetsDraw(chart);
    assert.equal(chart.ctx.strokes.length, 17);
    assert.equal(chart.ctx.texts.length, 1);
    assert.equal(chart.ctx.texts[0].text, "Importe os dados para comparar os conferentes.");
    assert.equal(chart.ctx.balance, 0);
});
