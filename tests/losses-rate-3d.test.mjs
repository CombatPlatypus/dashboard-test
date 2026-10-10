import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
    createLossesRateCompositionChart,
    createLossesRateHistoryChart,
    initializeLossesRateCharts,
} from "../js/reports/losses-rate/charts.js";
import {
    resetLossesRateReport,
    restoreLossesRateState,
    setActiveLossesRateMonth,
} from "../js/reports/losses-rate/state.js";
import { createDoughnut3DSegments } from "../js/reports/core/doughnut-3d.js";
import { drawParcelCoverage3D } from "../js/reports/parcel-sweeper/coverage-3d.js";
import { drawDoughnut3D } from "../js/reports/core/doughnut-3d.js";

const colors = ["#d9534f", "#f0ad4e", "#8b8d91"];

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

function createCanvasContext() {
    const context = { texts: [], gradients: [], balance: 0, fills: 0 };
    context.save = () => { context.balance += 1; };
    context.restore = () => { context.balance -= 1; };
    context.beginPath = context.closePath = context.stroke = context.ellipse = () => {};
    context.fill = () => { context.fills += 1; };
    context.fillText = (...args) => context.texts.push(args);
    context.createLinearGradient = () => {
        const stops = [];
        context.gradients.push(stops);
        return { addColorStop: (...args) => stops.push(args) };
    };
    return context;
}

test("composição 3D mantém as cores e remove legenda e indicadores automáticos", t => {
    replaceGlobal(t, "window", { Chart: class { constructor(canvas, config) { return config; } } });
    const config = createLossesRateCompositionChart({});
    assert.equal(config.type, "doughnut");
    assert.deepEqual(config.data.labels, ["LOST", "AVARIA", "POSSÍVEIS PERDAS"]);
    assert.deepEqual(config.data.datasets[0].backgroundColor, colors);
    assert.equal(config.options.plugins.legend.display, false);
    assert.equal(config.options.plugins.tooltip.enabled, false);
    assert.deepEqual(config.options.events, []);
    assert.equal(config.options.animation, false);
    assert.deepEqual(config.plugins.map(plugin => plugin.id), [
        "losses-rate-composition-3d", "lossesRateCenterText",
    ]);
    assert.equal(drawParcelCoverage3D, drawDoughnut3D);
});

test("projeção preserva proporções e desenha somente o total no centro", t => {
    replaceGlobal(t, "window", {
        Chart: class { constructor(canvas, config) { return config; } },
        getComputedStyle: () => ({ fontFamily: "Open Sans" }),
    });
    const config = createLossesRateCompositionChart({});
    const [projection, center] = config.plugins;
    for (const values of [[10, 20, 70], [0, 17, 115], [100, 0, 0], [0, 0, 100], [0, 0, 0]]) {
        const context = createCanvasContext();
        const chart = { ctx: context, canvas: {},
            chartArea: { left: 0, top: 10, right: 450, bottom: 254 },
            data: { datasets: [{ data: values, backgroundColor: colors }] } };
        assert.equal(projection.beforeDatasetDraw(chart, { index: 1 }), undefined);
        assert.equal(projection.beforeDatasetDraw(chart, { index: 0 }), false);
        const total = values.reduce((sum, value) => sum + value, 0);
        center.afterDraw(chart, {}, { text: String(total), label: "Ocorrências" });
        const geometry = chart.$lossesRateCompositionGeometry;
        assert.deepEqual(context.texts, [
            [String(total), geometry.centerX, geometry.textCenterY - 8],
            ["Ocorrências", geometry.centerX, geometry.textCenterY + 16],
        ]);
        assert.equal(context.balance, 0);
        assert.ok(context.fills > 2);
        const segments = createDoughnut3DSegments(values);
        for (const segment of segments) {
            assert.ok(Math.abs((segment.endAngle - segment.startAngle) / (2 * Math.PI)
                - values[segment.index] / total) < 1e-12);
            assert.ok(context.gradients.some(stops => stops.some(([offset, color]) =>
                offset === 0.5 && color === colors[segment.index])));
        }
    }
    const context = createCanvasContext();
    center.afterDraw({ ctx: context }, {}, { text: "—" });
    assert.deepEqual(context.texts, []);
});

test("histórico de taxa de perdas continua como linha com os indicadores existentes", t => {
    replaceGlobal(t, "window", { Chart: class { constructor(canvas, config) { return config; } } });
    const history = createLossesRateHistoryChart({});
    assert.equal(history.type, "line");
    assert.equal(history.data.labels.length, 12);
    assert.deepEqual(history.plugins.map(plugin => plugin.id), [
        "lossesRateMaximumReference", "lossesRateHistoryLabels",
    ]);
    assert.equal(history.data.datasets[0].borderColor, "#e4e6eb");
    assert.equal(history.options.animation.duration, 250);
    assert.equal(history.options.scales.y.ticks.callback(0.03), "0,030%");
});

test("troca de mês, restauração e limpeza atualizam a composição sem recriar gráficos", t => {
    class Element {
        constructor(id) { this.id = id; this.dataset = {}; this.textContent = ""; }
        closest() { return null; }
    }
    class Canvas extends Element {}
    const elements = [new Element("losses-rate"), new Element("lossesRateCompositionMonth"),
        new Element("lossesRateHistoryYear"), new Canvas("lossesRateCompositionChart"),
        new Canvas("lossesRateHistoryChart"), new Element("lossesRateCompositionPossibleLosses"),
        new Element("lossesRateCompositionLost"), new Element("lossesRateCompositionDamage")];
    const indicatorValues = () => elements.slice(5).map(element => element.textContent);
    const panel = elements[0];
    panel.querySelector = selector => elements.find(element => `#${element.id}` === selector);
    replaceGlobal(t, "HTMLElement", Element);
    replaceGlobal(t, "HTMLCanvasElement", Canvas);
    replaceGlobal(t, "MutationObserver", class { observe() {} });
    const charts = [];
    replaceGlobal(t, "window", { Chart: class {
        constructor(canvas, config) {
            Object.assign(this, config);
            this.canvas = canvas;
            this.updates = 0;
            charts.push(this);
        }
        update() { this.updates += 1; }
    } });
    const months = Array.from({ length: 12 }, () => ({}));
    months[9] = { moved: 100000, lost: 0, damage: 17, possibleLosses: 115 };
    months[10] = { moved: 100000, lost: 10, damage: 20, possibleLosses: 70 };
    months[11] = { moved: 100000, lost: 0, damage: 0, possibleLosses: 0 };
    restoreLossesRateState({ activeMonth: 9, year: 2026, months });
    assert.equal(initializeLossesRateCharts(panel), true);
    assert.equal(initializeLossesRateCharts(panel), true);
    assert.equal(charts.length, 2);
    const composition = charts[0];
    assert.deepEqual(composition.data.datasets[0].data, [0, 17, 115]);
    assert.equal(composition.options.plugins.lossesRateCenterText.text, "132");
    assert.equal(elements[1].textContent, "Outubro");
    assert.deepEqual(indicatorValues(), ["115 (87%)", "0 (0%)", "17 (13%)"]);
    setActiveLossesRateMonth(10);
    assert.deepEqual(composition.data.datasets[0].data, [10, 20, 70]);
    assert.equal(composition.options.plugins.lossesRateCenterText.text, "100");
    assert.equal(elements[1].textContent, "Novembro");
    assert.deepEqual(indicatorValues(), ["70 (70%)", "10 (10%)", "20 (20%)"]);
    setActiveLossesRateMonth(11);
    assert.equal(composition.options.plugins.lossesRateCenterText.text, "0");
    assert.deepEqual(indicatorValues(), ["0 (0%)", "0 (0%)", "0 (0%)"]);
    setActiveLossesRateMonth(0);
    assert.equal(composition.options.plugins.lossesRateCenterText.text, "—");
    assert.deepEqual(indicatorValues(), ["—", "—", "—"]);
    restoreLossesRateState({ activeMonth: 9, year: 2026, months });
    assert.equal(composition.options.plugins.lossesRateCenterText.text, "132");
    assert.deepEqual(indicatorValues(), ["115 (87%)", "0 (0%)", "17 (13%)"]);
    months[9] = { possibleLosses: 2185, lost: 0 };
    restoreLossesRateState({ activeMonth: 9, year: 2026, months });
    assert.deepEqual(indicatorValues(), ["2.185 (100%)", "0 (0%)", "—"]);
    months[9] = { moved: 100000, possibleLosses: 200, lost: 127, damage: 7 };
    restoreLossesRateState({ activeMonth: 9, year: 2026, months });
    assert.equal(composition.options.plugins.lossesRateCenterText.text, "334");
    assert.deepEqual(indicatorValues(), ["200 (60%)", "127 (38%)", "7 (2%)"]);
    resetLossesRateReport();
    assert.deepEqual(composition.data.datasets[0].data, [0, 0, 0]);
    assert.equal(composition.options.plugins.lossesRateCenterText.text, "—");
    assert.deepEqual(indicatorValues(), ["—", "—", "—"]);
    assert.deepEqual(composition.data.datasets[0].backgroundColor, colors);
    assert.equal(charts.length, 2);
});

test("indicadores do HTML estão ligados aos três campos com as cores originais", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const composition = html.match(/<div class="tabs-panel" id="losses-rate">([\s\S]*?)<!-- RELATÓRIO DO PARCEL -->/)[1];
    for (const [color, label, id] of [
        ["#8b8d91", "Possíveis Perdas", "lossesRateCompositionPossibleLosses"],
        ["#d9534f", "Lost", "lossesRateCompositionLost"],
        ["#f0ad4e", "Avaria", "lossesRateCompositionDamage"],
    ]) {
        assert.match(composition, new RegExp(`background-color: ${color};[\\s\\S]*?<p>${label} - <span id="${id}">—</span>`));
        assert.equal(html.split(`id="${id}"`).length - 1, 1);
    }
});

test("resumo reúne volume movimentado e perdas em uma única tabela", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const view = readFileSync(new URL("../js/reports/losses-rate/view.js", import.meta.url), "utf8");
    const preview = html.match(/<div class="preview-style" id="lossesRatePreview">([\s\S]*?)<div class="losses-rate-charts">/)[1];

    assert.equal((preview.match(/<table\b/g) || []).length, 1);
    assert.match(preview, /<th>Volume Movimentado<\/th>\s*<th>Possíveis Perdas<\/th>/);
    assert.match(preview, /id="lossesRatePreviewMoved">—<\/td>\s*<td id="lossesRatePreviewPossibleLosses">—<\/td>/);
    assert.doesNotMatch(preview, /Descrição|Código do Hub|Sub Regional|losses-rate-identification-table/);
    assert.doesNotMatch(view, /previewDescription|previewHubCode|previewSubRegional/);
});

test("notificação inicial orienta a geração do relatório de taxa de perdas", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const notifications = readFileSync(new URL("../js/reports/report-notifications.js", import.meta.url), "utf8");
    const message = "Importe a planilha de Avarias e Perdas para gerar o relatório de Taxa de Perdas.";

    assert.match(html, new RegExp(`<h4 id="lossesRateNotificationText">\\s*${message.replaceAll(".", "\\.")}\\s*</h4>`));
    assert.ok(notifications.includes(`"${message}"`));
    assert.doesNotMatch(html, /os dois relatórios serão atualizados/);
    assert.doesNotMatch(notifications, /os dois relatórios serão atualizados/);
});
