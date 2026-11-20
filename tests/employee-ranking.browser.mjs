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
    const routes = Array.from({ length: 13 }, (_, index) => [
        `AT${index + 1}`, "A-01", 50, 50, 50, 0, 0, "2026-11-16 10:00:00",
        "2026-11-16 10:05:29", index === 12 ? "analista.turno@shopee.com" : "[ops123] Maria da Silva Santos",
        "", 0, "Validated", "",
    ]);
    return {
        name: "expedicao-teste.csv",
        mimeType: "text/csv",
        buffer: Buffer.from([header, ...routes].map(row => row.join(",")).join("\n")),
    };
}

function createHistoricalRanking() {
    const operators = Array.from({ length: 151 }, (_, index) => [
        `ops${1000 + index}`, `Colaborador ${index + 1} Teste`, 1,
    ]);
    return [
        ["Rotas Conferidas", "", ""],
        ["ID OPS", "Colaborador", "Quantidade"],
        ["ops123", "Maria Silva", 2],
        ["ops321", "Maria Silva", 9],
        ["", "João de Souza Barbosa", 100],
        ["", "lider.turno@shopee.com", 8],
        ...operators,
    ].map(row => row.join("\t")).join("\n");
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
        window.rankingClipboard = { text: "", html: "", image: null };
        const execCommand = document.execCommand.bind(document);
        document.execCommand = (command, ...args) => {
            if (command !== "copy") return execCommand(command, ...args);
            const clipboardData = new DataTransfer();
            const event = new ClipboardEvent("copy", { clipboardData, cancelable: true });
            document.dispatchEvent(event);
            window.rankingClipboard.text = clipboardData.getData("text/plain");
            window.rankingClipboard.html = clipboardData.getData("text/html");
            return event.defaultPrevented;
        };
        Object.defineProperty(navigator, "clipboard", {
            value: {
                read: async () => {
                    const { html, text } = window.rankingClipboard;
                    const formats = { "text/plain": new Blob([text], { type: "text/plain" }) };
                    if (html) formats["text/html"] = new Blob([html], { type: "text/html" });
                    return [new ClipboardItem(formats)];
                },
                readText: async () => window.rankingClipboard.text,
                write: async items => {
                    for (const item of items) {
                        if (item.types.includes("text/plain")) {
                            window.rankingClipboard.text = await (await item.getType("text/plain")).text();
                        }
                        if (item.types.includes("text/html")) {
                            window.rankingClipboard.html = await (await item.getType("text/html")).text();
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
    assert.equal(await page.locator('table:has(#employeeRankingExpeditionBody) caption').textContent(), "Rotas Conferidas");
    assert.deepEqual(await page.locator('table:has(#employeeRankingExpeditionBody) thead th').allTextContents(), ["Colaborador", "Qtd"]);

    if (process.argv[2]) {
        await importExpedition(process.argv[2]);
        const entries = (await readRanking()).filter(([name]) => name !== "—");
        assert.equal(entries.length, 23);
        assert.ok(entries.every(([name], index) => name.startsWith(`${index + 1}º `)));
        assert.ok(entries.every(([, value]) => /^\d+$/.test(value)));
        assert.equal(entries.reduce((sum, [, value]) => sum + Number(value), 0), 172);
        console.log("Expedição.csv: 172 rotas, 23 conferentes.");
    }

    await importExpedition(createExpeditionFile());
    const currentRanking = await readRanking();
    assert.equal(currentRanking.length, 150);
    assert.deepEqual(currentRanking.filter(([name]) => name !== "—"), [["1º Maria Silva", "12"]]);
    assert.deepEqual(currentRanking[149], ["—", "—"]);
    assert.equal(await page.locator("#expeditionPreviewValidatedRoutes").textContent(), "13");
    assert.equal(await page.locator("#employeeRankingNotificationText").textContent(),
        "Ranking atualizado com os dados de Expedição.");
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
    assert.deepEqual(monthlyRanking[0], ["1º Maria Silva", "14"]);
    assert.deepEqual(monthlyRanking[1], ["2º Maria Silva", "9"]);
    assert.ok(monthlyRanking.slice(2).every(([name, quantity], index) =>
        name.startsWith(`${index + 3}º `) && quantity === "1"));
    assert.equal(await page.locator("#employeeRankingNotificationText").textContent(),
        "Acumulado anterior do ranking importado. 1 registro ficou fora da soma por falta de OPS identificado.");
    const otherRowCounts = await rankingTables.evaluateAll(tables => tables
        .filter(table => !table.querySelector("#employeeRankingExpeditionBody"))
        .map(table => table.tBodies[0].rows.length));
    assert.deepEqual(otherRowCounts, [150, 150, 150, 150]);
    if (process.env.EMPLOYEE_RANKING_SCREENSHOT) {
        await page.locator("#employee-ranking").screenshot({ path: process.env.EMPLOYEE_RANKING_SCREENSHOT });
    }

    await copyButton.click();
    await page.waitForFunction(() => window.rankingClipboard.text.startsWith("RANKING MENSAL DE DESEMPENHO\t"));
    const copied = await page.evaluate(() => window.rankingClipboard.text.split("\n").map(row => row.split("\t")));
    assert.equal(copied.length, 158);
    assert.ok(copied.every(row => row.length === 17));
    assert.deepEqual([0, 4, 8, 12, 15].map(column => copied[3][column]),
        ["Mesa de Recebimento", "Erros de Etiquetagem", "Rotas Conferidas", "Avarias Recebidas", "Pacotes OFF"]);
    assert.deepEqual(copied[5].slice(8, 11), ["ops123", "1º Maria Silva", "14"]);
    assert.deepEqual(copied[6].slice(8, 11), ["ops321", "2º Maria Silva", "9"]);
    assert.match(await page.locator("#employeeRankingNotificationText").textContent(), /C2:S3/);

    const copiedFormat = await page.evaluate(() => {
        const doc = new DOMParser().parseFromString(window.rankingClipboard.html, "text/html");
        const table = doc.querySelector("google-sheets-html-origin table");
        const title = table.rows[0].cells[0];
        const expeditionCells = Array.from(table.rows[5].cells).slice(6, 9);
        return {
            titleSpan: [title.colSpan, title.rowSpan],
            centerAligned: expeditionCells.every(cell => cell.style.textAlign === "center" && cell.style.verticalAlign === "middle"),
            values: expeditionCells.map(cell => cell.textContent),
        };
    });
    assert.deepEqual(copiedFormat, {
        titleSpan: [17, 2],
        centerAligned: true, values: ["ops123", "1º Maria Silva", "14"],
    });

    const operatorsFromCopy = await page.evaluate(async () => {
        const { parseEmployeeRankingClipboard, readEmployeeRankingClipboard } =
            await import("/js/reports/employee-ranking/clipboard.js");
        const clipboard = await readEmployeeRankingClipboard();
        const textWithoutIds = clipboard.text.split("\n")
            .map(row => row.split("\t").filter((_, index) => ![0, 4, 8].includes(index)).join("\t")).join("\n");
        return [
            parseEmployeeRankingClipboard({ text: clipboard.text }).expedition.slice(0, 2),
            parseEmployeeRankingClipboard({ text: textWithoutIds, html: clipboard.html }).expedition.slice(0, 2),
        ];
    });
    for (const records of operatorsFromCopy) {
        assert.deepEqual(records.map(entry => [entry.operator, entry.opsCode, entry.routesChecked]), [
            ["Maria Silva", "ops123", 14], ["Maria Silva", "ops321", 9],
        ]);
    }

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
    await page.waitForFunction(() => window.rankingClipboard.text.startsWith("RANKING MENSAL DE DESEMPENHO\t"));
    const copiedAfterClear = await page.evaluate(() => window.rankingClipboard.text.split("\n").map(row => row.split("\t")));
    assert.deepEqual(copiedAfterClear[5].slice(8, 11), ["ops123", "1º Maria Silva", "12"]);
    assert.equal(copiedAfterClear.length, 158);
    assert.ok(copiedAfterClear.slice(6).every(row => row.every(value => value === "")));

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

    await page.locator('a[href="#receipt"]').click();
    await page.locator('a[href="#receipt-tables"]').click();
    await page.locator("#receiptFileInput").setInputFiles({
        name: "recebimento-teste.csv",
        mimeType: "text/csv",
        buffer: Buffer.from([
            "SPX Tracking Number,Order Status,Task ID,Operator",
            "BR1,LMHub_Received,RT001,analista.turno@shopee.com",
            "BR2,LMHub_Received,RT001,[ops30] Ana Maria Lima",
        ].join("\n")),
    });
    await page.waitForFunction(() => document.querySelector("#receiptNotification").dataset.notificationType === "success");
    assert.equal(await page.locator("#receiptPreviewReceived").textContent(), "2");
    await page.locator('select[aria-label="Erros do etiquetador de Analista"]').evaluate(select => {
        select.value = "1";
        select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    assert.equal(await page.locator("#receiptPreviewErrors").textContent(), "1");
    await openRanking();
    assert.deepEqual(await page.locator('#employeeRankingReceiptBody tr:not([data-placeholder]) td').allTextContents(),
        ["1º Ana Maria", "1"]);
    assert.equal(await page.locator('#employeeRankingLabelingErrorsBody tr:not([data-placeholder])').count(), 0);
    assert.equal(await page.locator("#employeeRankingNotificationText").textContent(),
        "Ranking atualizado com os dados de Processamento e Expedição.");

    assert.deepEqual(errors, []);
    console.log("Ranking de Colaboradores: importação, expansão, cópia, imagem e restauração verificadas.");
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
