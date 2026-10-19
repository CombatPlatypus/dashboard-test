// Executar com Playwright disponível em NODE_PATH. Usa um perfil isolado e
// dados sintéticos; REPORT_QA_OUTPUT pode apontar para a pasta dos artefatos.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createCompleteAnalysis } from "./fixtures/overall-analysis-complete.mjs";
import { createStandaloneOverallAnalysisHtml } from "../js/reports/overall-analysis/standalone-export.js";

const { chromium } = createRequire(import.meta.url)("playwright");
const repo = fileURLToPath(new URL("../", import.meta.url));
const output = process.env.REPORT_QA_OUTPUT || await mkdtemp(path.join(tmpdir(), "overall-html-"));
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
        const target = path.resolve(repo, `.${pathname === "/" ? "/index.html" : pathname}`);
        if (!target.startsWith(repo)) throw new Error("Invalid path");
        const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
            ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
        response.setHeader("Content-Type", `${mime[path.extname(target)] || "application/octet-stream"};charset=utf-8`);
        response.end(await readFile(target));
    } catch {
        response.writeHead(404).end();
    }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1050 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('a[href="#reports"]').click();
    await page.locator('a[href="#overall-analysis"]').click();
    const button = page.locator("#overallAnalysisExportHtmlButton");
    assert.equal(await button.isDisabled(), true);
    const completeness = await page.evaluate(async data => {
        const [context, receipt, expedition, damage, losses, rate, parcel, reverse] = await Promise.all([
            import("/js/reports/core/report-context.js"), import("/js/reports/receipt/state.js"),
            import("/js/reports/expedition/state.js"), import("/js/reports/damage-and-losses/state.js"),
            import("/js/reports/damage-and-losses/losses-state.js"), import("/js/reports/losses-rate/state.js"),
            import("/js/reports/parcel-sweeper/state.js"), import("/js/reports/reverse/state.js"),
        ]);
        context.restoreReportContext(data.context);
        receipt.restoreReceiptState({ operators: [{ receiver: "Recebedor teste", selected: true,
            packagesReceived: data.processing.receivedVolume, errorQuantity: data.processing.totalErrors }] });
        expedition.restoreExpeditionState({ floorVolume: data.expedition.floorVolume, routes: [{
            code: "ATTEST", status: "Validated", finalOrders: data.expedition.volumeChecked,
            validationOperator: "Conferente teste", validationStartTime: "2026-10-19 01:00:00",
            validationEndTime: "2026-10-19 03:10:05",
        }] });
        damage.replaceDamageAndLossesData({ monthIndex: 9, year: 2026,
            days: [{ date: "2026-10-19", hub: 3, soc: 2 }] });
        losses.replaceLossesData({ monthIndex: 9, year: 2026,
            days: [{ date: "2026-10-19", underReview: 8, confirmedLosses: 2, returnedPackages: 5 }] });
        rate.replaceLossesRateHistory(Array.from({ length: 12 }, () =>
            ({ moved: 1000000, lost: 120, damage: 30, possibleLosses: 8 })));
        rate.setActiveLossesRateMonth(9);
        parcel.replaceParcelRows([
            { trackingNumber: "BR1", countType: "Backlog", expected: "Y" },
            { trackingNumber: "BR2", countType: "Exception", expected: "Y" },
            { trackingNumber: "BR3", countType: "Missing", expected: "Y" },
            { trackingNumber: "BR4", countType: "Mis-sorted", expected: "N" },
        ]);
        reverse.restoreReverseState({ transfers: [{ to: "TOTEST", quantities: data.reverse.quantities }] });
        return { disabled: document.getElementById("overallAnalysisExportHtmlButton").disabled,
            title: document.getElementById("overallAnalysisExportHtmlButton").title };
    }, createCompleteAnalysis());
    assert.equal(completeness.disabled, false, completeness.title);

    // A regra acompanha alterações do estado, sem precisar reabrir o painel.
    await page.evaluate(async () => {
        (await import("/js/reports/core/report-context.js")).updateReportContextField("analyst", "");
    });
    assert.equal(await button.isDisabled(), true);
    await page.evaluate(async () => {
        (await import("/js/reports/core/report-context.js")).updateReportContextField("analyst", "Analista de teste");
    });
    assert.equal(await button.isDisabled(), false);
    const downloadEvent = page.waitForEvent("download");
    await button.click();
    const download = await downloadEvent;
    assert.match(download.suggestedFilename(), /^relatorio-final-\d{4}-\d{2}-\d{2}\.html$/);
    const downloadedPath = path.join(output, "relatorio-final-baixado.html");
    await download.saveAs(downloadedPath);
    const downloaded = await readFile(downloadedPath, "utf8");
    assert.doesNotMatch(downloaded, /\{\{(?:CHART_JS|REPORT_DATA|REPORT_RENDERER_JS)\}\}/);
    const snapshot = JSON.parse(downloaded.match(/<script id="finalReportData"[^>]*>([\s\S]*?)<\/script>/)[1]);
    await page.evaluate(async () => {
        (await import("/js/reports/reverse/state.js")).resetReverseReport();
    });
    assert.equal(await button.isDisabled(), true);
    await context.close();

    const offline = await browser.newContext({ offline: true, timezoneId: "Pacific/Auckland",
        viewport: { width: 1600, height: 1050 } });
    const report = await offline.newPage();
    const requests = [];
    report.on("pageerror", error => errors.push(error.message));
    report.on("request", request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await report.goto(pathToFileURL(downloadedPath).href);
    await report.waitForFunction(() => document.documentElement.dataset.finalReportState === "ready");
    const rendered = await report.evaluate(() => {
        const text = id => document.getElementById(id).textContent;
        return {
            count: Object.values(Chart.instances).length,
            fonts: [400, 600, 800].every(weight => document.fonts.check(`${weight} 14px "Open Sans"`)),
            capacity: text("finalReportCapacityUsage"), processed: text("finalReportReceivedVolume"),
            expedited: text("finalReportVolumeChecked"), duration: text("finalReportExpeditionTime"),
            date: text("finalReportDate"), reverse: text("finalReport-ReverseConfiscated"),
            bars: Chart.getChart("finalReportReceiptChart").data.datasets[0].data,
            sizes: [...document.querySelectorAll("canvas")].map(canvas => [canvas.clientWidth, canvas.clientHeight]),
        };
    });
    assert.equal(rendered.count, 7);
    assert.equal(rendered.fonts, true);
    assert.equal(rendered.capacity, "60,0%");
    assert.equal(rendered.processed, "11.500");
    assert.equal(rendered.expedited, "11.000");
    assert.equal(rendered.duration, "02:10:05");
    assert.equal(rendered.date, snapshot.dateLabel);
    assert.equal(rendered.reverse, "4 (40%)");
    assert.deepEqual(rendered.bars, [12000, 11500, 500]);
    assert.ok(rendered.sizes.every(([width, height]) => width > 0 && height > 0));
    const legend = report.locator("#finalReport-ReverseChartContainer + .chart-label .type").first();
    await legend.click();
    assert.equal(await legend.getAttribute("aria-pressed"), "false");
    assert.equal(await report.evaluate(() => Chart.getChart("finalReport-ReverseChart").getDataVisibility(0)), false);
    await legend.press("Enter");
    assert.equal(await legend.getAttribute("aria-pressed"), "true");
    const sort = report.locator("#finalReport-LossesTable thead th").last().locator("button");
    await sort.click();
    assert.deepEqual(await report.locator("#finalReport-LossesTable tbody tr td:last-child").allTextContents(),
        ["2", "2", "3", "5", "8"]);
    await sort.click();
    assert.deepEqual(await report.locator("#finalReport-LossesTable tbody tr td:last-child").allTextContents(),
        ["8", "5", "3", "2", "2"]);
    await report.screenshot({ path: path.join(output, "relatorio-final-desktop.png"), fullPage: true });
    await report.setViewportSize({ width: 800, height: 1000 });
    await report.screenshot({ path: path.join(output, "relatorio-final-800px.png"), fullPage: true });
    assert.deepEqual(requests, []);
    assert.deepEqual(errors, []);

    // Um nome importado nunca pode fechar o JSON nem executar JS no arquivo.
    const hostile = createCompleteAnalysis();
    hostile.context.analyst = '</script><script>window.injetado=true</script> $& {{CHART_JS}}';
    const html = await createStandaloneOverallAnalysisHtml(hostile, {
        fetchResource: async url => ({ ok: true, text: () => readFile(url, "utf8") }),
    });
    const hostilePath = path.join(output, "relatorio-final-escape.html");
    await writeFile(hostilePath, html);
    await report.goto(pathToFileURL(hostilePath).href);
    await report.waitForFunction(() => document.documentElement.dataset.finalReportState === "ready");
    assert.equal(await report.locator("#finalReportWindowAnalyst").textContent(), hostile.context.analyst);
    assert.equal(await report.evaluate(() => window.injetado), undefined);
    console.log(JSON.stringify({ output, ...rendered, externalRequests: requests.length, errors }, null, 2));
    await offline.close();
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
