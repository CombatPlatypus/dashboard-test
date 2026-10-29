// Run with Playwright in NODE_PATH; REPORT_SPREADSHEETS_QA_OUTPUT selects the artifact folder.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createExpeditionSpreadsheetState, createReceiptSpreadsheetSnapshot } from "./fixtures/report-spreadsheets.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const XLSX = require("../js/libraries/xlsx.full.min.js");
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const output = process.env.REPORT_SPREADSHEETS_QA_OUTPUT || await mkdtemp(path.join(tmpdir(), "report-spreadsheets-"));
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
        const target = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
        if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid path");
        const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
        response.setHeader("Content-Type", `${mime[path.extname(target)] || "application/octet-stream"};charset=utf-8`);
        response.end(await readFile(target));
    } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1850, height: 1050 } });
    await page.clock.setFixedTime(new Date("2026-10-28T15:00:00-03:00"));
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let delayTemplate = false, failTemplate = false, releaseTemplate, intercepted;
    let templateRequests = 0;
    await page.route("**/xlsx/**", async route => {
        templateRequests += 1;
        if (failTemplate) return route.fulfill({ status: 503, body: "Modelo indisponível" });
        if (delayTemplate) await new Promise(resolve => { releaseTemplate = resolve; intercepted(); });
        await route.continue();
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => document.querySelectorAll("#switch-spreadsheet .tabs-title").length > 0);
    await page.locator('a[href="#reports"]').click();
    const receiptButton = page.locator("#receiptSpreadsheetDownloadButton");
    const expeditionButton = page.locator("#expeditionSpreadsheetDownloadButton");
    assert.equal(await receiptButton.isDisabled(), true);
    assert.equal(await expeditionButton.isDisabled(), true);
    const instruction = "No SPX, Transporte Principal / Viagens de Carga / Inbound, pressione Ctrl + A e Ctrl + C. Depois, volte aqui e clique em importar.";
    assert.equal((await page.locator("#receiptNotificationText").textContent()).trim(), instruction);
    await page.locator('a[href="#planning"]').click();
    assert.equal((await page.locator("#planningNotificationText").textContent()).trim(), instruction);
    await page.locator('a[href="#receipt"]').click();

    await page.evaluate(async snapshot => {
        (await import("/js/reports/core/report-context.js")).restoreReportContext({ window: "PM1", plannedVolume: 1000 });
        (await import("/js/reports/receipt/state.js")).restoreReceiptState(snapshot.receipt);
        (await import("/js/reports/receipt/linehaul-state.js")).restoreReceiptLinehaulState(snapshot.linehaul);
    }, createReceiptSpreadsheetSnapshot());
    assert.equal(await receiptButton.isDisabled(), false);
    assert.equal(await receiptButton.getAttribute("aria-label"), "Baixar planilha de processamento");
    delayTemplate = true;
    const requestStarted = new Promise(resolve => { intercepted = resolve; });
    const receiptDownloadEvent = page.waitForEvent("download");
    await receiptButton.click();
    await requestStarted;
    assert.equal(await receiptButton.isDisabled(), true);
    await page.evaluate(async () => {
        const receipt = await import("/js/reports/receipt/state.js");
        receipt.updateReceiptOperatorSelection(receipt.getReceiptState().operators[0].id, false);
        document.getElementById("receiptSpreadsheetDownloadButton").dispatchEvent(new Event("click"));
    });
    assert.equal(await receiptButton.isDisabled(), true, "Alterar o estado não libera um segundo download em andamento.");
    delayTemplate = false;
    releaseTemplate();
    const receiptDownload = await receiptDownloadEvent;
    assert.equal(receiptDownload.suggestedFilename(), "relatorio-de-processamento-2026-10-28.xlsx");
    const receiptPath = path.join(output, receiptDownload.suggestedFilename());
    await receiptDownload.saveAs(receiptPath);
    const receiptBook = XLSX.read(await readFile(receiptPath), { type: "buffer" });
    assert.deepEqual(receiptBook.SheetNames, ["Descarregamento de LHs", "Mesa de Recebimento"]);
    assert.equal(receiptBook.Sheets["Mesa de Recebimento"].E3.v, 150, "O arquivo mantém os dados capturados no clique.");
    assert.equal(receiptBook.Sheets["Descarregamento de LHs"].E3.v, 120);
    assert.equal(templateRequests, 1);
    assert.equal(await receiptButton.getAttribute("aria-busy"), null);
    page.once("dialog", dialog => dialog.accept());
    await page.locator("#receiptClearReportButton").click();
    assert.equal(await receiptButton.isDisabled(), true);
    await page.locator('a[href="#linehaul"]').click();
    assert.equal((await page.locator("#receiptNotificationText").textContent()).trim(), instruction);

    await page.locator('a[href="#expedition"]').click();
    await page.evaluate(async state => (await import("/js/reports/expedition/state.js")).restoreExpeditionState(state), createExpeditionSpreadsheetState());
    await page.locator('a[href="#expedition-mistakes"]').click();
    assert.equal(await expeditionButton.isDisabled(), false);
    const expeditionDownloadEvent = page.waitForEvent("download");
    await expeditionButton.click();
    const expeditionDownload = await expeditionDownloadEvent;
    assert.equal(expeditionDownload.suggestedFilename(), "relatorio-de-expedicao-2026-10-28.xlsx");
    const expeditionPath = path.join(output, expeditionDownload.suggestedFilename());
    await expeditionDownload.saveAs(expeditionPath);
    const expeditionBook = XLSX.read(await readFile(expeditionPath), { type: "buffer" });
    assert.equal(expeditionBook.SheetNames.length, 3);
    assert.equal(expeditionBook.Sheets["Resumo da Expedição"].G3.v, 350);
    assert.equal(expeditionBook.Sheets["Análise de Erros e Ruas"].E7.v, 8);
    assert.equal(expeditionBook.Workbook.Sheets[2].Hidden, 1);

    failTemplate = true;
    await expeditionButton.click();
    await page.waitForFunction(() => document.getElementById("expeditionNotification").dataset.notificationType === "error");
    assert.match(await page.locator("#expeditionNotificationText").textContent(), /503/);
    assert.equal(await expeditionButton.isDisabled(), false);
    assert.equal(await expeditionButton.getAttribute("aria-busy"), null);
    failTemplate = false;
    const retry = page.waitForEvent("download");
    await expeditionButton.click();
    await (await retry).saveAs(path.join(output, "expedicao-nova-tentativa.xlsx"));
    await page.screenshot({ path: path.join(output, "expedicao-planilha-gerada.png") });
    page.once("dialog", dialog => dialog.accept());
    await page.locator("#expeditionClearReportButton").click();
    assert.equal(await expeditionButton.isDisabled(), true);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ output, downloads: 3, errors }, null, 2));
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
