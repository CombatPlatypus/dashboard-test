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
    createParcelCoverageChart,
} from "../js/reports/parcel-sweeper/charts.js";
import { renderParcelOperatorTable } from "../js/reports/parcel-sweeper/view.js";

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
    assert.equal(context.texts[0][0], "66,7%");
    assert.equal(context.texts[1][0], "Bipados");
    assert.equal(context.balance, 0);
    assert.ok(!aging.plugins.some(item => item.id === "parcel-coverage-3d"));
});

test("aging acima de 48h mostra equivalência exata em dias, sem mudar horas ou percentuais", () => {
    const bins = [
        { key: "1-6h", label: "1–6h", days: "" },
        { key: "7-12h", label: "7–12h", days: "" },
        { key: "13-24h", label: "13–24h", days: "" },
        { key: "25-48h", label: "25–48h", days: "" },
        { key: "49-96h", label: "49–96h", days: "2 dias e 1h–4 dias" },
        { key: "97-168h", label: "97–168h", days: "4 dias e 1h–7 dias" },
        { key: "over-168h", label: ">168h", days: "Mais de 7 dias" },
    ];
    bins.forEach(({ key, label, days }) => {
        const bin = Object.freeze({ key, label, percentage: 0.125 });
        assert.deepEqual(createParcelAgingChartLabel(bin), [label, days, "12,5%"]);
        assert.equal(bin.label, label);
        assert.equal(bin.percentage, 0.125);
    });
});

class TestElement {
    constructor(tag) { this.tag = tag; this.children = []; this.textContent = ""; }
    replaceChildren() { this.children = []; }
    appendChild(child) {
        if (child.tag === "fragment") this.children.push(...child.children);
        else this.children.push(child);
    }
}

test("distribuição mantém no mínimo 8 linhas de 3 células, sem truncar operadores", t => {
    replaceGlobal(t, "document", {
        createElement: tag => new TestElement(tag),
        createDocumentFragment: () => new TestElement("fragment"),
    });
    const body = new TestElement("tbody");
    for (const count of [0, 3, 8, 11, 0]) {
        const operators = Array.from({ length: count }, (_, index) => ({
            operator: `[Ops${index + 1}]OPERADOR TESTE SOBRENOME`,
            count: 20, percentage: 1 / count,
        }));
        renderParcelOperatorTable(body, operators);
        assert.equal(body.children.length, Math.max(8, count));
        assert.ok(body.children.every(row => row.children.length === 3));
        body.children.forEach((row, index) => {
            if (index >= count) {
                assert.deepEqual(row.children.map(cell => cell.textContent), ["-", "-", "-"]);
            } else {
                assert.equal(row.children[0].textContent, `[Ops${index + 1}] Operador Teste`);
                assert.equal(row.children[1].textContent, "20");
            }
        });
    }
});

test("HTML inicial da distribuição também contém 8 linhas com hífens", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const body = html.match(/<tbody id="parcelOperatorDistributionBody">([\s\S]*?)<\/tbody>/)[1];
    assert.equal((body.match(/<tr/g) ?? []).length, 8);
    assert.equal((body.match(/<td>-<\/td>/g) ?? []).length, 24);
    assert.doesNotMatch(body, /colspan/);
});
