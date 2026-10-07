import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
    bindParcelPackageCopyButton,
    getParcelPackageCodes,
} from "../js/reports/parcel-sweeper/package-copy.js";
import { createParcelSummary, filterParcelPackageRows } from "../js/reports/parcel-sweeper/model.js";
import { sortParcelPackageRows } from "../js/reports/parcel-sweeper/table-sort.js";
import { resetReportNotification } from "../js/reports/report-notifications.js";

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

class Element {
    constructor() { this.dataset = {}; this.attributes = {}; this.textContent = ""; }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
}
class Image extends Element {}
class Button extends Element {
    constructor() { super(); this.listeners = []; this.title = "Copiar BRs"; }
    addEventListener(name, handler) { if (name === "click") this.listeners.push(handler); }
    async click() { await Promise.all(this.listeners.map(handler => handler())); }
}
class Body extends Element {
    constructor(codes = []) { super(); this.setCodes(codes); }
    setCodes(codes) { this.rows = codes.map(code => ({ cells: [{ textContent: "Operador" }, { textContent: code }] })); }
    querySelectorAll() { return this.rows; }
}

function setup(t, writeText = async () => {}) {
    const notification = new Element();
    const icon = new Image();
    const text = new Element();
    const elements = { parcelNotification: notification, parcelNotificationIcon: icon, parcelNotificationText: text };
    replaceGlobal(t, "HTMLElement", Element);
    replaceGlobal(t, "HTMLImageElement", Image);
    replaceGlobal(t, "HTMLButtonElement", Button);
    replaceGlobal(t, "document", { getElementById: id => elements[id] });
    replaceGlobal(t, "navigator", { clipboard: { writeText } });
    return { notification, text };
}

test("copia todos os BRs na ordem da tabela, sem cabeçalho ou placeholders", async t => {
    const writes = [];
    const { notification, text } = setup(t, async value => writes.push(value));
    const body = new Body([" BR10 ", "BR2", "BR1", "BR2", "", "—", "-"]);
    body.rows.push({ cells: [{ textContent: "—" }] });
    assert.deepEqual(getParcelPackageCodes(body), ["BR10", "BR2", "BR1", "BR2"]);
    const button = new Button();
    assert.equal(bindParcelPackageCopyButton(button, body, "pacotes comuns"), true);
    assert.equal(bindParcelPackageCopyButton(button, body, "pacotes comuns"), true);
    assert.equal(button.listeners.length, 1);
    await button.click();
    assert.deepEqual(writes, ["BR10\nBR2\nBR1\nBR2"]);
    assert.equal(notification.dataset.notificationType, "success");
    assert.equal(text.textContent, "4 BRs de pacotes comuns copiados.");
    assert.equal(button.disabled, false);
    assert.equal(button.title, "Copiar BRs");
    assert.equal(button.attributes["aria-busy"], undefined);
    assert.equal(body.rows[0].cells[1].textContent, " BR10 ");
    body.setCodes(Array.from({ length: 1500 }, (_, index) => `BR${index}`));
    await button.click();
    assert.equal(writes[1].split("\n").length, 1500);
    assert.ok(writes[1].endsWith("BR1499"));
});

test("cada botão acompanha filtros, ordenação e correções de Volumoso sem misturar tabelas", async t => {
    const writes = [];
    setup(t, async value => writes.push(value));
    const rows = [
        { operator: "[Ops100]ANA TESTE", trackingNumber: "BR10", countType: "Exception", finalStatus: "LMHub_Received", scannedStatus: "Scanned" },
        { operator: "[Ops100]ANA TESTE", trackingNumber: "BR2", countType: "Backlog", scannedStatus: "Scanned" },
        { operator: "[Ops200]CAIO TESTE", trackingNumber: "BR3", countType: "Exception", finalStatus: "LMHub_Received", scannedStatus: "Scanned" },
        { operator: "[Ops200]CAIO TESTE", trackingNumber: "BR1", countType: "Backlog", scannedStatus: "Scanned" },
        { operator: "[Ops100]ANA TESTE", trackingNumber: "BR99", countType: "Processed", scannedStatus: "Scanned" },
        { operator: "operador@teste.com", trackingNumber: "BR98", countType: "Backlog", scannedStatus: "Scanned" },
        { operator: "[Ops100]ANA TESTE", trackingNumber: "BR97", countType: "Exception", finalStatus: "SOC_Received", scannedStatus: "LMHub_Received" },
        { operator: "[Ops200]CAIO TESTE", trackingNumber: "BR96", countType: "Exception", finalStatus: "Return_LMHub_Packed", scannedStatus: "LMHub_Received" },
    ];
    const common = new Body(); const bulky = new Body();
    const commonButton = new Button(); const bulkyButton = new Button();
    bindParcelPackageCopyButton(commonButton, common, "pacotes comuns");
    bindParcelPackageCopyButton(bulkyButton, bulky, "pacotes volumosos");
    const renderTables = (filter, overrides, direction = "asc") => {
        const summary = createParcelSummary(rows, overrides);
        for (const [body, packages] of [[common, summary.commonRows], [bulky, summary.bulkyRows]]) {
            body.setCodes(sortParcelPackageRows(filterParcelPackageRows(packages, filter),
                { column: "trackingNumber", direction }).map(row => row.trackingNumber));
        }
    };
    const overrides = { "[ops200]caio teste": true };
    renderTables("all", overrides);
    await commonButton.click(); await bulkyButton.click();
    assert.deepEqual(writes.slice(-2), ["BR2\nBR10", "BR1\nBR3"]);
    renderTables("backlog", overrides);
    await commonButton.click(); await bulkyButton.click();
    assert.deepEqual(writes.slice(-2), ["BR2", "BR1"]);
    renderTables("exception", overrides);
    await commonButton.click(); await bulkyButton.click();
    assert.deepEqual(writes.slice(-2), ["BR10", "BR3"]);
    renderTables("all", { "[ops100]ana teste": true, "[ops200]caio teste": false }, "desc");
    await commonButton.click(); await bulkyButton.click();
    assert.deepEqual(writes.slice(-2), ["BR3\nBR1", "BR10\nBR2"]);
});

test("tabela vazia não apaga a área de transferência e falhas permitem tentar novamente", async t => {
    const writes = [];
    const { notification, text } = setup(t, async value => writes.push(value));
    const button = new Button(); const body = new Body();
    bindParcelPackageCopyButton(button, body, "pacotes volumosos");
    assert.equal(button.disabled, true);
    await button.click();
    assert.deepEqual(writes, []);
    assert.equal(notification.dataset.notificationType, "warning");
    body.setCodes(["BR1"]);
    navigator.clipboard.writeText = async () => { throw new Error("NotAllowedError"); };
    await button.click();
    assert.equal(notification.dataset.notificationType, "error");
    assert.equal(button.disabled, false);
    assert.equal(button.attributes["aria-busy"], undefined);
    navigator.clipboard = undefined;
    await button.click();
    assert.equal(notification.dataset.notificationType, "error");
    navigator.clipboard = { writeText: async value => writes.push(value) };
    await button.click();
    assert.deepEqual(writes, ["BR1"]);
    assert.equal(text.textContent, "1 BR de pacotes volumosos copiado.");
});

test("impede cliques duplicados e libera o botão conforme a tabela após a cópia", async t => {
    let finish;
    const writes = [];
    setup(t, value => { writes.push(value); return new Promise(resolve => { finish = resolve; }); });
    const button = new Button(); const body = new Body(["BR1", "BR2"]);
    bindParcelPackageCopyButton(button, body, "pacotes comuns");
    const pending = button.click();
    assert.equal(button.disabled, true);
    assert.equal(button.attributes["aria-busy"], "true");
    await button.click();
    assert.deepEqual(writes, ["BR1\nBR2"]);
    body.setCodes([]);
    finish(); await pending;
    assert.equal(button.disabled, true);
    assert.equal(button.dataset.parcelCopyBusy, undefined);
    assert.equal(button.title, "Copiar BRs");
});

test("HTML conecta os botões e mantém a nova orientação ao abrir e limpar", t => {
    const { text } = setup(t);
    const message = "No SPX, acesse Parcel Sweeper / Parcel Sweeper View, escolha um arquivo parcel para exportar e, em seguida, volte aqui e clique em importar.";
    resetReportNotification("parcel");
    assert.equal(text.textContent, message);
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    assert.match(html, /<h4 id="parcelNotificationText">\s*No SPX, acesse Parcel Sweeper \/ Parcel Sweeper View, escolha um arquivo parcel para exportar e, em seguida, volte aqui e clique em importar\./);
    for (const [id, kind] of [["parcelCopyCommonPackagesButton", "common"], ["parcelCopyBulkyPackagesButton", "bulky"]]) {
        assert.equal(html.split(`id="${id}"`).length - 1, 1);
        assert.match(html, new RegExp(`<button id="${id}" type="button" data-parcel-copy="${kind}"[^>]*aria-label="Copiar BRs de pacotes`));
    }
    assert.equal(bindParcelPackageCopyButton(null, new Body(), "pacotes comuns"), false);
});
