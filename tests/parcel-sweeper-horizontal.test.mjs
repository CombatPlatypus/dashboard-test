import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
    createParcelColumnDistribution,
    createParcelRow,
    createParcelSummary,
} from "../js/reports/parcel-sweeper/model.js";
import {
    createParcelHorizontalChart,
    getParcelHorizontalChartHeight,
    updateParcelHorizontalChart,
} from "../js/reports/parcel-sweeper/horizontal-charts.js";
import { initializeParcelCharts } from "../js/reports/parcel-sweeper/charts.js";
import { replaceParcelRows, resetParcelReport } from "../js/reports/parcel-sweeper/state.js";

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

test("distribuições incluem todas as linhas, inclusive não bipadas e operadores ignorados", () => {
    const rows = [
        { scannedStatus: "LMHub_Received", operator: "[Ops1]ANA", finalStatus: "LMHub_Received", nextStepAction: "Process for delivery" },
        { scannedStatus: "-", operator: "", finalStatus: "SOC_Packed", nextStepAction: "-" },
        { scannedStatus: "LMHub_Received", operator: "outro@empresa.com", finalStatus: "LMHub_Received", nextStepAction: "Put in EHA" },
        { scannedStatus: "LMHub_Received", operator: "[Ops1]ANA", finalStatus: "Return_LMHub_Packed", nextStepAction: "Process for delivery" },
    ].map((row, index) => createParcelRow({ ...row, trackingNumber: `BR${index}` }));
    const summary = createParcelSummary(rows);
    assert.equal(summary.scannedStatusDistribution[0].label, "LMHub_Received");
    assert.equal(summary.scannedStatusDistribution[0].count, 3);
    assert.equal(summary.finalStatusDistribution[0].label, "LMHub_Received");
    assert.equal(summary.finalStatusDistribution[0].count, 2);
    assert.deepEqual(summary.nextStepActionDistribution, [
        { label: "Process for delivery", count: 2, percentage: 0.5 },
        { label: "-", count: 1, percentage: 0.25 },
        { label: "Put in EHA", count: 1, percentage: 0.25 },
    ]);
    for (const distribution of [summary.scannedStatusDistribution, summary.finalStatusDistribution, summary.nextStepActionDistribution]) {
        assert.equal(distribution.reduce((sum, item) => sum + item.count, 0), 4);
        assert.equal(distribution.reduce((sum, item) => sum + item.percentage, 0), 1);
    }
    const corrected = createParcelSummary(rows, { "[ops1]ana": true });
    assert.deepEqual(corrected.scannedStatusDistribution, summary.scannedStatusDistribution);
    assert.deepEqual(corrected.finalStatusDistribution, summary.finalStatusDistribution);
    assert.deepEqual(corrected.nextStepActionDistribution, summary.nextStepActionDistribution);
});

test("Next Step Action agrupa nomes equivalentes e valores ausentes sem perder pacotes", () => {
    const rows = [
        { nextStepAction: "  Process for delivery  " }, { nextStepAction: "process for delivery" },
        { nextStepAction: "Put in EHA" }, { nextStepAction: "" }, {}, { nextStepAction: "-" },
    ];
    assert.deepEqual(createParcelColumnDistribution(rows, "nextStepAction"), [
        { label: "-", count: 3, percentage: 0.5 },
        { label: "Process for delivery", count: 2, percentage: 2 / 6 },
        { label: "Put in EHA", count: 1, percentage: 1 / 6 },
    ]);
    assert.deepEqual(createParcelSummary([]).nextStepActionDistribution, []);
});

test("agrupa espaços, maiúsculas e vazios, preserva nomes oficiais e ordena quantidades", () => {
    const rows = Object.freeze([
        { finalStatus: "  LMHub_Received " }, { finalStatus: "lmhub_received" },
        { finalStatus: "SOC_Received" }, { finalStatus: "Return_LMHub_Packed" },
        { finalStatus: "" }, { finalStatus: "-" }, {}, { finalStatus: null },
    ].map(Object.freeze));
    assert.deepEqual(createParcelColumnDistribution(rows, "finalStatus"), [
        { label: "-", count: 4, percentage: 0.5 },
        { label: "LMHub_Received", count: 2, percentage: 0.25 },
        { label: "Return_LMHub_Packed", count: 1, percentage: 0.125 },
        { label: "SOC_Received", count: 1, percentage: 0.125 },
    ]);
    assert.equal(rows[0].finalStatus, "  LMHub_Received ");
    assert.deepEqual(createParcelColumnDistribution([], "finalStatus"), []);
    assert.deepEqual(createParcelColumnDistribution(null, "finalStatus"), []);
    assert.deepEqual(createParcelColumnDistribution(rows, "operator"), []);
    assert.equal(getParcelHorizontalChartHeight(0), 220);
    assert.equal(getParcelHorizontalChartHeight(4), 220);
    assert.equal(getParcelHorizontalChartHeight(10), 416);
});

test("barras horizontais seguem trilhos e valores do relatório de perdas, sem tooltips", t => {
    replaceGlobal(t, "window", { Chart: class { constructor(canvas, config) { return config; } } });
    const config = createParcelHorizontalChart({}, "#42A5F5");
    assert.equal(config.type, "bar");
    assert.equal(config.options.indexAxis, "y");
    assert.equal(config.options.animation, false);
    assert.deepEqual(config.options.events, []);
    assert.equal(config.options.plugins.tooltip.enabled, false);
    assert.equal(config.options.scales.y.ticks.autoSkip, false);
    assert.equal(config.options.scales.y.ticks.font.size, 14);
    assert.equal(config.data.datasets[0].barThickness, 24);
    const context = { rectangles: [], texts: [], balance: 0, letterSpacing: "0px", spacingStack: [],
        save() { this.balance += 1; this.spacingStack.push(this.letterSpacing); },
        restore() { this.balance -= 1; this.letterSpacing = this.spacingStack.pop(); },
        fillRect(...args) { this.rectangles.push(args); }, fillText(...args) { this.texts.push(args); } };
    const chart = { ctx: context, chartArea: { left: 100, right: 400 },
        $parcelHasDistribution: true, data: { datasets: [{ data: [2185, 30] }] },
        getDatasetMeta: () => ({ data: [40, 80].map(y => ({ getProps: () => ({ y, height: 24 }) })) }) };
    config.plugins.forEach(plugin => plugin.beforeLayout?.(chart));
    config.plugins.forEach(plugin => plugin.beforeDraw?.(chart));
    assert.equal(context.letterSpacing, "1px");
    config.plugins.forEach(plugin => plugin.beforeDatasetsDraw?.(chart));
    config.plugins.forEach(plugin => plugin.afterDatasetsDraw?.(chart));
    assert.equal(context.letterSpacing, "1px");
    assert.deepEqual(context.rectangles, [[100, 28, 300, 24], [100, 68, 300, 24]]);
    assert.deepEqual(context.texts, [["2.185", 412, 40], ["30", 412, 80]]);
    assert.equal(context.balance, 0);
    chart.$parcelHasDistribution = false;
    config.plugins.find(plugin => plugin.id === "parcelHorizontalValues").afterDatasetsDraw(chart);
    assert.equal(context.texts.at(-1)[0], "—");
});

test("largura dos indicadores inclui letter-spacing e todos os nomes, sem o corte automático do eixo", t => {
    replaceGlobal(t, "window", { Chart: class { constructor(canvas, config) { return config; } } });
    const config = createParcelHorizontalChart({}, "#3F51B5");
    const context = {
        letterSpacing: "0px", font: "10px Arial", stack: [], measurements: [],
        save() { this.stack.push({ letterSpacing: this.letterSpacing, font: this.font }); },
        restore() { Object.assign(this, this.stack.pop()); },
        measureText(text) {
            this.measurements.push({ text, letterSpacing: this.letterSpacing, font: this.font });
            return { width: text.length * (this.letterSpacing === "1px" ? 8 : 7) };
        },
    };
    const labels = ["LMHub_Received", "Return_SOC_LHTransported", "Process for liquidation"];
    const scale = { ctx: context, width: 80, options: config.options.scales.y,
        ticks: labels.map(label => ({ label })) };
    config.options.scales.y.afterFit(scale);
    assert.equal(scale.width, Math.max(...labels.map(label => label.length * 8)) + 32);
    assert.ok(context.measurements.every(item => item.letterSpacing === "1px" && item.font.includes("14px")));
    assert.deepEqual(scale.ticks.map(tick => tick.label), labels);
    assert.equal(context.letterSpacing, "0px");
    assert.equal(context.font, "10px Arial");
    scale.width = 40;
    scale.ticks = [{ label: "—" }];
    config.options.scales.y.afterFit(scale);
    assert.equal(scale.width, 40);
});

test("atualização limpa dados antigos, adapta altura e reserva espaço para quantidades grandes", t => {
    replaceGlobal(t, "window", { Chart: class { constructor(canvas, config) { return config; } } });
    const chart = createParcelHorizontalChart({}, "#42A5F5");
    let updates = 0, resizes = 0;
    const attributes = {};
    chart.canvas = { parentElement: { style: { height: "220px" } }, setAttribute: (name, value) => { attributes[name] = value; } };
    chart.update = () => { updates += 1; };
    chart.resize = () => { resizes += 1; };
    updateParcelHorizontalChart(chart, [{ label: "LMHub_Received", count: 10000000 }, { label: "-", count: 20 }], {
        title: "Final Status", color: "#42A5F5", height: 416,
    });
    assert.deepEqual(chart.data.datasets[0].data, [10000000, 20]);
    assert.deepEqual(chart.data.datasets[0].backgroundColor, ["#42A5F5", "#a8a9ad"]);
    assert.equal(chart.canvas.parentElement.style.height, "416px");
    assert.ok(chart.options.layout.padding.right >= 90);
    assert.match(attributes["aria-label"], /LMHub_Received: 10\.000\.000; -: 20/);
    updateParcelHorizontalChart(chart, [], { title: "Final Status", color: "#42A5F5", height: 220 });
    assert.deepEqual(chart.data.labels, ["—"]);
    assert.deepEqual(chart.data.datasets[0].data, [0]);
    assert.equal(chart.$parcelHasDistribution, false);
    assert.equal(chart.options.scales.x.suggestedMax, 1);
    assert.equal(chart.canvas.parentElement.style.height, "220px");
    assert.equal(attributes["aria-label"], "Final Status: sem pacotes importados.");
    assert.equal(updates, 2);
    assert.equal(resizes, 2);
});

test("os cinco gráficos inicializam uma vez e atualizam na importação, troca de painel e limpeza", t => {
    class Element { constructor() { this.dataset = {}; this.style = {}; } }
    class Canvas extends Element {
        constructor(id) { super(); this.id = id; this.parentElement = new Element(); }
        setAttribute(name, value) { this[name] = value; }
    }
    const panel = new Element();
    panel.id = "parcel";
    panel.classList = { contains: () => true };
    const canvases = ["parcelCoverageChart", "parcelAgingChart", "parcelScannedStatusChart", "parcelFinalStatusChart", "parcelNextStepActionChart"]
        .map(id => new Canvas(id));
    panel.querySelector = selector => canvases.find(canvas => `#${canvas.id}` === selector);
    const charts = [];
    replaceGlobal(t, "HTMLElement", Element);
    replaceGlobal(t, "HTMLCanvasElement", Canvas);
    let visibilityChanged;
    replaceGlobal(t, "MutationObserver", class { constructor(callback) { visibilityChanged = callback; } observe() {} disconnect() {} });
    replaceGlobal(t, "window", { requestAnimationFrame: callback => callback(), Chart: class {
        constructor(canvas, config) { Object.assign(this, config); this.canvas = canvas; charts.push(this); }
        resize() { this.resizes = (this.resizes ?? 0) + 1; } update() {}
    } });
    assert.equal(initializeParcelCharts(panel), true);
    assert.equal(initializeParcelCharts(panel), true);
    assert.equal(charts.length, 5);
    assert.equal(charts[1].data.datasets[0].backgroundColor, "#3F51B5");
    replaceParcelRows([
        { trackingNumber: "BR1", scannedStatus: "LMHub_Received", finalStatus: "LMHub_Received", nextStepAction: "Process for delivery" },
        { trackingNumber: "BR2", scannedStatus: "-", finalStatus: "LMHub_Received", nextStepAction: "Put in EHA" },
        { trackingNumber: "BR3", scannedStatus: "LMHub_Received", finalStatus: "SOC_Packed", nextStepAction: "" },
    ]);
    assert.equal(charts[2].canvas.id, "parcelScannedStatusChart");
    assert.equal(charts[3].canvas.id, "parcelFinalStatusChart");
    assert.deepEqual(charts[2].data.labels, ["LMHub_Received", "-"]);
    assert.deepEqual(charts[2].data.datasets[0].data, [2, 1]);
    assert.deepEqual(charts[2].data.datasets[0].backgroundColor, ["#3F51B5", "#a8a9ad"]);
    assert.match(charts[2].canvas["aria-label"], /Quantidade de pacotes por Scanned Status/);
    assert.deepEqual(charts[3].data.labels, ["LMHub_Received", "SOC_Packed"]);
    assert.deepEqual(charts[3].data.datasets[0].data, [2, 1]);
    assert.deepEqual(charts[3].data.datasets[0].backgroundColor, ["#3F51B5", "#3F51B5"]);
    assert.match(charts[3].canvas["aria-label"], /Quantidade de pacotes por Final Status/);
    assert.equal(charts[1].data.datasets[0].backgroundColor, "#3F51B5");
    assert.equal(charts[1].data.datasets[0].data.length, 7);
    assert.equal(charts[4].canvas.id, "parcelNextStepActionChart");
    assert.equal(charts[4].type, "bar");
    assert.equal(charts[4].options.indexAxis ?? "x", "x");
    assert.deepEqual(charts[4].options, charts[1].options);
    assert.deepEqual(charts[4].plugins, charts[1].plugins);
    assert.deepEqual(charts[4].data.labels, [["-", "33,3%"], ["Process for delivery", "33,3%"], ["Put in EHA", "33,3%"]]);
    assert.deepEqual(charts[4].data.datasets[0].data, [1, 1, 1]);
    assert.equal(charts[4].data.datasets[0].backgroundColor, "#3F51B5");
    assert.match(charts[4].canvas["aria-label"], /Process for delivery: 1; Put in EHA: 1/);
    const resizeCount = charts[4].resizes ?? 0;
    visibilityChanged();
    assert.equal(charts[4].resizes, resizeCount + 1);
    replaceParcelRows([
        { trackingNumber: "BR4", nextStepAction: "Reroute to correct station" },
        { trackingNumber: "BR5", nextStepAction: "Reroute to correct station" },
    ]);
    assert.deepEqual(charts[4].data.labels, [["Reroute to correct", "station", "100,0%"]]);
    assert.deepEqual(charts[4].data.datasets[0].data, [2]);
    resetParcelReport();
    assert.deepEqual(charts[2].data.labels, ["—"]);
    assert.deepEqual(charts[3].data.datasets[0].data, [0]);
    assert.equal(charts[1].data.datasets[0].backgroundColor, "#3F51B5");
    assert.deepEqual(charts[4].data.labels, []);
    assert.deepEqual(charts[4].data.datasets[0].data, []);
    assert.match(charts[4].canvas["aria-label"], /sem pacotes importados/);
});

test("HTML mantém os dois status juntos e Next Step Action como gráfico vertical logo abaixo", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const parcel = html.match(/<div class="tabs-panel" id="parcel">([\s\S]*?)<!-- RELATÓRIO ANÁLISE GERAL -->/)[1];
    assert.match(parcel, /id="parcelStatusCharts"/);
    for (const name of ["ScannedStatus", "FinalStatus"]) {
        assert.match(parcel, new RegExp(`id="parcel${name}ChartContainer"`));
        assert.match(parcel, new RegExp(`<canvas id="parcel${name}Chart" role="img" aria-label="[^"]+"`));
    }
    assert.ok(parcel.indexOf('id="parcelScannedStatusChart"') < parcel.indexOf('id="parcelFinalStatusChart"'));
    assert.match(parcel, /<h4>Distribuição por Scanned Status<\/h4>/);
    assert.match(parcel, /<h4>Distribuição por Final Status<\/h4>/);
    assert.match(parcel, /id="parcelFinalStatusChart"[^>]*><\/canvas>\s*<\/div>\s*<\/div>\s*<\/div>\s*<!-- GRÁFICO DE NEXT STEP ACTION -->\s*<div class="vertical-bars-chart">/);
    assert.match(parcel, /<h4>Distribuição por Next Step Action<\/h4>/);
    assert.match(parcel, /id="parcelNextStepActionChartContainer">\s*<div>\s*<canvas id="parcelNextStepActionChart" role="img" aria-label="[^"]+"/);
    assert.equal((parcel.match(/id="parcelNextStepActionChart"/g) ?? []).length, 1);
    assert.doesNotMatch(parcel, /id=""/);
});
