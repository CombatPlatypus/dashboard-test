import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { Script } from "node:vm";
import { createCompleteAnalysis } from "./fixtures/overall-analysis-complete.mjs";
import { getOverallAnalysisMissingSections, isOverallAnalysisComplete } from "../js/reports/overall-analysis/completeness.js";
import {
    createStandaloneOverallAnalysisHtml, createStandaloneOverallAnalysisFileName,
} from "../js/reports/overall-analysis/standalone-export.js";
import { createOverallAnalysisData } from "../js/reports/overall-analysis/model.js";
import {
    initializeOverallAnalysisActions, renderOverallAnalysisActions, runOverallAnalysisHtmlExport,
} from "../js/reports/overall-analysis/actions.js";

const readResource = async url => ({ ok: true, text: () => readFile(url, "utf8") });

test("somente a análise completa libera HTML; cada bloco ausente bloqueia a geração", async () => {
    assert.equal(isOverallAnalysisComplete(createCompleteAnalysis()), true);
    assert.equal(getOverallAnalysisMissingSections(null).length, 6);
    const missingFields = [
        ["context", "analyst", ""], ["context", "window", ""],
        ["flow", "planned", null], ["processing", "totalErrors", null],
        ["processing", "expectedVolume", null], ["processing", "receivedVolume", null],
        ["expedition", "floorVolume", null], ["expedition", "durationSeconds", null],
    ];
    for (const [section, field, value] of missingFields) {
        const data = createCompleteAnalysis();
        data[section][field] = value;
        assert.equal(isOverallAnalysisComplete(data), false, `${section}.${field}`);
        await assert.rejects(createStandaloneOverallAnalysisHtml(data, {
            fetchResource() { throw new Error("Não deve carregar recursos"); },
        }), /Complete a análise geral/);
    }
    const data = createCompleteAnalysis();
    data.cards.lossesRate.rate = null;
    assert.deepEqual(getOverallAnalysisMissingSections(data), ["Taxa de perdas"]);
    const analysis = createCompleteAnalysis();
    analysis.damageAndLosses.traditionalAnalysis.totalMonth.soc = null;
    assert.deepEqual(getOverallAnalysisMissingSections(analysis), ["Avarias e perdas"]);
});

test("Parcel e Reversa são opcionais, inclusive quando ambos estão vazios", async () => {
    for (const [parcel, reverse] of [[false, true], [true, false], [false, false]]) {
        const data = createCompleteAnalysis();
        data.parcel.hasData = parcel;
        data.reverse.hasData = reverse;
        assert.equal(isOverallAnalysisComplete(data), true);
        const html = await createStandaloneOverallAnalysisHtml(data, { fetchResource: readResource });
        const payload = JSON.parse(html.match(/<script id="finalReportData"[^>]*>([\s\S]*?)<\/script>/)[1]);
        assert.equal(payload.report.parcel.hasData, parcel);
        assert.equal(payload.report.reverse.hasData, reverse);
        data.processing.totalErrors = null;
        assert.deepEqual(getOverallAnalysisMissingSections(data), ["Processamento"]);
    }
});

test("zeros importados são válidos sem exigir ocorrências de avarias/perdas", () => {
    const base = createCompleteAnalysis();
    const months = [{ moved: 1000, lost: 0, damage: 0 }];
    const data = createOverallAnalysisData(
        { expectedVolume: 0, operators: [{ packagesReceived: 0, errorQuantity: 0 }] },
        { routes: [{ status: "Validated", finalOrders: 0,
            validationStartTime: "2026-10-19 01:00:00", validationEndTime: "2026-10-19 01:00:00" }], floorVolume: 0 },
        { activeMonth: 0, year: 2026, months }, { ...base.context, plannedVolume: 0 },
        { days: [{ date: "2026-10-19", hub: 0, soc: 0 }] },
        { days: [{ date: "2026-10-19", underReview: 0, confirmedLosses: 0, returnedPackages: 0 }] },
        { rows: [{ countType: "Missing", expected: "N" }] },
        { transfers: [{ to: "TOZERO", quantities: { return: 1, missorted: 0, liquidate: 0, confiscated: 0 } }] },
        new Date(2026, 0, 19, 12),
    );
    assert.equal(data.cards.packagesAnalysis.value, 0);
    assert.equal(data.cards.packagesAnalysis.rate, 0);
    assert.equal(data.damageAndLosses.traditionalAnalysis.totalMonth.hub, 0);
    assert.deepEqual(getOverallAnalysisMissingSections(data), []);
    data.damageAndLosses.traditionalAnalysis.today.hub = null;
    assert.equal(isOverallAnalysisComplete(data), false);
});

test("exportação incorpora os recursos e congela dados antes do carregamento assíncrono", async () => {
    const data = createCompleteAnalysis();
    data.context.analyst = "Ação </script><script>window.injetado=true</script> $& {{CHART_JS}}";
    const expectedAnalyst = data.context.analyst;
    let fetched = 0;
    const generatedAt = new Date("2026-10-19T13:00:00.000Z");
    const html = await createStandaloneOverallAnalysisHtml(data, {
        generatedAt,
        async fetchResource(url) {
            fetched += 1;
            data.context.analyst = "Alterado durante a exportação";
            return readResource(url);
        },
    });
    const payload = JSON.parse(html.match(/<script id="finalReportData"[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert.equal(payload.report.context.analyst, expectedAnalyst);
    assert.equal(payload.report.flow.processed, 11500);
    assert.equal(payload.report.expedition.durationSeconds, 7805);
    assert.equal(payload.generatedAt, generatedAt.toISOString());
    assert.ok(fetched > 3);
    assert.doesNotMatch(html, /<script>window\.injetado/);
    assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)=/i);
    assert.doesNotMatch(html, /^import\s|^export\s/m);
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 3);
    new Script(scripts[0][1]);
    new Script(scripts[2][1]);
    for (const reportWindow of ["AM", "PM1", "PM2"]) {
        assert.equal(createStandaloneOverallAnalysisFileName(new Date(2026, 9, 19), reportWindow),
            `Relatório Final - ${reportWindow} 19.10.2026.html`);
    }
    assert.equal(createStandaloneOverallAnalysisFileName(new Date(2026, 0, 5)), "Relatório Final - AM 05.01.2026.html");
});

test("modelo incompleto ou recurso indisponível impede download e permite uma nova tentativa", async () => {
    await assert.rejects(createStandaloneOverallAnalysisHtml(createCompleteAnalysis(), {
        fetchResource: async () => ({ ok: false }),
    }), /Não foi possível carregar/);
    await assert.rejects(createStandaloneOverallAnalysisHtml(createCompleteAnalysis(), {
        fetchResource: async url => url.pathname.endsWith("final-report.html")
            ? { ok: true, text: async () => "<html></html>" } : readResource(url),
    }), /marcador/);
    const html = await createStandaloneOverallAnalysisHtml(createCompleteAnalysis(), { fetchResource: readResource });
    assert.ok(html.includes("startStandaloneReport"));
});

test("botão acompanha completude, bloqueia cliques duplos e recupera falhas de exportação", async t => {
    const previous = new Map();
    function replace(name, value) {
        previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
    }
    t.after(() => previous.forEach((descriptor, name) => {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
    }));
    class Element {
        constructor() { this.attributes = {}; this.listeners = {}; this.disabled = false; }
        setAttribute(name, value) { this.attributes[name] = value; }
        getAttribute(name) { return this.attributes[name]; }
        removeAttribute(name) { delete this.attributes[name]; }
        addEventListener(name, handler) { this.listeners[name] = handler; }
    }
    class Button extends Element {}
    class Image extends Element {}
    const htmlButton = new Button(), copy = new Button(), clear = new Button();
    const area = new Element(), panel = new Element();
    panel.querySelector = selector => ({
        "#overallAnalysisExportHtmlButton": htmlButton, "#overallAnalysisCopyReportButton": copy,
        "#overallAnalysisClearReportButton": clear, "#overallAnalysisReportExportArea": area,
    })[selector];
    let downloads = 0;
    let lastBlob;
    let notification = new Element();
    const notificationText = new Element(), notificationIcon = new Image();
    notification.dataset = {};
    replace("HTMLElement", Element); replace("HTMLButtonElement", Button); replace("HTMLImageElement", Image);
    replace("document", {
        getElementById(id) { return ({ overallAnalysisNotification: notification,
            overallAnalysisNotificationText: notificationText, overallAnalysisNotificationIcon: notificationIcon })[id]; },
        body: { appendChild() {} },
        createElement() { return { click() { downloads += 1; }, remove() {} }; },
    });
    replace("window", { setTimeout(callback) { callback(); }, clearTimeout() {} });
    replace("URL", class extends URL {
        static createObjectURL(blob) { lastBlob = blob; return "blob:test"; }
        static revokeObjectURL() {}
    });
    replace("console", { ...console, error() {} });
    assert.equal(initializeOverallAnalysisActions(panel), true);
    renderOverallAnalysisActions(false, null);
    assert.equal(htmlButton.disabled, true);
    assert.equal(await runOverallAnalysisHtmlExport(), false);
    const data = createCompleteAnalysis();
    renderOverallAnalysisActions(true, data);
    assert.equal(htmlButton.disabled, false);
    let release;
    const paused = new Promise(resolve => { release = resolve; });
    replace("fetch", async url => { await paused; return readResource(url); });
    const exporting = htmlButton.listeners.click();
    assert.equal(htmlButton.disabled, true);
    assert.equal(htmlButton.attributes["aria-busy"], "true");
    assert.equal(await runOverallAnalysisHtmlExport(), false);
    renderOverallAnalysisActions(false, null);
    release();
    assert.equal(await exporting, true);
    assert.equal(downloads, 1);
    assert.equal(lastBlob.type, "text/html;charset=utf-8");
    assert.ok((await lastBlob.text()).includes("Analista de teste"));
    assert.equal(htmlButton.disabled, true);
    assert.equal(htmlButton.attributes["aria-busy"], undefined);
    renderOverallAnalysisActions(true, data);
    globalThis.fetch = async () => ({ ok: false });
    assert.equal(await runOverallAnalysisHtmlExport(), false);
    assert.equal(downloads, 1);
    assert.equal(htmlButton.disabled, false);
    assert.equal(notification.dataset.notificationType, "error");
    globalThis.fetch = readResource;
    assert.equal(await runOverallAnalysisHtmlExport(), true);
    assert.equal(downloads, 2);
});
