// Executar com Playwright em NODE_PATH. Usa duas guias, sessionStorage e bloqueia localStorage.
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
const settingsSessionKey = "dashboard-settings-session-v1";
const reportsSessionKey = "dashboard-report-session-v1";
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
        for (const key of ["localStorage"]) {
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
    const sessionSettings = tab => tab.evaluate(key => JSON.parse(sessionStorage.getItem(key)), settingsSessionKey);
    const sessionReports = tab => tab.evaluate(key => JSON.parse(sessionStorage.getItem(key)), reportsSessionKey);
    const themeColors = () => page.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        body: getComputedStyle(document.body).backgroundColor,
        menu: getComputedStyle(document.querySelector(".main-menu")).backgroundColor,
        notification: getComputedStyle(document.querySelector(".warning")).backgroundColor,
        footer: getComputedStyle(document.querySelector("footer")).backgroundColor,
        input: getComputedStyle(document.getElementById("settingsAnalystEmail") ?? document.getElementById("reportAnalystInput")).backgroundColor,
    }));

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
        const linehaul = await import("/js/reports/receipt/linehaul-state.js");
        linehaul.restoreReceiptLinehaulState({ manualEntryEnabled: true, linehauls: [
            { code: "LH-001", driver: "Ana", origin: "Campinas", loadedOrders: 1800, selected: true },
            { code: "LH-002", driver: "João", origin: "Jundiaí", loadedOrders: 1300, selected: true },
        ] });
        const reverse = await import("/js/reports/reverse/state.js");
        reverse.restoreReverseState({ transfers: [{ to: "TESTE", quantities: { damaged: 3 } }] });
    });
    const reportsBefore = await page.evaluate(async () =>
        (await import("/js/reports/core/report-manager.js")).reportManager.exportSession());
    const reportFileEvent = page.waitForEvent("download");
    await page.locator("#reportDownloadButton").click();
    const reportFile = await reportFileEvent;
    assert.match(reportFile.suggestedFilename(), /^sessao-dashboard-.*\.js$/);
    const reportFileSource = await readFile(await reportFile.path(), "utf8");
    const fileSnapshot = JSON.parse(reportFileSource.match(/^const DASHBOARD_REPORT_SESSION = ([\s\S]*);\s*$/)[1]);
    const savedReports = await sessionReports(page);
    assert.deepEqual(savedReports.reports, reportsBefore);
    for (const id of Object.keys(fileSnapshot.reports)) {
        assert.deepEqual(savedReports.reports[id], fileSnapshot.reports[id]);
    }
    assert.deepEqual(savedReports.context, fileSnapshot.context);
    await page.locator("#reportPlanningInput").fill("9999");
    await page.reload();
    await readyIndex();
    await page.waitForFunction(() => document.getElementById("reportPlanningInput").value === "3141");
    assert.equal(await page.locator("#reportAnalystInput").inputValue(), "");
    assert.deepEqual(await page.evaluate(async () =>
        (await import("/js/reports/core/report-manager.js")).reportManager.exportSession()), reportsBefore);
    await page.locator('a[href="#reports"]').click();
    const dashboard = page;
    const initialSettings = await dashboard.evaluate(async () =>
        (await import("/js/spreadsheets/load-spreadsheets.js")).exportDashboardSettings());
    const newTab = context.waitForEvent("page");
    await page.locator("#dashboardSettingsLink").click();
    page = await newTab;
    await page.waitForURL("**/settings.html");
    await readySettings();
    assert.equal(await page.locator("#settingsFeedback, .settings-feedback").count(), 0);
    assert.equal(await page.locator("#settingsNotification").isVisible(), true);
    assert.deepEqual(await sessionSettings(page), initialSettings, "A nova guia recebe uma cópia das configurações do dashboard.");
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
    await page.locator('a[href="#settings-themes"]').click();
    const previewColors = await page.locator("[data-dashboard-theme]").evaluateAll(cards =>
        cards.map(card => getComputedStyle(card).backgroundColor));
    for (const [theme, body, container, input = theme === "default" ? container : body] of [
        ["default", "rgb(0, 0, 0)", "rgb(16, 16, 16)"],
        ["red", "rgb(26, 5, 5)", "rgb(51, 11, 13)", "rgb(37, 7, 9)"],
        ["blue", "rgb(5, 15, 32)", "rgb(10, 28, 56)", "rgb(7, 22, 46)"],
        ["green", "rgb(3, 22, 12)", "rgb(7, 42, 24)", "rgb(5, 31, 18)"],
        ["pink", "rgb(27, 7, 18)", "rgb(48, 14, 34)", "rgb(36, 10, 25)"],
        ["purple", "rgb(21, 7, 33)", "rgb(35, 12, 54)", "rgb(28, 8, 44)"],
    ]) {
        await page.locator(`[data-dashboard-theme="${theme}"] > div`).first().click();
        const colors = await themeColors();
        assert.deepEqual(colors, { theme, body, menu: container, notification: container,
            footer: container, input });
        assert.equal(await page.locator('[data-dashboard-theme][aria-checked="true"]').count(), 1);
        assert.equal(await page.locator(`[data-dashboard-theme="${theme}"]`).getAttribute("aria-checked"), "true");
        assert.deepEqual(await page.locator("[data-dashboard-theme]").evaluateAll(cards =>
            cards.map(card => getComputedStyle(card).backgroundColor)), previewColors);
    }
    await page.locator('[data-dashboard-theme="purple"]').press("ArrowRight");
    assert.equal((await themeColors()).theme, "default");
    await page.locator('[data-dashboard-theme="default"]').press("End");
    assert.equal((await themeColors()).theme, "purple");
    await page.locator('[data-dashboard-theme="pink"]').focus();
    await page.locator('[data-dashboard-theme="pink"]').press("Enter");
    assert.equal((await themeColors()).theme, "pink");
    await page.locator('[data-dashboard-theme="purple"]').focus();
    await page.locator('[data-dashboard-theme="purple"]').press("Space");
    assert.equal((await themeColors()).theme, "purple");
    await page.screenshot({ path: path.join(output, "tema-roxo-configuracoes.png"), fullPage: true });
    const downloadEvent = page.waitForEvent("download");
    await page.locator("#settingsSaveButton").click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(), "Caio Vinicius-configurações-dashboard.js");
    const exported = await readFile(await download.path(), "utf8");
    const saved = parseDashboardSettingsFile(exported);
    assert.equal(saved.theme, "purple");
    assert.deepEqual(saved.profile, { name: "Caio Vinicius", email: "caio.vinicius@shopee.com", shift: "PM2", icon: "owl" });
    assert.equal(saved.footerVisibility.reverseForm, false);
    assert.equal(saved.spreadsheets[0].menuName, "Minha Planilha");
    assert.equal(saved.spreadsheets[1].visible, false);
    assert.deepEqual(await sessionSettings(page), saved);
    assert.match(page.url(), /settings\.html/);

    // Recarregar restaura a última cópia salva e descarta apenas o rascunho.
    await page.locator('[data-dashboard-theme="green"]').click();
    await page.locator('a[href="#profile"]').click();
    await choose("settingsAnalystShift", "PM1");
    await page.reload();
    await readySettings();
    assert.equal((await themeColors()).theme, "purple");
    assert.equal(await page.locator('[data-dashboard-theme="purple"]').getAttribute("aria-checked"), "true");
    assert.equal(await page.locator("#settingsAnalystEmail").inputValue(), "caio.vinicius@shopee.com");
    assert.equal(await page.locator("#settingsAnalystName").inputValue(), "Caio Vinicius");
    assert.equal(await page.locator("#settingsAnalystShift").inputValue(), "PM2");
    assert.equal(await page.locator("#settingsReverseFormVisible").isChecked(), false);
    await importSource("#settingsFileInput", "arquivo inválido");
    await page.waitForFunction(() => document.getElementById("settingsNotification").dataset.notificationType === "error");
    assert.match(await page.locator("#settingsNotificationText").textContent(), /formato/);
    assert.match(await page.locator("#settingsNotificationIcon").getAttribute("src"), /error-icon\.svg$/);
    assert.equal(await page.locator("#settingsAnalystName").inputValue(), "Caio Vinicius");
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

    // A paleta roxa distingue superfícies e mantém texto e bordas consistentes nos relatórios.
    await importSource("#reportSessionFileInput", exported);
    await page.waitForFunction(() => document.documentElement.dataset.theme === "purple");
    await page.locator('a[href="#reports"]').click();
    await page.waitForFunction(() =>
        getComputedStyle(document.querySelector("#receiptLinehaulControls input")).backgroundColor === "rgb(28, 8, 44)" &&
        getComputedStyle(document.querySelector("#reportWindowInput + .select2-container .select2-selection")).backgroundColor === "rgb(28, 8, 44)");
    const reportPalette = () => page.evaluate(() => {
        const styles = element => getComputedStyle(element);
        const root = styles(document.documentElement);
        const row = document.querySelector("#receiptLinehaulPreviewBody tr:nth-child(2)");
        const header = row.closest("table").querySelector("thead th");
        return {
            body: styles(document.body).backgroundColor,
            container: styles(document.getElementById("receiptLinehaulExportArea")).backgroundColor,
            input: styles(document.querySelector("#receiptLinehaulControls input")).backgroundColor,
            select: styles(document.querySelector("#reportWindowInput + .select2-container .select2-selection")).backgroundColor,
            row: styles(row).backgroundColor,
            header: styles(header).backgroundColor,
            headerText: styles(header).color,
            rowText: styles(row.querySelector("td")).color,
            border: styles(header).borderTopColor,
            rootScrollbar: getComputedStyle(document.documentElement, "::-webkit-scrollbar-thumb").backgroundColor,
            controlsScrollbar: getComputedStyle(document.querySelector("#receipt-controls .input-group:last-of-type"), "::-webkit-scrollbar-thumb").backgroundColor,
            analysisScrollbar: getComputedStyle(document.querySelector("#analysis .analysis-table-container"), "::-webkit-scrollbar-thumb").backgroundColor,
            hover: root.getPropertyValue("--color-container-houver").trim(),
            focus: root.getPropertyValue("--color-container-focus").trim(),
        };
    });
    assert.deepEqual(await reportPalette(), {
        body: "rgb(21, 7, 33)", container: "rgb(35, 12, 54)", input: "rgb(28, 8, 44)",
        select: "rgb(28, 8, 44)", row: "rgb(45, 16, 69)", header: "rgb(70, 25, 105)",
        headerText: "rgb(228, 230, 235)", rowText: "rgb(228, 230, 235)", border: "rgb(140, 67, 199)",
        rootScrollbar: "rgb(140, 67, 199)", controlsScrollbar: "rgb(140, 67, 199)",
        analysisScrollbar: "rgb(140, 67, 199)", hover: "#35124f", focus: "#40175f",
    });
    await page.locator('a[href="#analysis"]').hover();
    assert.equal(await page.locator('a[href="#analysis"]').evaluate(link => getComputedStyle(link).backgroundColor), "rgb(53, 18, 79)");
    await page.evaluate(() => {
        const button = document.createElement("button");
        button.id = "purpleButtonProbe";
        button.className = "button";
        button.textContent = "Ação";
        document.getElementById("receiptLinehaulExportArea").append(button);
    });
    await page.locator("#purpleButtonProbe").hover();
    assert.equal(await page.locator("#purpleButtonProbe").evaluate(button => getComputedStyle(button).color), "rgb(228, 230, 235)");
    await page.locator("#purpleButtonProbe").evaluate(button => button.remove());
    await page.setViewportSize({ width: 1920, height: 1200 });
    await page.mouse.move(0, 0);
    await page.screenshot({ path: path.join(output, "tema-roxo-relatorios-refinado.png"), fullPage: true });
    await page.setViewportSize({ width: 1600, height: 1050 });

    // O importador do index aceita configurações sem substituir os relatórios.
    const imported = structuredClone(saved);
    imported.profile = { name: "Fernando Ferrari", email: "fernando.ferrari@shopee.com", shift: "PM1", icon: "cat" };
    imported.footerVisibility.damageApp = false;
    imported.theme = "blue";
    await importSource("#reportSessionFileInput", serializeDashboardSettingsFile(imported));
    await page.waitForFunction(() => document.getElementById("reportAnalystInput").value === "Fernando Ferrari");
    assert.equal(await page.locator("#footerDamageAppLink").isVisible(), false);
    assert.equal(await page.locator("#reportPlanningInput").inputValue(), "3141");
    assert.match(await page.locator(".main-menu [data-dashboard-profile-icon]").getAttribute("src"), /cat-icon\.svg$/);
    assert.deepEqual(await sessionSettings(page), imported);
    assert.equal((await themeColors()).theme, "blue");
    await page.waitForFunction(() =>
        getComputedStyle(document.querySelector("#receiptLinehaulControls input")).backgroundColor === "rgb(7, 22, 46)" &&
        getComputedStyle(document.querySelector("#reportWindowInput + .select2-container .select2-selection")).backgroundColor === "rgb(7, 22, 46)");
    assert.deepEqual(await reportPalette(), {
        body: "rgb(5, 15, 32)", container: "rgb(10, 28, 56)", input: "rgb(7, 22, 46)",
        select: "rgb(7, 22, 46)", row: "rgb(16, 41, 75)", header: "rgb(28, 77, 150)",
        headerText: "rgb(228, 230, 235)", rowText: "rgb(228, 230, 235)", border: "rgb(66, 121, 184)",
        rootScrollbar: "rgb(66, 121, 184)", controlsScrollbar: "rgb(66, 121, 184)",
        analysisScrollbar: "rgb(66, 121, 184)", hover: "#123565", focus: "#174381",
    });
    await page.locator('a[href="#analysis"]').hover();
    assert.equal(await page.locator('a[href="#analysis"]').evaluate(link => getComputedStyle(link).backgroundColor), "rgb(18, 53, 101)");
    await page.locator('#report-choice a[href="#planning"]').click();
    assert.equal(await page.locator("#planningSheetPreview .title").evaluate(title => getComputedStyle(title).borderTopColor), "rgb(66, 121, 184)");
    assert.equal(await page.locator('#report-choice .is-active > a').evaluate(link => getComputedStyle(link).boxShadow), "none");
    await page.setViewportSize({ width: 1920, height: 1200 });
    await page.mouse.move(0, 0);
    await page.screenshot({ path: path.join(output, "tema-azul-lapis-lazuli.png"), fullPage: true });
    const rgb = hex => `rgb(${hex.slice(1).match(/../g).map(value => Number.parseInt(value, 16)).join(", ")})`;
    for (const [theme, label, palette] of [
        ["red", "vermelho", { body: "#1a0505", container: "#330b0d", input: "#250709", row: "#431013",
            hover: "#58171b", focus: "#702027", header: "#8a2730", border: "#c94955" }],
        ["green", "verde", { body: "#03160c", container: "#072a18", input: "#051f12", row: "#0a3821",
            hover: "#0c4829", focus: "#105b34", header: "#146f3f", border: "#31a66a" }],
        ["pink", "rosa", { body: "#1b0712", container: "#300e22", input: "#240a19", row: "#40132e",
            hover: "#551b3e", focus: "#6b2450", header: "#813061", border: "#d35a9d" }],
    ]) {
        await importSource("#reportSessionFileInput", serializeDashboardSettingsFile({ ...imported, theme }));
        await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
        await page.locator('#report-choice a[href="#receipt"]').click();
        await page.waitForFunction(color =>
            getComputedStyle(document.querySelector("#receiptLinehaulControls input")).backgroundColor === color &&
            getComputedStyle(document.querySelector("#reportWindowInput + .select2-container .select2-selection")).backgroundColor === color,
        rgb(palette.input));
        assert.deepEqual(await reportPalette(), {
            body: rgb(palette.body), container: rgb(palette.container), input: rgb(palette.input),
            select: rgb(palette.input), row: rgb(palette.row), header: rgb(palette.header),
            headerText: "rgb(228, 230, 235)", rowText: "rgb(228, 230, 235)", border: rgb(palette.border),
            rootScrollbar: rgb(palette.border), controlsScrollbar: rgb(palette.border),
            analysisScrollbar: rgb(palette.border), hover: palette.hover, focus: palette.focus,
        });
        await page.locator('a[href="#analysis"]').hover();
        assert.equal(await page.locator('a[href="#analysis"]').evaluate(link => getComputedStyle(link).backgroundColor), rgb(palette.hover));
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement)
            .getPropertyValue("--color-button-text").trim()), "#e4e6eb");
        assert.equal((await sessionSettings(page)).theme, theme);
        await page.locator('#report-choice a[href="#planning"]').click();
        await page.mouse.move(0, 0);
        await page.screenshot({ path: path.join(output, `tema-${label}-refinado.png`), fullPage: true });
    }
    await importSource("#reportSessionFileInput", serializeDashboardSettingsFile(imported));
    await page.waitForFunction(() => document.documentElement.dataset.theme === "blue");
    await page.setViewportSize({ width: 1600, height: 1050 });
    await page.reload();
    await readyIndex();
    await page.waitForFunction(() => document.getElementById("reportAnalystInput").value === "Fernando Ferrari");
    assert.equal(await page.locator("#reportPlanningInput").inputValue(), "3141");
    assert.equal(await page.locator("#reportWindowInput").inputValue(), "PM1");
    assert.equal(await page.locator("#footerDamageAppLink").isVisible(), false);
    assert.equal((await themeColors()).theme, "blue");

    // Sessões antigas continuam legíveis e não restauram capacidades antigas.
    const legacy = await page.evaluate(async () =>
        (await import("/js/reports/session.js")).createReportSessionPayload());
    delete legacy.settings.profile;
    delete legacy.settings.footerVisibility;
    delete legacy.settings.theme;
    legacy.context.analyst = "Analista legado";
    legacy.context.shiftCapacity = 5000;
    await importSource("#reportSessionFileInput", `const DASHBOARD_REPORT_SESSION = ${JSON.stringify(legacy)};`);
    await page.waitForFunction(() => document.getElementById("reportAnalystInput").value === "Analista legado");
    assert.equal((await reportContext()).shiftCapacity, 20000);
    assert.equal(await page.locator("#footerDamageAppLink").isVisible(), true);
    assert.equal((await themeColors()).theme, "default");
    // Um novo tema sobre uma sessão antiga não altera o analista e o turno dos relatórios.
    await page.evaluate(([settingsKey, reportsKey]) => {
        const settings = JSON.parse(sessionStorage.getItem(settingsKey));
        settings.theme = "green";
        sessionStorage.setItem(settingsKey, JSON.stringify(settings));
        const reports = JSON.parse(sessionStorage.getItem(reportsKey));
        delete reports.settings.theme;
        sessionStorage.setItem(reportsKey, JSON.stringify(reports));
    }, [settingsSessionKey, reportsSessionKey]);
    await page.reload();
    await readyIndex();
    await page.waitForFunction(() => document.getElementById("reportAnalystInput").value === "Analista legado");
    assert.equal(await page.locator("#reportPlanningInput").inputValue(), "3141");
    assert.equal((await themeColors()).theme, "green");

    page = settingsPage;
    await page.locator('a[href="#another-links"]').click();
    await page.locator("#settingsDamageAppLink").fill("link-invalido");
    await page.locator("#settingsSaveAndBackButton").click();
    assert.match(page.url(), /settings\.html/);
    assert.match(await page.locator("#settingsNotificationText").textContent(), /Confira/);
    assert.equal(await page.locator("#settingsNotification").getAttribute("data-notification-type"), "error");
    assert.match(await page.locator("#settingsNotificationIcon").getAttribute("src"), /error-icon\.svg$/);
    await page.locator("#settingsDamageAppLink").fill(saved.externalLinks.damageApp);
    const backDownload = page.waitForEvent("download");
    await page.locator("#settingsSaveAndBackButton").click();
    assert.equal((await backDownload).suggestedFilename(), "Caio Vinicius-configurações-dashboard.js");
    await page.waitForURL("**/index.html");
    await readyIndex();
    assert.equal(await page.locator("#reportAnalystInput").inputValue(), "Caio Vinicius");
    assert.equal((await themeColors()).theme, "purple");
    assert.equal(await page.locator("#reportPlanningInput").inputValue(), "3141");
    assert.equal(await page.locator("#footerReverseFormLink").isVisible(), false);
    assert.equal((await reportContext()).shiftCapacity, 20000);
    assert.equal(await dashboard.locator("#reportPlanningInput").inputValue(), "3141");
    assert.equal(await dashboard.locator("#reportAnalystInput").inputValue(), "Analista legado");

    // Reabrir pelo botão leva todas as preferências aplicadas no index para a nova guia.
    const configuredDashboard = page;
    const currentSettings = await page.evaluate(async () =>
        (await import("/js/spreadsheets/load-spreadsheets.js")).exportDashboardSettings());
    await page.evaluate(([key, settings]) => {
        sessionStorage.setItem(key, JSON.stringify({ ...settings, theme: "red",
            profile: { ...settings.profile, name: "Fernando Ferrari", email: "fernando.ferrari@shopee.com", shift: "PM1" } }));
    }, [settingsSessionKey, currentSettings]);
    const reopenedTabEvent = context.waitForEvent("page");
    await page.locator("#dashboardSettingsLink").click();
    page = await reopenedTabEvent;
    await page.waitForURL("**/settings.html");
    await readySettings();
    assert.equal(configuredDashboard.isClosed(), false);
    assert.deepEqual(await sessionSettings(page), currentSettings);
    const populatedSettings = await page.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        profile: Object.fromEntries([...document.querySelectorAll("[data-dashboard-profile-field]")]
            .map(input => [input.dataset.dashboardProfileField, input.value])),
        spreadsheets: [...document.querySelectorAll("[data-dashboard-spreadsheet-row]")].map(row => ({
            link: row.querySelector('[data-dashboard-spreadsheet-field="link"]').value,
            menuName: row.querySelector('[data-dashboard-spreadsheet-field="menuName"]').value,
            visible: row.querySelector('[data-dashboard-spreadsheet-field="visible"]').value === "show",
        })),
        externalLinks: Object.fromEntries([...document.querySelectorAll("[data-dashboard-external-link]")]
            .map(input => [input.dataset.dashboardExternalLink, input.value])),
        footerVisibility: Object.fromEntries([...document.querySelectorAll("[data-dashboard-footer-visible]")]
            .map(input => [input.dataset.dashboardFooterVisible, input.checked])),
    }));
    assert.deepEqual(populatedSettings, currentSettings);
    assert.equal(await page.locator(`[data-dashboard-theme="${currentSettings.theme}"]`).getAttribute("aria-checked"), "true");
    await choose("settingsAnalystName", "Thamyris Dias");
    assert.deepEqual(await sessionSettings(configuredDashboard), currentSettings);
    assert.deepEqual(await configuredDashboard.evaluate(async () =>
        (await import("/js/spreadsheets/load-spreadsheets.js")).exportDashboardSettings()), currentSettings);
    assert.equal(await configuredDashboard.locator("#reportPlanningInput").inputValue(), "3141");
    await page.close();
    page = configuredDashboard;

    // A mesma aba compartilha as configurações entre o dashboard e o editor.
    await page.goto(`${base}/settings.html`);
    await readySettings();
    assert.equal(await page.locator("#settingsAnalystEmail").inputValue(), "caio.vinicius@shopee.com");
    assert.equal(await page.locator("#settingsReverseFormVisible").isChecked(), false);
    await page.locator("#settingsBackButton").click();
    await page.waitForURL("**/index.html");
    await readyIndex();
    assert.equal(await page.locator("#reportAnalystInput").inputValue(), "Caio Vinicius");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await readyIndex();
    assert.equal(await page.locator("#reportAnalystInput").inputValue(), "");
    assert.equal((await themeColors()).theme, "default");
    assert.equal(await page.locator("#footerReverseFormLink").isVisible(), true);

    // Falhas do armazenamento não impedem baixar o arquivo nem indicam sucesso da cópia na aba.
    await page.goto(`${base}/settings.html`);
    await readySettings();
    await page.evaluate(key => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (name, value) {
            if (name === key) throw new DOMException("Limite de armazenamento", "QuotaExceededError");
            return original.call(this, name, value);
        };
    }, settingsSessionKey);
    const fallbackDownload = page.waitForEvent("download");
    await page.locator("#settingsSaveAndBackButton").click();
    assert.equal((await fallbackDownload).suggestedFilename(), "configurações-dashboard.js");
    assert.match(page.url(), /settings\.html/);
    assert.equal(await page.locator("#settingsNotification").getAttribute("data-notification-type"), "warning");
    assert.match(await page.locator("#settingsNotificationText").textContent(), /Arquivo .* salvo.*Não foi possível/);
    assert.equal(await sessionSettings(page), null);
    for (const tab of context.pages()) {
        assert.deepEqual(await tab.evaluate(() => window.storageAccesses), []);
    }
    assert.deepEqual(errors, []);
    console.log(`Configurações e relatórios: arquivos, sessionStorage, restauração, prioridade das preferências e falha de armazenamento verificados. Imagens: ${output}`);
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
