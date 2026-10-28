// Integration with the real jQuery/Select2/XLSX and the dashboard HTML.
// Requires jsdom; SELECT2_DOM_RUNTIME may point to an installed jsdom package.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (!process.argv[2]) {
    for (const mode of ["before", "after"]) {
        const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), mode], { env: process.env, stdio: "inherit" });
        if (result.status !== 0) process.exit(result.status || 1);
    }
} else {
    const require = createRequire(import.meta.url);
    const { JSDOM } = require(process.env.SELECT2_DOM_RUNTIME || "jsdom");
    const dom = new JSDOM(readFileSync(new URL("../index.html", import.meta.url), "utf8"), {
        url: "https://dashboard.test/", runScripts: "outside-only", pretendToBeVisual: true,
    });
    const { window } = dom;
    for (const key of ["window", "document", "Element", "HTMLElement", "HTMLInputElement", "HTMLSelectElement",
        "HTMLLabelElement", "HTMLButtonElement", "HTMLImageElement", "MutationObserver"]) {
        globalThis[key] = key === "window" ? window : window[key];
    }
    const errors = [];
    window.console.error = (...args) => errors.push(args.join(" "));
    for (const file of ["js/jquery/jquery-3.2.1.min.js", "js/select2/select2.min.js"]) {
        window.eval(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
    }
    const $ = window.jQuery;
    // Control the order explicitly instead of relying on DOMContentLoaded timing.
    const ready = $.fn.ready;
    $.fn.ready = function () { return this; };
    window.eval(readFileSync(new URL("../js/select2/options-select2.js", import.meta.url), "utf8"));
    $.fn.ready = ready;
    window.XLSX = require("../js/libraries/xlsx.full.min.js");

    if (process.argv[2] === "before") window.initializeSelect2Fields(document);
    const { initializeReceiptView } = await import("../js/reports/receipt/view.js");
    const { initializeReceiptImport } = await import("../js/reports/receipt/import.js");
    const { getReceiptState, resetReceiptReport } = await import("../js/reports/receipt/state.js");
    const root = document.getElementById("receipt");
    assert.equal(initializeReceiptView(root), true);
    assert.equal(initializeReceiptImport(root), true);
    window.initializeSelect2Fields(document);
    const controls = document.getElementById("receiptOperatorControls");
    const notification = document.getElementById("receiptNotification");
    const input = document.getElementById("receiptFileInput");
    const button = document.getElementById("receiptImportActionButton");
    const selects = () => [...controls.querySelectorAll("select")];
    const assertWidgets = () => {
        const fields = selects();
        assert.equal(fields.length, 9);
        assert.equal(controls.querySelectorAll(".select2-container").length, fields.length);
        const ids = fields.map(field => field.getAttribute("data-select2-id"));
        assert.equal(new Set(ids).size, fields.length, "Cada instância precisa de uma identificação própria.");
        for (const field of fields) assert.equal($(field).data("select2")?.$element[0], field);
    };
    const importFile = async (rows, extension = "xlsx") => {
        const XLSX = window.XLSX;
        const sheet = XLSX.utils.aoa_to_sheet([["SPX Tracking Number", "Coluna B", "Coluna C", "Operator"], ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "Recebimento");
        const buffer = extension === "csv"
            ? Buffer.from(XLSX.utils.sheet_to_csv(sheet))
            : Buffer.from(XLSX.write(workbook, { type: "array", bookType: extension }));
        Object.defineProperty(input, "files", { configurable: true, value: [{
            name: `recebimento.${extension}`, size: buffer.length,
            arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        }] });
        input.dispatchEvent(new window.Event("change", { bubbles: true }));
        for (let attempt = 0; attempt < 100 && button.disabled; attempt += 1) {
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        assert.equal(button.disabled, false);
        assert.equal(notification.dataset.notificationType, "success", document.getElementById("receiptNotificationText").textContent);
        assertWidgets();
    };

    await importFile([
        ["BR001", "", "", "Ana"], ["BR002", "", "", "Ana"],
        ["BR003", "", "", "João"], ["BR001", "", "", "Ana"],
    ]);
    assert.equal(document.getElementById("receiptPreviewReceived").textContent, "3");
    assert.deepEqual(getReceiptState().operators.map(({ receiver, packagesReceived }) => [receiver, packagesReceived]), [["Ana", 2], ["João", 1]]);
    const ana = controls.querySelector('[data-receipt-operator-id] select');
    const anaWidget = $(ana).data("select2");
    $(ana).val("1").trigger("change");
    assert.equal(getReceiptState().operators[0].errorQuantity, 1);
    assert.equal(document.getElementById("receiptPreviewErrors").textContent, "1");
    assert.equal($(ana).data("select2"), anaWidget, "Editar erros preserva o campo em uso.");

    await importFile([["BR004", "", "", "Maria"]], "csv");
    assert.equal(getReceiptState().operators[0].receiver, "Maria");
    assert.equal(document.getElementById("receiptPreviewReceived").textContent, "1");
    assert.equal(anaWidget.$container[0].isConnected, false);
    resetReceiptReport();
    assertWidgets();
    assert.ok(selects().every(field => field.disabled));
    assert.equal(document.getElementById("receiptPreviewReceived").textContent, "—");
    await importFile([["BR005", "", "", "Pedro"]], "xls");

    // Orphan markup and jQuery clones must never destroy the source instance.
    const host = document.createElement("div");
    host.innerHTML = '<select class="standard-select" tabindex="3"><option value="1">Um</option></select>';
    document.body.appendChild(host);
    window.initializeSelect2Fields(host);
    const original = host.querySelector("select"), instance = $(original).data("select2");
    window.initializeSelect2Fields(host);
    assert.equal($(original).data("select2"), instance);
    for (const clone of [host.cloneNode(true), $(host).clone(true, true)[0]]) {
        document.body.appendChild(clone);
        const field = clone.querySelector("select");
        window.destroySelect2Fields(clone);
        window.destroySelect2Fields(clone);
        assert.equal($(original).data("select2"), instance);
        assert.equal(instance.$container[0].isConnected, true);
        assert.equal(clone.querySelectorAll(".select2-container").length, 0);
        window.initializeSelect2Fields(clone);
        assert.equal($(field).data("select2").$element[0], field);
        assert.notEqual($(field).data("select2"), instance);
        assert.notEqual(field.getAttribute("data-select2-id"), original.getAttribute("data-select2-id"));
        window.destroySelect2Fields(clone);
        clone.remove();
    }
    const uncleanedClone = host.cloneNode(true);
    document.body.appendChild(uncleanedClone);
    window.initializeSelect2Fields(uncleanedClone);
    const newField = uncleanedClone.querySelector("select");
    assert.equal($(newField).data("select2").$element[0], newField);
    assert.equal(uncleanedClone.querySelectorAll(".select2-container").length, 1);
    assert.equal($(original).data("select2"), instance);
    assert.equal(instance.$container[0].isConnected, true);
    window.destroySelect2Fields(uncleanedClone);
    uncleanedClone.remove();
    window.destroySelect2Fields(host);
    window.destroySelect2Fields(host);
    assert.equal(original.getAttribute("tabindex"), "3");
    assert.deepEqual(errors, []);
    console.log(`OK: Select2 inicializado ${process.argv[2] === "before" ? "antes" : "depois"} da tela; importação XLSX/CSV/XLS, duplicados, edição, reimportação, limpeza e clones.`);
    window.close();
}
