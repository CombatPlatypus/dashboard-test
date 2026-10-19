import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import { CHART_TEXT_COLOR } from "../js/charts/theme.js";

const source = readFileSync(new URL("../js/charts/defaults.js", import.meta.url), "utf8");
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

function configure(fonts, instances = {}) {
    const frames = [];
    const warnings = [];
    const chartLibrary = { defaults: {
        font: { family: "Helvetica", size: 12, weight: null },
        plugins: { tooltip: { titleColor: "#fff", bodyColor: "#fff", footerColor: "#fff" } },
    }, instances };
    runInNewContext(source, {
        window: { Chart: chartLibrary, requestAnimationFrame(callback) { frames.push(callback); return frames.length; } },
        document: { fonts },
        console: { warn(message) { warnings.push(message); } },
    });
    return { chartLibrary, frames, warnings };
}

test("Open Sans 14px e densidade mínima 2x são o padrão antes da criação dos gráficos", () => {
    const { chartLibrary, frames } = configure(undefined);
    assert.deepEqual(chartLibrary.defaults.font, { family: "'Open Sans', sans-serif", size: 14, weight: null });
    assert.equal(chartLibrary.defaults.devicePixelRatio(), 2);
    assert.equal(frames.length, 0);
    assert.doesNotThrow(() => runInNewContext(source, { window: {}, document: {} }));
});

test("textos e tooltips dos gráficos atuais e futuros usam #e4e6eb por padrão", () => {
    const { chartLibrary } = configure(undefined);
    assert.equal(CHART_TEXT_COLOR, "#e4e6eb");
    assert.equal(chartLibrary.defaults.color, CHART_TEXT_COLOR);
    assert.equal(chartLibrary.defaults.plugins.tooltip.enabled, false);
    for (const property of ["titleColor", "bodyColor", "footerColor"]) {
        assert.equal(chartLibrary.defaults.plugins.tooltip[property], CHART_TEXT_COLOR);
    }
});

test("carrega os três pesos locais e redesenha gráficos atuais e futuros quando a fonte fica pronta", async () => {
    const loads = [];
    const listeners = new Map();
    let resolveLoads;
    const loaded = new Promise(resolve => { resolveLoads = resolve; });
    const fonts = {
        ready: Promise.resolve(),
        load(font, sample) { loads.push({ font, sample }); return loaded; },
        addEventListener(name, listener) { listeners.set(name, listener); },
    };
    const updates = [];
    const instances = { initial: { update(mode) { updates.push(["initial", mode]); } } };
    const { chartLibrary, frames } = configure(fonts, instances);
    assert.deepEqual(loads.map(item => item.font), ["400 14px 'Open Sans'", "600 14px 'Open Sans'", "800 14px 'Open Sans'"]);
    assert.ok(loads.every(item => item.sample.includes("Ocorrências")));
    assert.equal(frames.length, 0);
    instances.future = { update(mode) { updates.push(["future", mode]); } };
    listeners.get("loadingdone")();
    resolveLoads([]);
    await flushPromises();
    assert.equal(frames.length, 1, "o evento e a promessa compartilham um único redesenho");
    frames.shift()();
    assert.deepEqual(updates, [["initial", "none"], ["future", "none"]]);
    assert.equal(chartLibrary.defaults.font.family, "'Open Sans', sans-serif");
    delete instances.initial;
    listeners.get("loadingdone")();
    frames.shift()();
    assert.deepEqual(updates.at(-1), ["future", "none"]);
});

test("falha de carregamento mantém sans-serif como alternativa e não interrompe o dashboard", async () => {
    const { chartLibrary, warnings } = configure({ load() { return Promise.reject(new Error("offline")); } });
    await flushPromises();
    assert.equal(chartLibrary.defaults.font.family, "'Open Sans', sans-serif");
    assert.equal(warnings.length, 1);
});

test("o HTML aplica o padrão a relatórios e análises, usando arquivos de fonte presentes no repositório", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const defaultsPosition = html.indexOf('<script src="js/charts/defaults.js"></script>');
    assert.ok(defaultsPosition > html.indexOf('<script src="js/libraries/chart.umd.min.js"></script>'));
    assert.ok(defaultsPosition < html.indexOf('<script type="module" src="js/reports/init.js"></script>'));
    assert.ok(defaultsPosition < html.indexOf('<script type="module" src="js/data-analysis/index.js"></script>'));
    const styles = readFileSync(new URL("../css/dashboard-style.css", import.meta.url), "utf8");
    const reportStyles = readFileSync(new URL("../css/reports-style.css", import.meta.url), "utf8");
    assert.match(reportStyles, /\.chart-label p\s*\{[^}]*color:\s*var\(--color-text\)/);
    assert.match(styles, /canvas\s*\{\s*font-family:\s*'Open Sans', sans-serif;/);
    const fontCssUrl = new URL("../css/font-face.css", import.meta.url);
    const fontCss = readFileSync(fontCssUrl, "utf8");
    for (const weight of [400, 600, 800]) assert.ok(fontCss.includes(`font-weight: ${weight};`));
    const files = [...fontCss.matchAll(/src:\s*url\(([^)]+)\)/g)];
    assert.equal(files.length, 24);
    for (const [, path] of files) assert.ok(existsSync(new URL(path, fontCssUrl)), `Fonte local disponível: ${path}`);
});
