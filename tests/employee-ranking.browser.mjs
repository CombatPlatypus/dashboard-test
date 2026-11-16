// Execute com Playwright em NODE_PATH. Um argumento opcional indica o arquivo
// Expedição.csv fornecido para a verificação das 172 rotas e 23 conferentes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".json": "application/json",
};
const server = createServer(async (request, response) => {
    try {
        const { pathname } = new URL(request.url, "http://localhost");
        const target = path.resolve(root, `.${decodeURIComponent(pathname === "/" ? "/index.html" : pathname)}`);
        if (!target.startsWith(root)) throw new Error("Caminho inválido");
        response.setHeader("Content-Type", mimeTypes[path.extname(target)] ?? "application/octet-stream");
        response.end(await readFile(target));
    } catch {
        response.writeHead(404).end();
    }
});

function createExpeditionFile() {
    const header = [
        "AT/TO", "Corridor/Cage", "Total Initial Orders Inside AT/TO",
        "Total Final Orders Inside AT/TO", "Total Scanned Orders", "Missorted Orders",
        "Missing Orders", "Validation Start Time", "Validation End Time", "Validation Operator",
        "Revalidation Operator", "Revalidated Count", "AT/TO Validation Status", "Remark",
    ];
    const routes = Array.from({ length: 12 }, (_, index) => [
        `AT${index + 1}`, "A-01", 50, 50, 50, 0, 0, "2026-11-16 10:00:00",
        "2026-11-16 10:05:29", "[ops123] Maria da Silva Santos", "", 0, "Validated", "",
    ]);
    return {
        name: "expedicao-teste.csv",
        mimeType: "text/csv",
        buffer: Buffer.from([header, ...routes].map(row => row.join(",")).join("\n")),
    };
}

function createHistoricalRanking() {
    function spreadsheetRow(expedition) {
        return ["", "", "", "", "", "", "", "", "", "", ...expedition, "", "", "", ""].join("\t");
    }

    const operators = Array.from({ length: 151 }, (_, index) => [
        `Colaborador ${index + 1} Teste`, 1, "01:00",
    ]);
    return [
        spreadsheetRow(["Rotas Conferidas e Tempo Médio", "", ""]),
        spreadsheetRow(["Colaborador", "Quantidade", "Tempo"]),
        spreadsheetRow(["maria da silva santos", 2, "05:36"]),
        spreadsheetRow(["Maria da Silva Rodrigues", 9, "03:00"]),
        ...operators.map(spreadsheetRow),
    ].join("\n");
}

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await browser.newPage({ viewport: { width: 1700, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("dialog", dialog => dialog.accept());
    await page.addInitScript(() => {
        window.rankingClipboard = { text: "", image: null };
        Object.defineProperty(navigator, "clipboard", {
            value: {
                readText: async () => window.rankingClipboard.text,
                writeText: async text => { window.rankingClipboard.text = text; },
                write: async items => {
                    for (const item of items) {
                        if (item.types.includes("text/plain")) {
                            window.rankingClipboard.text = await (await item.getType("text/plain")).text();
                        }
                        if (item.types.includes("image/png")) {
                            const blob = await item.getType("image/png");
                            const bitmap = await createImageBitmap(blob);
                            window.rankingClipboard.image = { type: blob.type, width: bitmap.width, height: bitmap.height };
                            bitmap.close();
                        }
                    }
                },
            },
        });
    });
    await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => document.querySelectorAll("#switch-spreadsheet .tabs-title").length > 0);
    await page.locator('a[href="#reports"]').click();

    const bodySelector = "#employeeRankingExpeditionBody";
    const rows = page.locator(`${bodySelector} tr`);
    const rankLink = page.locator('a[href="#employee-ranking"]');
    const rankingTables = page.locator("#employee-ranking table");
    const clearButton = page.locator("#employeeRankingClearButton");
    const copyButton = page.locator("#employeeRankingCopyButton");

    async function openRanking() {
        await page.locator('a[href="#overall-analysis"]').click();
        if (!(await page.locator("#employee-ranking").isVisible())) {
            await rankLink.click();
        }
        assert.equal(await rankingTables.count(), 5);
    }

    async function importExpedition(file) {
        await page.locator('a[href="#expedition"]').click();
        await page.locator("#expeditionFileInput").setInputFiles(file);
        await page.waitForFunction(() => document.querySelector("#expeditionNotification").dataset.notificationType === "success"
            && !document.querySelector("#expeditionImportActionButton").disabled);
        await openRanking();
    }

    async function readRanking() {
        return rows.evaluateAll(elements => elements.map(row =>
            Array.from(row.cells, cell => cell.textContent.trim())));
    }

    await openRanking();
    for (const table of await rankingTables.all()) {
        assert.equal(await table.locator("tbody tr").count(), 150);
    }

    if (process.argv[2]) {
        await importExpedition(process.argv[2]);
        const entries = (await readRanking()).filter(([name]) => name !== "—");
        assert.equal(entries.length, 23);
        assert.ok(entries.every(([, value]) => /^\d+ \/ \d{2}:\d{2}$/.test(value)));
        assert.equal(entries.reduce((sum, [, value]) => sum + Number(value.split(" / ")[0]), 0), 172);
        console.log("Expedição.csv: 172 rotas, 23 conferentes.");
    }

    await importExpedition(createExpeditionFile());
    const currentRanking = await readRanking();
    assert.equal(currentRanking.length, 150);
    assert.deepEqual(currentRanking[0], ["Maria Silva", "12 / 05:29"]);
    assert.deepEqual(currentRanking[149], ["—", "—"]);
    assert.equal(await clearButton.isDisabled(), true);

    const hasStickyHeader = await page.locator(bodySelector).evaluate(body => {
        const header = body.closest("table").tHead.rows[0].cells[0];
        for (let container = body.parentElement; container; container = container.parentElement) {
            if (!["auto", "scroll"].includes(getComputedStyle(container).overflowY)) continue;
            if (container.scrollHeight <= container.clientHeight) continue;

            container.scrollTop = 150;
            const firstTop = header.getBoundingClientRect().top;
            container.scrollTop = 300;
            const secondTop = header.getBoundingClientRect().top;
            container.scrollTop = 0;
            return Math.abs(firstTop - secondTop) <= 1
                && secondTop >= container.getBoundingClientRect().top - 1;
        }
        return false;
    });
    assert.ok(hasStickyHeader, "O cabeçalho de Expedição deve permanecer visível durante a rolagem.");

    await page.evaluate(text => { window.rankingClipboard.text = text; }, createHistoricalRanking());
    await page.locator("#employeeRankingImportButton").click();
    await page.waitForFunction(selector => document.querySelector(selector).rows.length === 153, bodySelector);
    const monthlyRanking = await readRanking();
    assert.deepEqual(monthlyRanking[0], ["Maria Silva", "14 / 05:30"]);
    assert.deepEqual(monthlyRanking[1], ["Maria Silva", "9 / 03:00"]);
    const otherRowCounts = await rankingTables.evaluateAll(tables => tables
        .filter(table => !table.querySelector("#employeeRankingExpeditionBody"))
        .map(table => table.tBodies[0].rows.length));
    assert.deepEqual(otherRowCounts, [150, 150, 150, 150]);
    if (process.env.EMPLOYEE_RANKING_SCREENSHOT) {
        await page.locator("#employee-ranking").screenshot({ path: process.env.EMPLOYEE_RANKING_SCREENSHOT });
    }

    await copyButton.click();
    await page.waitForFunction(() => window.rankingClipboard.text.startsWith("Maria da Silva Santos\t"));
    const copied = await page.evaluate(() => window.rankingClipboard.text.split(/\r?\n/));
    assert.equal(copied.length, 153);
    assert.equal(copied[0], "Maria da Silva Santos\t14\t00:05:30");
    assert.equal(copied[1], "Maria da Silva Rodrigues\t9\t00:03:00");

    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll("#switch-spreadsheet .tabs-title").length > 0);
    await page.locator('a[href="#reports"]').click();
    await openRanking();
    assert.deepEqual(await readRanking(), monthlyRanking);

    await clearButton.click();
    await page.waitForFunction(selector => document.querySelector(selector).rows.length === 150, bodySelector);
    assert.deepEqual(await readRanking(), currentRanking);
    assert.equal(await clearButton.isDisabled(), true);
    assert.equal(await page.locator("#expeditionPreviewOperatorBody tr").first().locator("td").nth(1).textContent(), "12");

    await copyButton.click();
    await page.waitForFunction(() => window.rankingClipboard.text.startsWith("Maria da Silva Santos\t"));
    const copiedAfterClear = await page.evaluate(() => window.rankingClipboard.text.split(/\r?\n/));
    assert.equal(copiedAfterClear[0], "Maria da Silva Santos\t12\t00:05:29");
    assert.equal(copiedAfterClear.length, 153);
    assert.ok(copiedAfterClear.slice(1).every(row => row === "\t\t"));

    const imageButton = page.locator("#employeeRankingImageButton");
    await imageButton.click();
    await page.waitForFunction(() => window.rankingClipboard.image?.type === "image/png", null, { timeout: 60000 });
    const image = await page.evaluate(() => window.rankingClipboard.image);
    assert.ok(image.width > 0 && image.height > 0);

    const pendingDownload = page.waitForEvent("download");
    await imageButton.hover();
    await page.mouse.down();
    const download = await pendingDownload;
    await page.mouse.up();
    assert.equal(download.suggestedFilename(), "ranking-de-colaboradores.png");

    assert.deepEqual(errors, []);
    console.log("Ranking de Colaboradores: importação, expansão, cópia, imagem e restauração verificadas.");
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
