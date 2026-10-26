// Executar com Playwright em NODE_PATH. Usa navegador e armazenamento isolados.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDashboardSettingsFile, serializeDashboardSettingsFile } from "../js/settings/settings-file.js";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const output = process.env.SETTINGS_QA_OUTPUT || await mkdtemp(path.join(tmpdir(), "dashboard-settings-"));
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
        const target = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
        if (!target.startsWith(root)) throw new Error("Invalid path");
        const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
            ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
        response.setHeader("Content-Type", `${mime[path.extname(target)] || "application/octet-stream"};charset=utf-8`);
        response.end(await readFile(target));
    } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1050 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue() : route.abort());
    const base = `http://127.0.0.1:${server.address().port}`;
    const readyIndex = () => page.waitForFunction(() => document.querySelectorAll("#switch-spreadsheet .tabs-title").length > 0);
    const readySettings = () => page.waitForFunction(() => document.querySelectorAll("[data-dashboard-spreadsheet-row]").length === 20);
    const choose = async (id, label) => {
        await page.locator(`#select2-${id}-container`).click();
        await page.getByRole("option", { name: label, exact: true }).click();
    };
    const importSource = async (id, source) => page.locator(id).setInputFiles({
        name: "configuracoes-teste.js", mimeType: "text/javascript", buffer: Buffer.from(source),
    });
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("dashboard-settings-v1")));
    const reportContext = () => page.evaluate(async () =>
        (await import("/js/reports/core/report-context.js")).getReportContext());

    await page.goto(base);
    await readyIndex();
    assert.equal(await page.locator('.reveal#settings, [data-open="settings"]').count(), 0);
    assert.equal(await page.locator("#reportCapacityInput, #reportCollaboratorsInput").count(), 0);
    assert.equal(await page.locator(".global-inputs > div").count(), 3);
    assert.equal((await reportContext()).shiftCapacity, 20000);
    await page.locator("#reportPlanningInput").fill("3141");
    await page.evaluate(async () => {
        const receipt = await import("/js/reports/receipt/state.js");
        receipt.restoreReceiptState({ operators: [{ receiver: "Operador teste", selected: true,
            packagesReceived: 321, errorQuantity: 2 }] });
        const reverse = await import("/js/reports/reverse/state.js");
        reverse.restoreReverseState({ transfers: [{ to: "TESTE", quantities: { damaged: 3 } }] });
    });
    const reportsBefore = await page.evaluate(async () =>
        (await import("/js/reports/core/report-manager.js")).reportManager.exportSession());
    await page.locator("#dashboardSettingsLink").click();
    await page.waitForURL("**/settings.html");
    await readySettings();
    await choose("settingsAnalystName", "Caio");
    await page.locator("#settingsAnalystEmail").fill("caio@example.com");
    await choose("settingsAnalystShift", "PM2");
    await choose("settingsAnalystIcon", "Coruja");
    assert.match(await page.locator(".analyst img").getAttribute("src"), /owl-icon\.svg$/);
    await page.locator("#settingsSpreadsheetName1").fill("Minha Planilha");
    await choose("settingsSpreadsheetVisibility2", "Oculta");
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 100),
        "Selects ocultos não devem criar espaço em branco fora da lista de planilhas.");
    await page.screenshot({ path: path.join(output, "perfil-configuracoes.png"), fullPage: true });
    await page.locator('a[href="#another-links"]').click();
    await page.locator('label[for="settingsReverseFormVisible"]').click();
    assert.equal(await page.locator("#footerReverseFormLink").isVisible(), false);
    await page.locator('label[for="settingsReverseFormVisible"]').click();
    assert.equal(await page.locator("#footerReverseFormLink").isVisible(), true);
    await page.locator('label[for="settingsReverseFormVisible"]').click();
    await page.locator("#settingsDamageAppLink").fill("https://example.com/avarias");
    assert.equal(await page.locator("#footerDamageAppLink").getAttribute("data-url"), "https://example.com/avarias");
    await page.screenshot({ path: path.join(output, "footer-configuracoes.png"), fullPage: true });
    const downloadEvent = page.waitForEvent("download");
    await page.locator("#settingsSaveButton").click();
    const download = await downloadEvent;
    assert.match(download.suggestedFilename(), /^configuracoes-dashboard-.*\.js$/);
    const exported = await readFile(await download.path(), "utf8");
    const saved = parseDashboardSettingsFile(exported);
    assert.deepEqual(saved.profile, { name: "Caio", email: "caio@example.com", shift: "PM2", icon: "owl" });
    assert.equal(saved.footerVisibility.reverseForm, false);
    assert.equal(saved.spreadsheets[0].menuName, "Minha Planilha");
    assert.equal(saved.spreadsheets[1].visible, false);
    assert.deepEqual(await stored(), saved);
    assert.match(page.url(), /settings\.html/);

    // Voltar pelo menu descarta a prévia não salva e preserva os dados operacionais.
    await page.locator('label[for="settingsReverseFormVisible"]').click();
    await page.locator("#settingsBackButton").click();
    await page.waitForURL("**/index.html");
    await readyIndex();
    assert.equal(await page.locator("#footerReverseFormLink").isVisible(), false);
    assert.equal(await page.locator("#reportWindowInput").inputValue(), "PM2");
    assert.equal(await page.locator("#reportAnalystInput").inputValue(), "Caio");
    assert.equal(await page.locator("#reportPlanningInput").inputValue(), "3141");
    const reportsAfter = await page.evaluate(async () =>
        (await import("/js/reports/core/report-manager.js")).reportManager.exportSession());
    assert.deepEqual(reportsAfter.receipt, { ...reportsBefore.receipt, window: "PM2",
        linehaul: { ...reportsBefore.receipt.linehaul, window: "PM2" } });
    assert.deepEqual(reportsAfter.reverse, reportsBefore.reverse);

    // O importador do index aceita configurações sem substituir os relatórios.
    const imported = structuredClone(saved);
    imported.profile = { name: "Fernando", email: "fernando@example.com", shift: "PM1", icon: "cat" };
    imported.footerVisibility.damageApp = false;
    await importSource("#reportSessionFileInput", serializeDashboardSettingsFile(imported));
    await page.waitForFunction(() => document.getElementById("reportAnalystInput").value === "Fernando");
    assert.equal(await page.locator("#footerDamageAppLink").isVisible(), false);
    assert.equal(await page.locator("#reportPlanningInput").inputValue(), "3141");
    assert.match(await page.locator(".main-menu [data-dashboard-profile-icon]").getAttribute("src"), /cat-icon\.svg$/);

    // Sessões antigas continuam legíveis e não restauram capacidades antigas.
    const legacy = await page.evaluate(async () =>
        (await import("/js/reports/session.js")).createReportSessionPayload());
    delete legacy.settings.profile;
    delete legacy.settings.footerVisibility;
    legacy.context.analyst = "Analista legado";
    legacy.context.shiftCapacity = 5000;
    await importSource("#reportSessionFileInput", `const DASHBOARD_REPORT_SESSION = ${JSON.stringify(legacy)};`);
    await page.waitForFunction(() => document.getElementById("reportAnalystInput").value === "Analista legado");
    assert.equal((await reportContext()).shiftCapacity, 20000);
    assert.equal(await page.locator("#footerDamageAppLink").isVisible(), true);

    await page.locator("#dashboardSettingsLink").click();
    await page.waitForURL("**/settings.html");
    await readySettings();
    await importSource("#settingsFileInput", exported);
    await page.waitForFunction(() => document.getElementById("settingsAnalystName").value === "Caio");
    assert.equal(await page.locator("#settingsReverseFormVisible").isChecked(), false);
    assert.equal((await stored()).profile.name, "Fernando");
    await page.locator("#settingsAnalystEmail").fill("email-invalido");
    await page.locator("#settingsSaveAndBackButton").click();
    assert.match(page.url(), /settings\.html/);
    assert.match(await page.locator("#settingsFeedback").textContent(), /Confira/);
    await page.locator("#settingsAnalystEmail").fill("caio@example.com");
    const backDownload = page.waitForEvent("download");
    await page.locator("#settingsSaveAndBackButton").click();
    await backDownload;
    await page.waitForURL("**/index.html");
    await readyIndex();
    assert.equal(await page.locator("#reportAnalystInput").inputValue(), "Caio");
    assert.equal(await page.locator("#reportPlanningInput").inputValue(), "3141");
    assert.equal(await page.locator("#footerReverseFormLink").isVisible(), false);
    assert.equal((await reportContext()).shiftCapacity, 20000);
    assert.equal(await page.locator("#switch-spreadsheet .tabs-title").count(), 16);

    // A configuração salva reaparece ao abrir a página diretamente.
    await page.goto(`${base}/settings.html`);
    await readySettings();
    assert.equal(await page.locator("#settingsAnalystEmail").inputValue(), "caio@example.com");
    assert.equal(await page.locator("#settingsReverseFormVisible").isChecked(), false);
    assert.deepEqual(errors, []);
    console.log(`Configurações: navegação, prévia, salvamento, importação e compatibilidade verificadas. Imagens: ${output}`);
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
