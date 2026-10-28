// Run with Playwright in NODE_PATH. RECEIPT_LAYOUT_FILES may contain a JSON array
// of local CSV/XLSX paths to check in addition to the generated fixtures.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const XLSX = require("../js/libraries/xlsx.full.min.js");
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const server = createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
        const target = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
        if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid path");
        const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
            ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
        response.setHeader("Content-Type", `${mime[path.extname(target)] || "application/octet-stream"};charset=utf-8`);
        response.end(await readFile(target));
    } catch { response.writeHead(404).end(); }
});

function createReceiptFile(operatorCount, extension) {
    const rows = [["SPX Tracking Number", "Order Status", "Task ID", "Operator"]];
    for (let index = 0; index < operatorCount; index += 1) {
        for (let quantity = 0; quantity < 3; quantity += 1) {
            rows.push([`BR${index}-${quantity}`, "LMHub_Received", "RT001", `Operador ${index + 1}`]);
        }
    }
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Recebimento");
    return {
        name: `recebimento-${operatorCount}.${extension}`,
        mimeType: extension === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: extension === "csv" ? Buffer.from(XLSX.utils.sheet_to_csv(sheet))
            : Buffer.from(XLSX.write(workbook, { type: "array", bookType: extension })),
    };
}

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await browser.newPage({ viewport: { width: 1850, height: 950 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => document.querySelectorAll("#switch-spreadsheet .tabs-title").length > 0);
    await page.locator('a[href="#reports"]').click();
    await page.locator('a[href="#receipt-tables"]').click();
    await page.locator("#receiptOperatorControls").waitFor({ state: "visible" });

    async function layoutMetrics() {
        return page.evaluate(() => {
            const bottom = element => element.getBoundingClientRect().bottom + window.scrollY;
            const footerBottom = bottom(document.querySelector("footer"));
            return {
                height: document.documentElement.scrollHeight,
                footerBottom,
                overflow: document.documentElement.scrollHeight - Math.max(window.innerHeight, Math.ceil(footerBottom)),
            };
        });
    }

    async function assertPageEndsAtFooter(label) {
        // Select2 initializes after the controls render; wait for layout to settle.
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const metrics = await layoutMetrics();
        console.log(`${label}: ${JSON.stringify(metrics)}`);
        assert.ok(metrics.overflow <= 1, `${label}: espaço vazio após o rodapé (${metrics.overflow}px).`);
    }

    async function importReceipt(file, expectedOperators) {
        await page.locator("#receiptFileInput").setInputFiles(file);
        await page.waitForFunction(() => document.querySelector("#receiptNotification").dataset.notificationType === "success"
            && !document.querySelector("#receiptImportActionButton").disabled);
        if (expectedOperators !== undefined) {
            assert.equal(await page.locator("#receiptOperatorControls [data-receipt-operator-id]").count(), expectedOperators);
            assert.equal(await page.locator("#receiptOperatorControls .select2-container").count(), Math.max(9, expectedOperators));
        }
        await assertPageEndsAtFooter(typeof file === "string" ? path.basename(file) : file.name);
        if (process.env.RECEIPT_LAYOUT_OUTPUT && typeof file === "string") {
            await mkdir(process.env.RECEIPT_LAYOUT_OUTPUT, { recursive: true });
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            await page.screenshot({ path: path.join(process.env.RECEIPT_LAYOUT_OUTPUT, `${path.basename(file)}.png`) });
        }
    }

    for (const filename of JSON.parse(process.env.RECEIPT_LAYOUT_FILES || "[]")) {
        await importReceipt(filename);
    }

    for (const operatorCount of [5, 16, 30]) {
        for (const extension of ["xlsx", "csv"]) {
            await importReceipt(createReceiptFile(operatorCount, extension), operatorCount);
        }
    }

    // Reach a row below the scrollport and exercise the real Select2 dropdown.
    const lastControl = page.locator("#receiptOperatorControls [data-receipt-operator-id]").last();
    await lastControl.locator('[data-receipt-operator-field="labeler"]').fill("Etiquetador teste");
    await lastControl.locator(".select2-selection").click();
    await page.getByRole("option", { name: "2", exact: true }).click();
    assert.equal(await lastControl.locator("select").inputValue(), "2");
    assert.equal(await page.locator("#receiptPreviewErrors").textContent(), "2");
    assert.ok(await page.locator("#receiptOperatorControls").evaluate(element => element.scrollTop > 0));
    await assertPageEndsAtFooter("scroll e edição no Select2");

    await page.setViewportSize({ width: 1280, height: 800 });
    await assertPageEndsAtFooter("janela menor");
    for (const panel of ["receipt-charts", "linehaul", "receipt-tables"]) {
        await page.locator(`a[href="#${panel}"]`).click();
        await assertPageEndsAtFooter(`aba ${panel}`);
    }

    // Reimport after scrolling, then reset through the same button as the user.
    await importReceipt(createReceiptFile(5, "csv"), 5);
    page.once("dialog", dialog => dialog.accept());
    await page.locator("#receiptClearReportButton").click();
    assert.equal(await page.locator("#receiptOperatorControls select:disabled").count(), 9);
    await assertPageEndsAtFooter("limpeza do relatório");

    assert.deepEqual(errors, []);
    console.log("Receipt layout browser checks passed.");
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
