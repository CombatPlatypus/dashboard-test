import assert from "node:assert/strict";
import { test } from "node:test";
import { createReverseCompositionChart } from "../js/reports/reverse/charts.js";
import { createLossesRateCompositionChart } from "../js/reports/losses-rate/charts.js";
import { createDamageCompositionChart } from "../js/reports/damage-and-losses/charts.js";
import { createParcelCoverageChart } from "../js/reports/parcel-sweeper/charts.js";
import { createDoughnut3DGeometry, drawDoughnut3DCenterText } from "../js/reports/core/doughnut-3d.js";

test("as quatro roscas usam o tamanho e a qualidade da Reversa", t => {
    const previous = globalThis.window;
    globalThis.window = { Chart: class { constructor(canvas, config) { return config; } } };
    t.after(() => { globalThis.window = previous; });
    const reference = createReverseCompositionChart({});
    for (const createChart of [createLossesRateCompositionChart, createDamageCompositionChart, createParcelCoverageChart]) {
        const chart = createChart({});
        assert.deepEqual(chart.options.layout, reference.options.layout);
        assert.equal(chart.options.devicePixelRatio, reference.options.devicePixelRatio);
        assert.equal(chart.options.cutout, reference.options.cutout);
    }
    const referenceGeometry = createDoughnut3DGeometry({ left: 20, top: 10, right: 480, bottom: 259 });
    for (const [width, height] of [[500, 249], [800, 300], [1200, 400]]) {
        const geometry = createDoughnut3DGeometry({ left: 0, top: 0, right: width, bottom: height });
        assert.equal(geometry.outerRadius, referenceGeometry.outerRadius);
        assert.equal(geometry.depth, referenceGeometry.depth);
    }
    const narrow = createDoughnut3DGeometry({ left: 0, top: 0, right: 200, bottom: 249 });
    assert.ok(narrow.outerRadius < referenceGeometry.outerRadius);
});

test("texto central tem 14px, cor cinza, entrelinha 1 e espaçamento de 1px", t => {
    const previous = globalThis.window;
    globalThis.window = { getComputedStyle: () => ({ fontFamily: "Open Sans" }) };
    t.after(() => { globalThis.window = previous; });
    const texts = [];
    const ctx = { save() {}, restore() {}, fillText(text, x, y) {
        texts.push({ text, x, y, font: this.font, color: this.fillStyle, spacing: this.letterSpacing });
    } };
    drawDoughnut3DCenterText({ ctx, canvas: {} }, { centerX: 100, textCenterY: 100 }, { text: "79%", label: "Pacotes" });
    assert.equal(texts[1].y - texts[0].y, 14);
    assert.deepEqual(texts.map(value => [value.font, value.color, value.spacing]),
        Array(2).fill(["14px Open Sans", "#a8a9ad", "1px"]));
});
