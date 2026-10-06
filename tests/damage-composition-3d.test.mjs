import assert from "node:assert/strict";
import { test } from "node:test";
import {
    createDamageCompositionChart,
    initializeDamageAndLossesCharts,
} from "../js/reports/damage-and-losses/charts.js";
import {
    replaceDamageAndLossesData,
    resetDamageAndLossesState,
} from "../js/reports/damage-and-losses/state.js";

const colors = ["#F44336", "#ff9800", "#3F51B5"];

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

test("composição de avarias usa a projeção 3D e mantém as cores, sem rótulos nas fatias", t => {
    replaceGlobal(t, "window", { Chart: class { constructor(canvas, config) { return config; } } });
    const config = createDamageCompositionChart({});
    assert.deepEqual(config.data.datasets[0].backgroundColor, colors);
    assert.deepEqual(config.data.labels, ["Avaria Sólida", "Avaria Líquida", "Avaria de Vidro"]);
    assert.equal(config.options.plugins.legend.display, false);
    assert.equal(config.options.plugins.tooltip.enabled, false);
    assert.equal(config.options.animation, false);
    assert.deepEqual(config.options.events, []);
    assert.deepEqual(config.plugins.map(plugin => plugin.id), [
        "damage-composition-3d", "damageCompositionCenter",
    ]);
});

test("texto central fica frontal à projeção, inclusive com categoria única ou sem dados", t => {
    replaceGlobal(t, "window", {
        Chart: class { constructor(canvas, config) { return config; } },
        getComputedStyle: () => ({ fontFamily: "Open Sans" }),
    });
    const [projection, center] = createDamageCompositionChart({}).plugins;
    for (const data of [[2, 4, 2], [0, 100, 0], [0, 0, 0]]) {
        const ctx = { texts: [], fills: 0, balance: 0 };
        ctx.save = () => { ctx.balance += 1; };
        ctx.restore = () => { ctx.balance -= 1; };
        ctx.beginPath = ctx.closePath = ctx.ellipse = ctx.stroke = () => {};
        ctx.fill = () => { ctx.fills += 1; };
        ctx.fillText = (...args) => ctx.texts.push(args);
        ctx.createLinearGradient = () => ({ addColorStop() {} });
        const chart = { ctx, canvas: {}, chartArea: { left: 12, top: 12, right: 488, bottom: 242 },
            data: { datasets: [{ data, backgroundColor: colors }] } };
        assert.equal(projection.beforeDatasetDraw(chart, { index: 1 }), undefined);
        assert.equal(projection.beforeDatasetDraw(chart, { index: 0 }), false);
        const text = String(data.reduce((sum, quantity) => sum + quantity, 0));
        center.afterDraw(chart, {}, { text, label: "Classificadas" });
        const geometry = chart.$damageCompositionGeometry;
        assert.deepEqual(ctx.texts, [[text, geometry.centerX, geometry.textCenterY - 8],
            ["Classificadas", geometry.centerX, geometry.textCenterY + 16]]);
        assert.ok(ctx.fills > 2);
        assert.equal(ctx.balance, 0);
    }
});

test("gráfico e indicadores acompanham período, importação, restauração e limpeza", t => {
    class Element {
        constructor(id) {
            this.id = id; this.dataset = {}; this.style = {}; this.textContent = "";
            this.listeners = {}; this.classList = { toggle() {} };
        }
        setAttribute(name, value) { this[name] = value; }
        addEventListener(name, handler) { this.listeners[name] = handler; }
    }
    class Canvas extends Element { constructor(id) { super(id); this.parentElement = new Element(); } }
    class Button extends Element { closest() { return this; } }
    const panel = new Element("damage-and-losses");
    const elements = [new Canvas("damageLastSevenDaysChart"), new Canvas("damageCompositionChart"),
        new Canvas("damageSocChart"), new Element("damageChartPeriodTitle"),
        new Element("damageChartPeriodSelector"), new Element("damageSolidValue"),
        new Element("damageLiquidValue"), new Element("damageGlassValue")];
    const buttons = ["last7", "days8to14", "monthStart", "totalMonth"].map(period => {
        const button = new Button(); button.dataset.damageChartPeriod = period; return button;
    });
    const selector = elements[4];
    selector.querySelectorAll = () => buttons;
    panel.querySelector = selector => elements.find(element => `#${element.id}` === selector);
    replaceGlobal(t, "HTMLElement", Element);
    replaceGlobal(t, "HTMLCanvasElement", Canvas);
    replaceGlobal(t, "HTMLButtonElement", Button);
    replaceGlobal(t, "MutationObserver", class { observe() {} });
    replaceGlobal(t, "document", { getElementById: id => elements.find(element => element.id === id) });
    const charts = [];
    replaceGlobal(t, "window", { Chart: class {
        constructor(canvas, config) { Object.assign(this, config); this.canvas = canvas; charts.push(this); }
        update() {} resize() {}
    } });
    const data = { monthIndex: 9, year: 2026, days: [
        { date: "2026-10-01", hub: 16, soc: 0, solid: 8, liquid: 4, glass: 4 },
        { date: "2026-10-10", hub: 8, soc: 0, solid: 2, liquid: 4, glass: 2 },
    ] };
    replaceDamageAndLossesData(data);
    assert.equal(initializeDamageAndLossesCharts(panel), true);
    assert.equal(initializeDamageAndLossesCharts(panel), true);
    assert.equal(charts.length, 3);
    assert.equal(charts[0].type, "bar");
    assert.equal(charts[2].type, "bar");
    const composition = charts[1];
    const values = () => elements.slice(5).map(element => element.textContent);
    assert.deepEqual(composition.data.datasets[0].data, [2, 4, 2]);
    assert.equal(composition.options.plugins.damageCompositionCenter.text, "8");
    assert.deepEqual(values(), ["2 (25%)", "4 (50%)", "2 (25%)"]);
    selector.listeners.click({ target: buttons[1] });
    assert.deepEqual(composition.data.datasets[0].data, [8, 4, 4]);
    assert.deepEqual(values(), ["8 (50%)", "4 (25%)", "4 (25%)"]);
    selector.listeners.click({ target: buttons[3] });
    assert.deepEqual(composition.data.datasets[0].data, [10, 8, 6]);
    assert.equal(composition.options.plugins.damageCompositionCenter.text, "24");
    assert.deepEqual(values(), ["10 (42%)", "8 (33%)", "6 (25%)"]);
    replaceDamageAndLossesData({ monthIndex: 9, year: 2026,
        days: [{ date: "2026-10-10", hub: 2185, liquid: 2185 }] });
    assert.deepEqual(values(), ["0 (0%)", "2.185 (100%)", "0 (0%)"]);
    replaceDamageAndLossesData(data);
    assert.deepEqual(values(), ["10 (42%)", "8 (33%)", "6 (25%)"]);
    resetDamageAndLossesState();
    assert.deepEqual(values(), ["—", "—", "—"]);
    assert.equal(composition.options.plugins.damageCompositionCenter.text, "—");
    assert.deepEqual(composition.data.datasets[0].data, [0, 0, 0]);
    assert.deepEqual(composition.data.datasets[0].backgroundColor, colors);
});
