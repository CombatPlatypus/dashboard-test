import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
    createParcelCoverageGeometry,
    createParcelCoverageSegments,
    drawParcelCoverage3D,
} from "../js/reports/parcel-sweeper/coverage-3d.js";
import {
    createParcelAgingChartLabel,
    createParcelAgingChart,
    createParcelNextStepActionChartLabel,
    createParcelVerticalChart,
    createParcelCoverageChart,
} from "../js/reports/parcel-sweeper/charts.js";
import { formatParcelCoverageMetric, renderParcelOperatorTable } from "../js/reports/parcel-sweeper/view.js";

function createCanvasContext() {
    const context = { ellipses: [], fills: 0, texts: [], balance: 0 };
    context.save = () => { context.balance += 1; };
    context.restore = () => { context.balance -= 1; };
    context.beginPath = context.closePath = context.stroke = () => {};
    context.fill = () => { context.fills += 1; };
    context.ellipse = (...args) => context.ellipses.push(args);
    context.createLinearGradient = () => ({ addColorStop() {} });
    context.fillText = (...args) => context.texts.push(args);
    return context;
}

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

test("indicadores de cobertura mostram quantidade e percentual sobre o total esperado", () => {
    for (const [quantity, total, expected] of [
        [516, 702, "516 (73,50%)"], [186, 702, "186 (26,50%)"],
        [1606, 1988, "1.606 (80,78%)"], [382, 1988, "382 (19,22%)"],
        [200, 300, "200 (66,67%)"], [100, 300, "100 (33,33%)"],
        [5668, 10000, "5.668 (56,68%)"],
        [0, 300, "0 (0,00%)"], [300, 300, "300 (100,00%)"], [0, 0, "—"],
    ]) {
        assert.equal(formatParcelCoverageMetric(quantity, total), expected);
    }
});

test("centro e indicador de escaneados usam a mesma precisão e o mesmo total", t => {
    replaceGlobal(t, "window", { Chart: class { constructor(canvas, config) { return config; } } });
    const config = createParcelCoverageChart({});
    const projection = config.plugins.find(plugin => plugin.id === "parcel-coverage-3d");
    const center = config.plugins.find(plugin => plugin.id === "parcelCoverageCenterText");
    for (const [scanned, total] of [[516, 702], [1606, 1988], [200, 300], [5668, 10000], [0, 300], [300, 300], [0, 0]]) {
        const context = createCanvasContext();
        const chart = { ctx: context, chartArea: { left: 0, top: 0, right: 450, bottom: 270 },
            data: { datasets: [{ data: [scanned, total - scanned], backgroundColor: ["#3F51B5", "#e4e6eb"] }] },
            $parcelTotal: total, $parcelScanned: scanned };
        projection.beforeDatasetDraw(chart, { index: 0 });
        center.afterDraw(chart);
        const indicator = formatParcelCoverageMetric(scanned, total);
        assert.equal(total > 0 ? indicator.match(/\(([^)]+)\)$/)[1] : indicator, context.texts[0][0]);
    }
});

test("fatias 3D preservam a proporção real, inclusive 0% e 100%", () => {
    for (const scanned of [0, 1, 50, 67, 99, 100]) {
        const segments = createParcelCoverageSegments([scanned, 100 - scanned]);
        const angles = segments.reduce((sum, segment) =>
            sum + segment.endAngle - segment.startAngle, 0);
        assert.ok(Math.abs(angles - 2 * Math.PI) < 1e-12);
        const scannedSlice = segments.find(segment => segment.index === 0);
        assert.ok(Math.abs((scannedSlice
            ? (scannedSlice.endAngle - scannedSlice.startAngle) / (2 * Math.PI)
            : 0) - scanned / 100) < 1e-12);
    }
    assert.deepEqual(createParcelCoverageSegments([0, 0]), []);
    assert.deepEqual(createParcelCoverageSegments([NaN, -10, Infinity]), []);
    assert.deepEqual(createParcelCoverageSegments(null), []);
});

test("projeção reserva espaço para espessura em diferentes tamanhos", () => {
    for (const [width, height] of [[200, 130], [450, 270], [900, 270]]) {
        const area = { left: 15, top: 20, right: 15 + width, bottom: 20 + height };
        const g = createParcelCoverageGeometry(area);
        assert.ok(g.centerX - g.outerRadius >= area.left);
        assert.ok(g.centerX + g.outerRadius <= area.right);
        assert.ok(g.centerY - g.outerRadius * g.ellipseScale >= area.top);
        assert.ok(g.centerY + g.outerRadius * g.ellipseScale + g.depth <= area.bottom);
        assert.ok(g.innerRadius < g.outerRadius);
        assert.ok(g.textCenterY > g.centerY);
    }
    assert.equal(createParcelCoverageGeometry(null), null);
    assert.equal(createParcelCoverageGeometry({ left: 0, right: 0, top: 0, bottom: 0 }), null);
});

test("canvas desenha superfície, laterais e estado vazio sem perder o contexto", () => {
    for (const values of [[0, 0], [0, 100], [1, 99], [67, 33], [100, 0]]) {
        const context = createCanvasContext();
        const geometry = drawParcelCoverage3D({ context,
            area: { left: 0, top: 0, right: 450, bottom: 270 },
            values, colors: ["#3F51B5", "#e4e6eb"] });
        assert.ok(geometry);
        assert.ok(context.fills > 2);
        assert.equal(context.balance, 0);
        assert.ok(context.ellipses.every(args => args.slice(0, 7).every(Number.isFinite)));
        assert.ok(context.ellipses.every(args => args[2] > 0 && args[3] > 0));
    }
});

test("somente gráficos do Parcel desativam tooltips e hover; texto central fica frontal", t => {
    replaceGlobal(t, "window", { Chart: class { constructor(canvas, config) { return config; } } });
    const coverage = createParcelCoverageChart({});
    const aging = createParcelAgingChart({});
    assert.equal(aging.data.datasets[0].backgroundColor, "#3F51B5");
    for (const config of [coverage, aging]) {
        assert.equal(config.options.plugins.tooltip.enabled, false);
        assert.deepEqual(config.options.events, []);
    }
    const context = createCanvasContext();
    const chart = { ctx: context, chartArea: { left: 0, top: 0, right: 450, bottom: 270 },
        data: { datasets: [{ data: [2, 1], backgroundColor: ["#3F51B5", "#e4e6eb"] }] },
        $parcelTotal: 3, $parcelScanned: 2 };
    const plugin = coverage.plugins.find(item => item.id === "parcel-coverage-3d");
    assert.equal(plugin.beforeDatasetDraw(chart, { index: 0 }), false);
    assert.equal(plugin.beforeDatasetDraw(chart, { index: 1 }), undefined);
    coverage.plugins.find(item => item.id === "parcelCoverageCenterText").afterDraw(chart);
    assert.equal(context.texts[0][0], "66,67%");
    assert.equal(context.texts[1][0], "Bipados");
    assert.equal(context.balance, 0);
    assert.ok(!aging.plugins.some(item => item.id === "parcel-coverage-3d"));
});

test("aging mostra as sete janelas solicitadas em uma linha, preservando percentuais", () => {
    const bins = [
        { key: "1-6h", label: "1–6h", display: "1 - 6h" },
        { key: "7-12h", label: "7–12h", display: "7 - 12h" },
        { key: "13-24h", label: "13–24h", display: "13 - 24h" },
        { key: "25-48h", label: "25–48h", display: "25 - 48h" },
        { key: "49-96h", label: "49–96h", display: "2 - 4 Dias" },
        { key: "97-168h", label: "97–168h", display: "5 - 7 Dias" },
        { key: "over-168h", label: ">168h", display: "Super Expedite" },
    ];
    bins.forEach(({ key, label, display }) => {
        const bin = Object.freeze({ key, label, percentage: 0.125 });
        assert.deepEqual(createParcelAgingChartLabel(bin), [display, "12,5%"]);
        assert.equal(bin.label, label);
        assert.equal(bin.percentage, 0.125);
    });
});

test("Next Step Action conserva ações completas e percentuais em rótulos com quebra de linha", t => {
    replaceGlobal(t, "window", { Chart: class { constructor(canvas, config) { return config; } } });
    const chart = createParcelVerticalChart({});
    assert.deepEqual(chart, createParcelAgingChart({}));
    assert.deepEqual(createParcelNextStepActionChartLabel({ label: "Process for delivery", percentage: 0.5 }),
        ["Process for delivery", "50,0%"]);
    assert.deepEqual(createParcelNextStepActionChartLabel({ label: "Process for liquidation", percentage: 0.125 }),
        ["Process for", "liquidation", "12,5%"]);
    const context = createCanvasContext();
    chart.ctx = context;
    chart.data.datasets[0].data = [2185, 0, 7];
    chart.getDatasetMeta = () => ({ data: [{ x: 50, y: 25 }, { x: 100, y: 120 }, { x: 150, y: 80 }] });
    chart.plugins.forEach(plugin => plugin.afterDatasetsDraw?.(chart));
    assert.deepEqual(context.texts, [["2.185", 50, 19], ["7", 150, 74]]);
    assert.equal(context.balance, 0);
});

class TestElement {
    constructor(tag) { this.tag = tag; this.children = []; this.textContent = ""; this.dataset = {}; this.attributes = {}; }
    setAttribute(name, value) { this.attributes[name] = value; }
    replaceChildren() { this.children = []; }
    appendChild(child) {
        if (child.tag === "fragment") this.children.push(...child.children);
        else this.children.push(child);
    }
}

test("distribuição mantém 8 linhas de 4 células com classificação clicável, sem truncar operadores", t => {
    replaceGlobal(t, "document", {
        createElement: tag => new TestElement(tag),
        createDocumentFragment: () => new TestElement("fragment"),
    });
    const body = new TestElement("tbody");
    for (const count of [0, 3, 8, 11, 0]) {
        const operators = Array.from({ length: count }, (_, index) => ({
            operator: `[Ops${index + 1}]OPERADOR TESTE SOBRENOME`,
            count: 20, percentage: 1 / count,
            packageKind: index % 2 === 0 ? "common" : "bulky",
        }));
        renderParcelOperatorTable(body, operators);
        assert.equal(body.children.length, Math.max(8, count));
        assert.ok(body.children.every(row => row.children.length === 4));
        body.children.forEach((row, index) => {
            if (index >= count) {
                assert.deepEqual(row.children.map(cell => cell.textContent), ["-", "-", "-", "-"]);
                assert.ok(row.children.every(cell => cell.children.length === 0));
            } else {
                assert.equal(row.children[0].textContent, `[Ops${index + 1}] Operador`);
                assert.equal(row.children[1].textContent, "20");
                const button = row.children[3].children[0];
                assert.equal(button.tag, "button");
                assert.equal(button.type, "button");
                assert.equal(button.textContent, index % 2 === 0 ? "Não" : "Sim");
                assert.equal(button.dataset.parcelOperatorKey, operators[index].operator.toLowerCase());
                assert.equal(button.attributes["aria-pressed"], String(index % 2 !== 0));
                assert.equal(button.attributes["aria-label"], `Volumoso? [Ops${index + 1}] Operador`);
            }
        });
    }
});

test("HTML inicial da distribuição também contém 8 linhas com hífens", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const body = html.match(/<tbody id="parcelOperatorDistributionBody">([\s\S]*?)<\/tbody>/)[1];
    assert.equal((body.match(/<tr/g) ?? []).length, 8);
    assert.equal((body.match(/<td>-<\/td>/g) ?? []).length, 32);
    assert.match(html, /<th>Volumoso\?<\/th>/);
    assert.doesNotMatch(body, /colspan/);
});
