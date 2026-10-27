import assert from "node:assert/strict";
import { test } from "node:test";
import { applyChartStandard, createDashboardChart } from "../js/charts/standard.js";
import { getChartTheme } from "../js/charts/theme.js";
import { drawHorizontalBar3DBase } from "../js/reports/core/horizontal-bars-3d.js";
import { drawDoughnut3D } from "../js/reports/core/doughnut-3d.js";

function useTheme(t) {
    const colors = new Map([
        ["--color-border", "#8c43c7"], ["--color-container", "#230c36"],
        ["--color-container-focus", "#40175f"],
    ]);
    for (const [key, value] of Object.entries({
        document: { documentElement: {} },
        getComputedStyle: () => ({ getPropertyValue: name => colors.get(name) ?? "" }),
    })) {
        const previous = Object.getOwnPropertyDescriptor(globalThis, key);
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
        t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
    }
    return colors;
}

test("eixos e grades seguem as bordas ao trocar o tema sem alterar séries, limites ou grades ocultas", t => {
    const colors = useTheme(t);
    const values = [12, 28];
    const dataset = { data: values, borderColor: "#007A48", backgroundColor: "#2538a5" };
    for (const indexAxis of ["x", "y"]) {
        const chart = applyChartStandard({ type: "bar", data: { datasets: [dataset] },
            options: { indexAxis, scales: { x: { max: 50 }, y: { grid: { display: false } } } } });
        const x = chart.options.scales.x;
        assert.equal(x.grid.color({ tick: { value: 10 } }), "#8c43c7");
        assert.equal(x.border.color(), "#8c43c7");
        assert.equal(x.max, 50);
        assert.equal(chart.options.scales.y.grid.display, false);
        colors.set("--color-border", "#31a66a");
        assert.equal(x.grid.color({ tick: { value: 10 } }), "#31a66a");
        if (indexAxis === "y") assert.equal(x.grid.color({ tick: { value: 0 } }), "rgba(0, 0, 0, 0)");
        assert.equal(dataset.data, values);
        assert.equal(dataset.backgroundColor, "#2538a5");
        assert.equal(dataset.borderColor, "#007A48");
        colors.set("--color-border", "#8c43c7");
    }
});

test("bases e roscas vazias usam a superfície e o contraste do tema; fatias com dados preservam suas cores", t => {
    const colors = useTheme(t);
    const fills = [], strokes = [], stops = [];
    const ctx = {
        save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, ellipse() {},
        fill() { fills.push(this.fillStyle); }, stroke() { strokes.push(this.strokeStyle); },
        createLinearGradient() { return { addColorStop: (offset, color) => stops.push(color) }; },
    };
    const area = { left: 0, right: 400, top: 0, bottom: 250 };
    for (const [border, surface] of [["#8c43c7", "#40175f"], ["#31a66a", "#105b34"]]) {
        colors.set("--color-border", border);
        colors.set("--color-container-focus", surface);
        drawHorizontalBar3DBase(ctx, { left: 20, top: 20, bottom: 200 });
        assert.equal(fills.at(-1), surface);
        assert.equal(strokes.at(-1), border);
        stops.length = 0;
        drawDoughnut3D({ context: ctx, area, values: [0, 0], colors: ["#007A48", "#8B0000"] });
        assert.ok(stops.includes(border));
        assert.notEqual(border, getChartTheme().background);
        stops.length = 0;
        drawDoughnut3D({ context: ctx, area, values: [12, 28], colors: ["#007A48", "#8B0000"] });
        assert.ok(stops.includes("#007A48") && stops.includes("#8B0000"));
        assert.ok(!stops.includes(border));
    }
});

test("a troca de tema redesenha instâncias existentes uma vez, sem recriar os gráficos", t => {
    useTheme(t);
    const previous = { window: globalThis.window, MutationObserver: globalThis.MutationObserver };
    t.after(() => {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
        }
    });
    let callback, observers = 0;
    globalThis.MutationObserver = class {
        constructor(handler) { callback = handler; observers += 1; }
        observe(root, options) { assert.equal(root, document.documentElement);
            assert.ok(options.attributeFilter.includes("data-theme")); }
    };
    const updates = [];
    globalThis.window = { Chart: class {
        static instances = {};
        constructor(canvas, config) { this.canvas = canvas; this.config = config;
            window.Chart.instances[canvas.id] = this; }
        update(mode) { updates.push([this.canvas.id, mode]); }
    } };
    const first = createDashboardChart({ id: "primeiro" }, { type: "line" });
    const second = createDashboardChart({ id: "segundo" }, { type: "doughnut" });
    callback();
    assert.equal(observers, 1);
    assert.deepEqual(updates, [["primeiro", "none"], ["segundo", "none"]]);
    assert.equal(window.Chart.instances.primeiro, first);
    assert.equal(window.Chart.instances.segundo, second);
});
