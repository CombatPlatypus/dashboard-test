import { isOverallAnalysisComplete } from "./completeness.js";

const TEMPLATE_URL = new URL("../../../final-report.html", import.meta.url);
const CHART_URL = new URL("../../libraries/chart.umd.min.js", import.meta.url);
const RENDERER_URL = new URL("./standalone-renderer.js", import.meta.url);
const SOURCE_ROOT = new URL("../../", import.meta.url);

async function loadText(url, fetchResource) {
    const response = await fetchResource(url, { cache: "no-cache" });
    if (!response.ok) {
        throw new Error(`Não foi possível carregar ${url.pathname.split("/").pop()}.`);
    }
    return response.text();
}

// Empacota somente módulos locais com imports/exports nomeados. Cada módulo
// mantém seu próprio escopo. O HTML final executa JS comum, sem imports ou fetch.
async function bundleStandaloneRenderer(fetchResource) {
    const pending = new Map();
    const modules = [];

    function collect(url) {
        if (url.origin !== SOURCE_ROOT.origin || !url.href.startsWith(SOURCE_ROOT.href) ||
            !url.pathname.endsWith(".js")) {
            throw new Error("Dependência inválida no renderizador do relatório.");
        }
        if (pending.has(url.href)) return pending.get(url.href);

        const promise = (async function () {
            let source = await loadText(url, fetchResource);
            const imports = [];
            const exports = [];
            source = source.replace(/^import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];?/gm,
                function (statement, names, relativePath) {
                    const dependency = new URL(relativePath, url);
                    imports.push(dependency);
                    const bindings = names.replace(/\bas\b/g, ":");
                    return `const {${bindings}} = modules[${JSON.stringify(dependency.href)}];`;
                });
            source = source.replace(/^export\s*\{([^}]+)\};?/gm, function (statement, names) {
                for (const binding of names.split(",").map(value => value.trim()).filter(Boolean)) {
                    const [local, exported = local] = binding.split(/\s+as\s+/);
                    exports.push(`${JSON.stringify(exported)}: ${local}`);
                }
                return "";
            });
            source = source.replace(/^export\s+(const|let|function)\s+(\w+)/gm,
                function (statement, kind, name) {
                    exports.push(`${JSON.stringify(name)}: ${name}`);
                    return `${kind} ${name}`;
                });
            if (/^(?:import|export)\s/m.test(source)) {
                throw new Error("Formato de módulo não suportado no resumo HTML.");
            }
            await Promise.all(imports.map(collect));
            modules.push(`modules[${JSON.stringify(url.href)}] = (function () {\n${source}\nreturn {${exports.join(",")}};\n})();`);
        })();
        pending.set(url.href, promise);
        return promise;
    }

    await collect(RENDERER_URL);
    return `(function () {\n"use strict";\nconst modules = Object.create(null);\n${modules.join("\n")}\nmodules[${JSON.stringify(RENDERER_URL.href)}].startStandaloneReport();\n})();`;
}

function serializeStandaloneReportData(value) {
    return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character =>
        `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

function inlineScript(source) {
    return source.replace(/<\/script/gi, "<\\/script");
}

function buildStandaloneOverallAnalysisHtml({ template, chartSource, rendererSource, snapshot }) {
    const replacements = {
        CHART_JS: inlineScript(chartSource),
        REPORT_DATA: serializeStandaloneReportData(snapshot),
        REPORT_RENDERER_JS: inlineScript(rendererSource),
    };
    for (const name of Object.keys(replacements)) {
        if (template.split(`{{${name}}}`).length !== 2) {
            throw new Error(`O modelo precisa conter um marcador {{${name}}}.`);
        }
    }
    // Uma única passagem e callback evitam interpretar $&, $' ou marcadores
    // presentes em dados e no código incorporado como instruções de substituição.
    return template.replace(/\{\{(CHART_JS|REPORT_DATA|REPORT_RENDERER_JS)\}\}/g,
        (match, name) => replacements[name]);
}

function createStandaloneOverallAnalysisFileName(date = new Date(), reportWindow = "AM") {
    const dateKey = [String(date.getDate()).padStart(2, "0"),
        String(date.getMonth() + 1).padStart(2, "0"), date.getFullYear()].join(".");
    return `Relatório Final - ${reportWindow} ${dateKey}.html`;
}

async function createStandaloneOverallAnalysisHtml(data, {
    fetchResource = globalThis.fetch,
    generatedAt = new Date(),
} = {}) {
    if (!isOverallAnalysisComplete(data)) {
        throw new Error("Complete a análise geral antes de gerar o resumo HTML.");
    }
    // Captura antes de qualquer await: importações/edições posteriores não mudam
    // os valores nem a data deste arquivo enquanto os recursos são carregados.
    const snapshot = JSON.parse(JSON.stringify({
        schemaVersion: 1,
        generatedAt: generatedAt.toISOString(),
        dateLabel: new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric", weekday: "long",
        }).format(generatedAt),
        report: data,
    }));
    const [template, chartSource, rendererSource] = await Promise.all([
        loadText(TEMPLATE_URL, fetchResource),
        loadText(CHART_URL, fetchResource),
        bundleStandaloneRenderer(fetchResource),
    ]);
    return buildStandaloneOverallAnalysisHtml({ template, chartSource, rendererSource, snapshot });
}

export {
    buildStandaloneOverallAnalysisHtml,
    createStandaloneOverallAnalysisFileName,
    createStandaloneOverallAnalysisHtml,
    serializeStandaloneReportData,
};
