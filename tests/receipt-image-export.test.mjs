import assert from "node:assert/strict";
import { setImmediate as nextTurn } from "node:timers/promises";
import { test } from "node:test";
import { initializeReceiptExport } from "../js/reports/receipt/export.js";
import { replaceReceiptLinehauls } from "../js/reports/receipt/linehaul-state.js";
import { restoreReceiptState } from "../js/reports/receipt/state.js";

class Element extends EventTarget {
    dataset = {};
    classList = { contains: () => false };
    attributes = new Map();
    disabled = false;
    title = "";

    constructor(id) {
        super();
        this.id = id;
    }

    getAttribute(name) { return this.attributes.get(name) ?? null; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
}

test("copia a subaba de Processamento com os dados exigidos por ela", async t => {
    const elements = new Map([
        "receiptClearReportButton",
        "receiptCopyReportButton",
        "receiptLinehaulExportArea",
        "receiptReportExportArea",
        "receiptComparisonExportArea",
        "receipt-view-tabs",
    ].map(id => [`#${id}`, new Element(id)]));
    const panel = new Element("receipt");
    const activeLink = new Element("active-link");
    panel.querySelector = selector => selector === "#receipt-view-tabs .tabs-title.is-active > a"
        ? activeLink
        : elements.get(selector);

    const copiedAreas = [];
    const globals = {
        HTMLElement: Element,
        HTMLButtonElement: Element,
        MutationObserver: class { observe() {} },
        document: { getElementById: () => null },
        navigator: {
            clipboard: {
                async write([item]) {
                    copiedAreas.push(await item["image/png"].text());
                },
            },
        },
        window: {
            isSecureContext: true,
            ClipboardItem: class {
                constructor(data) { Object.assign(this, data); }
            },
            async html2canvas(element) {
                return {
                    toBlob(callback, type) { callback(new Blob([element.id], { type })); },
                };
            },
            setTimeout(callback) { callback(); },
        },
    };
    for (const [name, value] of Object.entries(globals)) {
        const original = Object.getOwnPropertyDescriptor(globalThis, name);
        Object.defineProperty(globalThis, name, { value, configurable: true });
        t.after(() => {
            if (original) Object.defineProperty(globalThis, name, original);
            else delete globalThis[name];
        });
    }

    activeLink.setAttribute("href", "#linehaul");
    assert.equal(initializeReceiptExport(panel), true);
    const button = elements.get("#receiptCopyReportButton");
    const tabs = elements.get("#receipt-view-tabs");
    async function copyActiveTab(href, expectedArea) {
        activeLink.setAttribute("href", href);
        tabs.dispatchEvent(new Event("click"));
        assert.equal(button.disabled, false);
        const previousCount = copiedAreas.length;
        button.dispatchEvent(new Event("click"));
        await nextTurn();
        assert.deepEqual(copiedAreas.slice(previousCount), [expectedArea]);
    }

    assert.equal(button.disabled, true);
    replaceReceiptLinehauls([{ code: "LH1", loadedOrders: 100 }]);
    await copyActiveTab("#linehaul", "receiptLinehaulExportArea");

    activeLink.setAttribute("href", "#receipt-tables");
    tabs.dispatchEvent(new Event("click"));
    assert.equal(button.disabled, true);

    restoreReceiptState({
        expectedVolume: 100,
        operators: [{ receiver: "Recebedor Teste", packagesReceived: 100, errorQuantity: 0 }],
    });
    await copyActiveTab("#receipt-tables", "receiptReportExportArea");
    await copyActiveTab("#receipt-charts", "receiptComparisonExportArea");
});
