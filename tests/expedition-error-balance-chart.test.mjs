import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { initializeExpeditionErrorsCharts } from "../js/reports/expedition/errors-charts.js";
import {
    getExpeditionErrorAnalysis,
    getExpeditionState,
    replaceExpeditionRoutes,
    resetExpeditionReport,
    restoreExpeditionState,
    subscribeExpeditionState,
    updateExpeditionErrorQuantity,
} from "../js/reports/expedition/state.js";
import {
    bindExpeditionErrorQuantityInput,
    setExpeditionInputValue,
} from "../js/reports/expedition/view.js";

const labels = ["Erros de Etiqueta", "Erros de Sorting", "Revertidos", "Saldo Final"];
const colors = ["#3F51B5", "#f0ad4e", "#8BC34A", "#FF5722"];

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

function createCharts(t) {
    class Element {
        dataset = {};
        classList = { contains: () => false };
    }
    class Canvas extends Element {}
    const elements = new Map();
    const root = { querySelector(selector) {
        if (!elements.has(selector)) {
            elements.set(selector, selector.endsWith("Chart") ? new Canvas() : new Element());
        }
        return elements.get(selector);
    } };
    const charts = [];
    replaceGlobal(t, "HTMLElement", Element);
    replaceGlobal(t, "HTMLCanvasElement", Canvas);
    replaceGlobal(t, "MutationObserver", class { observe() {} disconnect() {} });
    replaceGlobal(t, "window", {
        addEventListener() {},
        Chart: class {
            constructor(canvas, config) { Object.assign(this, config, { canvas, updates: 0 }); charts.push(this); }
            update() { this.updates += 1; }
            resize() {}
        },
    });
    resetExpeditionReport();
    t.after(() => resetExpeditionReport());
    assert.equal(initializeExpeditionErrorsCharts(root), true);
    assert.equal(initializeExpeditionErrorsCharts(root), true);
    assert.equal(charts.length, 2);
    return { chart: charts[0], charts };
}

function createInput(field) {
    const input = {
        value: "", maxLength: 8, listeners: new Map(),
        addEventListener(name, listener) { this.listeners.set(name, listener); },
        type(value) { this.value = value; this.listeners.get("input")(); },
        blur() { this.listeners.get("blur")(); },
    };
    bindExpeditionErrorQuantityInput(input, field);
    return input;
}

test("gráfico usa o novo título e mantém Etiqueta, Sorting, Revertidos e Saldo Final", t => {
    const { chart } = createCharts(t);
    assert.equal(chart.type, "bar");
    assert.equal(chart.options.indexAxis, "y");
    assert.deepEqual(chart.data.labels, labels);
    assert.deepEqual(chart.data.datasets[0].data, [0, 0, 0, 0]);
    assert.deepEqual(chart.data.datasets[0].backgroundColor, colors);
    assert.deepEqual(chart.plugins.map(plugin => plugin.id), [
        "expeditionErrorsTextSpacing",
        "expeditionErrorBalance3D",
        "expeditionErrorBalanceValues",
    ]);
    assert.deepEqual(chart.options.scales.y.ticks.font, {
        family: '"Open Sans", sans-serif',
        size: 14,
    });
    assert.equal(chart.options.scales.y.ticks.padding, 8);
    const textContext = { letterSpacing: "0px" };
    chart.ctx = textContext;
    chart.plugins[0].beforeDraw(chart);
    assert.equal(textContext.letterSpacing, "1px");
    const labelScale = { width: 120 };
    chart.options.scales.y.afterFit(labelScale);
    assert.equal(labelScale.width, 136);
    assert.equal(chart.options.scales.y.border.display, false);
    assert.equal(chart.options.scales.x.grid.color({ tick: { value: 0 } }), "rgba(0, 0, 0, 0)");
    assert.equal(chart.options.scales.x.grid.color({ tick: { value: 20 } }), "rgba(82, 82, 82, 0.45)");
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    assert.match(html, /<h4>Acompanhamento dos Erros<\/h4>/);
    assert.doesNotMatch(html, /(?:Identificados|Erros de Etiqueta x Erros de Sorting) x? Revertidos x Saldo Final/);
    const view = readFileSync(new URL("../js/reports/expedition/view.js", import.meta.url), "utf8");
    for (const [element, field] of [["labelingErrorsInput", "labelingErrors"],
        ["sortingErrorsInput", "sortingErrors"], ["revertedInput", "revertedErrors"]]) {
        assert.match(view, new RegExp(`bindExpeditionErrorQuantityInput\\(\\s*elements\\.${element},\\s*"${field}"`));
    }
});

test("projeção 3D desenha a base e as faces inferior e lateral de cada barra", t => {
    const { chart } = createCharts(t);
    const paths = [];
    const context = {
        currentPath: [],
        strokes: [],
        save() {},
        restore() {},
        beginPath() { this.currentPath = []; },
        moveTo(x, y) { this.currentPath.push([x, y]); },
        lineTo(x, y) { this.currentPath.push([x, y]); },
        closePath() {},
        fill() { paths.push({ points: this.currentPath, color: this.fillStyle }); },
        stroke() { this.strokes.push({ color: this.strokeStyle, width: this.lineWidth }); },
    };
    const bar = {
        getProps(properties, final) {
            assert.deepEqual(properties, ["x", "y", "base", "height"]);
            assert.equal(final, false);
            return { x: 112, y: 50, base: 12, height: 32 };
        },
    };
    chart.ctx = context;
    chart.chartArea = { left: 12, top: 10, right: 300, bottom: 220 };
    chart.plugins[1].beforeDatasetsDraw(chart);
    chart.plugins[1].beforeDatasetDraw(chart, { index: 0, meta: { data: [bar] } });
    assert.deepEqual(paths, [
        {
            points: [[2, 1], [22, 19], [22, 229], [2, 211]],
            color: "rgba(168, 169, 173, 0.16)",
        },
        {
            points: [[12, 66], [112, 66], [122, 75], [22, 75]],
            color: "#252f69",
        },
        {
            points: [[112, 34], [122, 43], [122, 75], [112, 66]],
            color: "#7582ca",
        },
    ]);
    assert.deepEqual(context.strokes, [{
        color: "rgba(168, 169, 173, 0.34)",
        width: 1,
    }]);
    assert.deepEqual(chart.options.layout.padding, { right: 10, bottom: 9 });
});

test("valores ficam dentro das barras com contraste adequado a cada cor", t => {
    const { chart } = createCharts(t);
    const texts = [];
    const context = {
        letterSpacing: "0px",
        save() {},
        restore() {},
        measureText(text) { return { width: String(text).length * 8 }; },
        fillText(text, x, y) {
            texts.push({
                text, x, y,
                color: this.fillStyle,
                align: this.textAlign,
                baseline: this.textBaseline,
                font: this.font,
                spacing: this.letterSpacing,
            });
        },
    };
    const values = [100, 74, 23, 151];
    const rightEdges = [112, 92, 62, 162];
    const bars = rightEdges.map((x, index) => ({
        horizontal: true,
        getProps(properties, final) {
            assert.deepEqual(properties, ["x", "y", "base", "height"]);
            assert.equal(final, false);
            return { x, y: 40 + index * 50, base: 12, height: 32 };
        },
    }));
    chart.ctx = context;
    chart.chartArea = { left: 12, top: 10, right: 300, bottom: 220 };
    chart.data.datasets[0].data = values;
    chart.getDatasetMeta = () => ({ data: bars });
    chart.plugins[2].afterDatasetsDraw(chart);
    assert.deepEqual(texts, [
        { text: "100", x: 100, y: 40, color: "#ffffff", align: "right",
            baseline: "middle", font: '600 16px "Open Sans", sans-serif', spacing: "1px" },
        { text: "74", x: 80, y: 90, color: "#101010", align: "right",
            baseline: "middle", font: '600 16px "Open Sans", sans-serif', spacing: "1px" },
        { text: "23", x: 50, y: 140, color: "#101010", align: "right",
            baseline: "middle", font: '600 16px "Open Sans", sans-serif', spacing: "1px" },
        { text: "151", x: 150, y: 190, color: "#101010", align: "right",
            baseline: "middle", font: '600 16px "Open Sans", sans-serif', spacing: "1px" },
    ]);
});

test("cada controle atualiza as barras durante a digitação, sem recriar os gráficos", t => {
    const { chart, charts } = createCharts(t);
    replaceExpeditionRoutes([{
        code: "AT-TESTE", status: "Validated", corridor: "A-1",
        finalOrders: 1000, missortedOrders: 20,
    }]);
    const labeling = createInput("labelingErrors");
    const sorting = createInput("sortingErrors");
    const reverted = createInput("revertedErrors");
    labeling.type("12");
    sorting.type("8");
    reverted.type("5");
    assert.deepEqual(chart.data.datasets[0].data, [12, 8, 5, 15]);

    const assertAutomaticUpdate = (input, value) => {
        const previousUpdates = chart.updates;
        input.type(value);
        const analysis = getExpeditionErrorAnalysis();
        assert.ok(chart.updates > previousUpdates);
        assert.deepEqual(chart.data.datasets[0].data, [analysis.labelingErrors, analysis.sortingErrors,
            analysis.totalRevertedErrors, analysis.finalErrors]);
        assert.deepEqual(chart.data.datasets[0].backgroundColor, colors);
        assert.deepEqual(chart.data.labels, labels);
        assert.equal(charts.length, 2);
    };
    assertAutomaticUpdate(labeling, "4");
    assertAutomaticUpdate(sorting, "12");
    assertAutomaticUpdate(reverted, "10");
    assertAutomaticUpdate(reverted, "100");
    assert.equal(chart.data.datasets[0].data[2], 20);
    assert.equal(chart.data.datasets[0].data[3], 0);
    reverted.blur();
    assert.equal(getExpeditionState().revertedErrors, 20);

    const saved = getExpeditionState();
    resetExpeditionReport();
    assert.deepEqual(chart.data.datasets[0].data, [0, 0, 0, 0]);
    assert.equal(restoreExpeditionState(saved), true);
    assert.deepEqual(chart.data.datasets[0].data, [5, 15, 20, 0]);
});

test("controles aceitam somente dígitos, respeitam o limite e preservam o campo em edição", t => {
    const { chart } = createCharts(t);
    const input = createInput("labelingErrors");
    const document = { activeElement: input };
    replaceGlobal(t, "document", document);
    const unsubscribe = subscribeExpeditionState(state => {
        setExpeditionInputValue(input, state.errorTotals.labelingErrors);
    });
    t.after(unsubscribe);
    input.type("00012a");
    assert.equal(input.value, "00012");
    assert.equal(getExpeditionState().errorTotals.labelingErrors, 12);
    assert.deepEqual(chart.data.datasets[0].data, [12, 0, 0, 0]);
    input.type("");
    assert.equal(input.value, "");
    assert.equal(getExpeditionState().errorTotals.labelingErrors, 0);
    assert.deepEqual(chart.data.datasets[0].data, [0, 0, 0, 0]);
    input.type("123456789");
    assert.equal(input.value, "12345678");
    assert.equal(getExpeditionState().errorTotals.labelingErrors, 12345678);
    document.activeElement = null;
    updateExpeditionErrorQuantity("labelingErrors", 7);
    assert.equal(input.value, "7");
    assert.deepEqual(chart.data.datasets[0].data, [7, 0, 0, 0]);
});
