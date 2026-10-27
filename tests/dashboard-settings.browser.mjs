// Executar com Playwright em NODE_PATH. Usa duas guias e bloqueia os armazenamentos.
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
    await context.addInitScript(() => {
        window.storageAccesses = [];
        for (const key of ["localStorage", "sessionStorage"]) {
            Object.defineProperty(window, key, { configurable: true, get() {
                window.storageAccesses.push(key);
                throw new Error(`O dashboard não deve acessar ${key}.`);
            } });
        }
    });
    const errors = [];
    context.on("page", tab => tab.on("pageerror", error => errors.push(error.message)));
    let page = await context.newPage();
    await context.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1"
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
    const reportContext = () => page.evaluate(async () =>
        (await import("/js/reports/core/report-context.js")).getReportContext());

    await page.goto(base);
    await readyIndex();
    assert.equal(await page.locator('.reveal#settings, [data-open="settings"]').count(), 0);
    assert.equal(await page.locator("#reportCapacityInput, #reportCollaboratorsInput").count(), 0);
    assert.equal(await page.locator(".global-inputs > div").count(), 3);
    assert.equal((await reportContext()).shiftCapacity, 20000);
    await page.locator('a[href="#reports"]').click();
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
    const dashboard = page;
    const newTab = context.waitForEvent("page");
    await page.locator("#dashboardSettingsLink").click();
    page = await newTab;
    await page.waitForURL("**/settings.html");
    await readySettings();
    assert.equal(await page.locator("#settingsFeedback, .settings-feedback").count(), 0);
    assert.equal(await page.locator("#settingsNotification").isVisible(), true);
    assert.equal(await page.locator("#settingsNotification").getAttribute("data-notification-type"), "idle");
    assert.match(await page.locator("#settingsNotificationText").textContent(), /Monte uma configuração personalizada/);
    const dashboardDestination = new URL(await page.locator("#settingsBackButton").getAttribute("href"), page.url());
    if (dashboardDestination.origin !== base) {
        // Verifica o destino configurado sem acessar a versão publicada durante o teste local.
        await page.route(dashboardDestination.href, route => route.fulfill({
            status: 302, headers: { location: `${base}/index.html` },
        }));
    }
    assert.equal(dashboard.isClosed(), false);
    assert.equal(dashboard.url(), `${base}/`);
    const unnamedDownloadEvent = page.waitForEvent("download");
    await page.locator("#settingsSaveButton").click();
    assert.equal((await unnamedDownloadEvent).suggestedFilename(), "configurações-dashboard.js");
    assert.equal(await page.locator("#settingsNotification").getAttribute("data-notification-type"), "success");
    assert.match(await page.locator("#settingsNotificationText").textContent(), /Configurações salvas em configurações-dashboard\.js/);
    assert.match(await page.locator("#settingsNotificationIcon").getAttribute("src"), /success-icon\.svg$/);
    for (const [name, email, shift] of [
        ["Caio Vinicius", "caio.vinicius@shopee.com", "AM"],
        ["Fernando Ferrari", "fernando.ferrari@shopee.com", "PM2"],
        ["Thamyris Dias", "thamyris.ribeiro@shopee.com", "PM1"],
    ]) {
        await choose("settingsAnalystName", name);
        assert.equal(await page.locator("#settingsAnalystEmail").inputValue(), email);
        assert.equal(await page.locator("#settingsAnalystShift").inputValue(), shift);
        assert.equal(await page.locator("#select2-settingsAnalystShift-container").textContent(), shift);
        const profile = await page.evaluate(async () =>
            (await import("/js/spreadsheets/load-spreadsheets.js")).exportDashboardSettings().profile);
        assert.equal(profile.name, name);
        assert.equal(profile.email, email);
        assert.equal(profile.shift, shift);
    }
    await choose("settingsAnalystName", "Escolha um Analista");
    assert.equal(await page.locator("#settingsAnalystEmail").inputValue(), "");
    assert.equal(await page.locator("#settingsAnalystShift").inputValue(), "AM");
    await choose("settingsAnalystName", "Caio Vinicius");
    await choose("settingsAnalystShift", "PM2");
    await choose("settingsAnalystIcon", "Coruja");
    assert.match(await page.locator(".analyst img").getAttribute("src"), /owl-icon\.svg$/);
    await page.locator("#settingsSpreadsheetName1").fill("Minha Planilha");
    await choose("settingsSpreadsheetVisibility2", "Oculta");
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
    assert.equal(download.suggestedFilename(), "Caio Vinicius-configurações-dashboard.js");
    const exported = await readFile(await download.path(), "utf8");
    const saved = parseDashboardSettingsFile(exported);
    assert.deepEqual(saved.profile, { name: "Caio Vinicius", email: "caio.vinicius@shopee.com", shift: "PM2", icon: "owl" });
    assert.equal(saved.footerVisibility.reverseForm, false);
    assert.equal(saved.spreadsheets[0].menuName, "Minha Planilha");
    assert.equal(saved.spreadsheets[1].visible, false);
    assert.match(page.url(), /settings\.html/);

    // Salvar baixa o arquivo; recarregar o editor restaura os padrões.
    await page.reload();
    await readySettings();
    assert.equal(await page.locator("#settingsAnalystEmail").inputValue(), "");
    assert.equal(await page.locator("#settingsAnalystName").inputValue(), "");
    assert.equal(await page.locator("#settingsReverseFormVisible").isChecked(), true);
    await importSource("#settingsFileInput", "arquivo inválido");
    await page.waitForFunction(() => document.getElementById("settingsNotification").dataset.notificationType === "error");
    assert.match(await page.locator("#settingsNotificationText").textContent(), /formato/);
    assert.match(await page.locator("#settingsNotificationIcon").getAttribute("src"), /error-icon\.svg$/);
    assert.equal(await page.locator("#settingsAnalystName").inputValue(), "");
    await importSource("#settingsFileInput", exported);
    await page.waitForFunction(() => document.getElementById("settingsAnalystName").value === "Caio Vinicius");
    assert.equal(await page.locator("#settingsAnalystEmail").inputValue(), "caio.vinicius@shopee.com");
    assert.equal(await page.locator("#settingsReverseFormVisible").isChecked(), false);
    assert.equal(await page.locator("#settingsNotification").getAttribute("data-notification-type"), "success");
    assert.match(await page.locator("#settingsNotificationText").textContent(), /Configurações importadas/);
    assert.match(await page.locator("#settingsNotificationIcon").getAttribute("src"), /success-icon\.svg$/);
    const settingsPage = page;

    // O dashboard permanece aberto e só aplica as mudanças quando o arquivo é importado.
    page = dashboard;
    assert.equal(await page.locator("#footerReverseFormLink").isVisible(), true);
    assert.equal(await page.locator("#reportWindowInput").inputValue(), "AM");
    assert.equal(await page.locator("#reportAnalystInput").inputValue(), "");
    assert.equal(await page.locator("#reportPlanningInput").inputValue(), "3141");
    const reportsAfter = await page.evaluate(async () =>
        (await import("/js/reports/core/report-manager.js")).reportManager.exportSession());
    assert.deepEqual(reportsAfter, reportsBefore);

    // O importador do index aceita configurações sem substituir os relatórios.
    const imported = structuredClone(saved);
    imported.profile = { name: "Fernando Ferrari", email: "fernando.ferrari@shopee.com", shift: "PM1", icon: "cat" };
    imported.footerVisibility.damageApp = false;
    await importSource("#reportSessionFileInput", serializeDashboardSettingsFile(imported));
    await page.waitForFunction(() => document.getElementById("reportAnalystInput").value === "Fernando Ferrari");
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

    page = settingsPage;
    await page.locator("#settingsAnalystEmail").fill("email-invalido");
    await page.locator("#settingsSaveAndBackButton").click();
    assert.match(page.url(), /settings\.html/);
    assert.match(await page.locator("#settingsNotificationText").textContent(), /Confira/);
    assert.equal(await page.locator("#settingsNotification").getAttribute("data-notification-type"), "error");
    assert.match(await page.locator("#settingsNotificationIcon").getAttribute("src"), /error-icon\.svg$/);
    await page.locator("#settingsAnalystEmail").fill("caio.vinicius@shopee.com");
    const backDownload = page.waitForEvent("download");
    await page.locator("#settingsSaveAndBackButton").click();
    assert.equal((await backDownload).suggestedFilename(), "Caio Vinicius-configurações-dashboard.js");
    await page.waitForURL("**/index.html");
    await readyIndex();
    assert.equal(await page.locator("#reportAnalystInput").inputValue(), "");
    assert.equal(await page.locator("#reportPlanningInput").inputValue(), "");
    assert.equal(await page.locator("#footerReverseFormLink").isVisible(), true);
    assert.equal((await reportContext()).shiftCapacity, 20000);
    assert.equal(await dashboard.locator("#reportPlanningInput").inputValue(), "3141");
    assert.equal(await dashboard.locator("#reportAnalystInput").inputValue(), "Analista legado");

    // Abrir diretamente e voltar também funciona sem ler ou gravar dados persistentes.
    await page.goto(`${base}/settings.html`);
    await readySettings();
    assert.equal(await page.locator("#settingsAnalystEmail").inputValue(), "");
    assert.equal(await page.locator("#settingsReverseFormVisible").isChecked(), true);
    await page.locator("#settingsBackButton").click();
    await page.waitForURL("**/index.html");
    await readyIndex();
    for (const tab of context.pages()) {
        assert.deepEqual(await tab.evaluate(() => window.storageAccesses), []);
    }
    assert.deepEqual(errors, []);
    console.log(`Configurações: duas guias, nomes dos arquivos, prévia e importação verificados sem usar Storage. Imagens: ${output}`);
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
