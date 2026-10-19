import assert from "node:assert/strict";
import { test } from "node:test";
import { applyChartStandard } from "../js/charts/standard.js";
import { CHART_COLORS, CHART_VALUE_FONT, getChartPixelRatio } from "../js/charts/theme.js";
import { getHorizontalBarLabelPosition } from "../js/reports/core/horizontal-bars-3d.js";

test("padrão preserva categorias e valores, atualiza tonalidades e usa fonte e 3D compartilhados", () => {
    const values = [19, 11, 7, 3, 1];
    const labels = ["Azul", "Amarelo", "Verde", "Vermelho", "Neutro"];
    const config = applyChartStandard({ type: "bar", data: { labels, datasets: [{
        data: values, backgroundColor: ["#3F51B5", "#ffc107", "#4caf50", "#F44336", "#a0a4aa"],
    }] }, options: { indexAxis: "y", scales: { x: { ticks: { callback: value => value + " unidades" } } } } });
    assert.equal(config.data.labels, labels);
    assert.equal(config.data.datasets[0].data, values);
    assert.deepEqual(config.data.datasets[0].backgroundColor, [CHART_COLORS.blue, CHART_COLORS.yellow, CHART_COLORS.green, CHART_COLORS.red, "#a0a4aa"]);
    assert.equal(config.options.scales.x.ticks.font.size, 14);
    assert.equal(config.options.scales.y.ticks.font.size, 14);
    assert.equal(config.options.color, "#e4e6eb");
    assert.equal(config.options.scales.x.ticks.color, "#e4e6eb");
    assert.equal(config.options.scales.y.ticks.color, "#e4e6eb");
    assert.equal(config.options.plugins.legend.labels.color, "#e4e6eb");
    assert.equal(config.options.plugins.title.color, "#e4e6eb");
    assert.equal(config.options.plugins.tooltip.bodyColor, "#e4e6eb");
    assert.equal(config.options.scales.x.ticks.callback(19), "19 unidades");
    assert.equal(config.options.scales.x.grid.color({ tick: { value: 0 } }), "rgba(0, 0, 0, 0)");
    assert.equal(config.options.scales.y.border.display, false);
    assert.equal(config.data.datasets[0].barThickness, 24);
    assert.equal(CHART_VALUE_FONT, '600 15px "Open Sans", sans-serif');
    assert.deepEqual(getHorizontalBarLabelPosition({ getProps: () => ({ x: 100, y: 50, base: 20 }) }), { x: 120, y: 57 });
    applyChartStandard(config);
    assert.equal(config.plugins.filter(plugin => plugin.id === "dashboardHorizontalBars3D").length, 1);
    config.data.datasets[0].backgroundColor = ["#f0ad4e", "#8BC34A"];
    config.plugins.find(plugin => plugin.id === "dashboardPalette").beforeUpdate({ data: config.data });
    assert.deepEqual(config.data.datasets[0].backgroundColor, [CHART_COLORS.yellow, CHART_COLORS.green]);
});

test("linhas mantêm o tipo e a precisão e barras agrupadas ganham a projeção vertical", () => {
    const config = applyChartStandard({ type: "line", data: { datasets: [{ data: [.00025, .0003] }] },
        options: { scales: { y: { ticks: { font: { size: 11 }, callback: value => value.toFixed(5) } } } } });
    assert.equal(config.type, "line");
    assert.equal(config.options.scales.y.ticks.callback(.00025), "0.00025");
    assert.ok(!config.plugins.some(plugin => /Bars3D/.test(plugin.id)));
    const grouped = applyChartStandard({ type: "bar", data: { labels: ["Rua A"], datasets: [
        { data: [10], backgroundColor: CHART_COLORS.yellow }, { data: [5], backgroundColor: CHART_COLORS.red },
    ] } });
    assert.equal(grouped.data.datasets.length, 2);
    assert.ok(grouped.plugins.some(plugin => plugin.id === "dashboardVerticalBars3D"));
});

test("densidade mínima 2x respeita telas com densidade maior", t => {
    const previous = globalThis.window;
    t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
    for (const [screen, expected] of [[1, 2], [1.25, 2], [2, 2], [3, 3]]) {
        globalThis.window = { devicePixelRatio: screen };
        assert.equal(getChartPixelRatio(), expected);
    }
});
