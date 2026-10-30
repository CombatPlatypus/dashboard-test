import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeEach, test } from "node:test";
import {
    bindReportSummaryCopyButton, createReportSummaryClipboard, initializeReportSummaryCopy,
} from "../js/reports/summary-copy.js";
import { restoreReportContext, subscribeReportContext, updateReportContextField } from "../js/reports/core/report-context.js";
import { resetReceiptReport, restoreReceiptState, subscribeReceiptState } from "../js/reports/receipt/state.js";
import { resetReceiptLinehaulState, restoreReceiptLinehaulState, subscribeReceiptLinehaulState } from "../js/reports/receipt/linehaul-state.js";
import { resetExpeditionReport, restoreExpeditionState } from "../js/reports/expedition/state.js";

const require = createRequire(import.meta.url);
const XLSX = require("../js/libraries/xlsx.full.min.js");
const matrix = payload => payload.text.split("\n").map(row => row.split("\t"));
const routes = [{
    code: "AT1", status: "Validated", finalOrders: 1000, missortedOrders: 50,
    validationOperator: "Ana", validationStartTime: "2026-10-23 08:00:00",
    validationEndTime: "2026-10-23 09:05:30",
}];

beforeEach(() => {
    resetReceiptReport();
    resetReceiptLinehaulState();
    resetExpeditionReport();
    restoreReportContext({ window: "AM", plannedVolume: 1500 });
});

function populate() {
    restoreReceiptState({ operators: [
        { receiver: "Ana", packagesReceived: 900, selected: true },
        { receiver: "Bia", packagesReceived: 200, selected: true },
        { receiver: "Caio", packagesReceived: 500, selected: false },
    ] });
    restoreReceiptLinehaulState({ linehauls: [
        { code: "LH1", loadedOrders: 700, selected: true },
        { code: "LH2", loadedOrders: 500, selected: true },
        { code: "LH3", loadedOrders: 800, selected: false },
    ] });
    restoreExpeditionState({
        routes, floorVolume: 100, hasErrorData: true,
        errorTotals: { sortingErrors: 12, labelingErrors: 8 }, revertedErrors: 10,
    });
}

test("processamento reproduz A3:D7 com títulos, cabeçalhos e somente os dados selecionados", () => {
    populate();
    const payload = createReportSummaryClipboard("receipt");
    assert.equal(payload.target, "A3");
    assert.equal(payload.hasData, true);
    assert.deepEqual(matrix(payload), [
        ["Último Processamento", "", "", ""],
        ["LHs Descarregados", "", "Volume Descarregado", ""],
        ["2", "", "1200", ""],
        ["Volume Esperado", "", "Volume Recebido", ""],
        ["1500", "", "1100", ""],
    ]);
    const workbook = XLSX.read(payload.html, { type: "string" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    assert.deepEqual(sheet["!merges"].map(XLSX.utils.encode_range), [
        "A1:D1", "A2:B2", "C2:D2", "A3:B3", "C3:D3", "A4:B4", "C4:D4", "A5:B5", "C5:D5",
    ]);
    assert.equal(sheet.A3.v, 2);
    assert.equal(sheet.C3.v, 1200);
});

test("expedição reproduz A8:D21 com os erros e taxas calculados pelo relatório", () => {
    populate();
    const payload = createReportSummaryClipboard("expedition");
    assert.equal(payload.target, "A8");
    assert.equal(payload.hasData, true);
    assert.deepEqual(matrix(payload), [
        ["Última Expedição", "", "", ""],
        ["Rotas Conferidas", "", "Volume Expedido", ""],
        ["1", "", "1000", ""],
        ["Volume no Piso", "", "Duração", ""],
        ["100", "", "01:05:30", ""],
        ["Análise de Erros", "", "", ""],
        ["Erros de Sorting", "", "Erros de Etiquetagem", ""],
        ["30", "", "20", ""],
        ["Erros Revertidos", "", "Taxa de Revertidos", ""],
        ["10", "", "20,00%", ""],
        ["Total de Erros", "", "Taxa de Erros", ""],
        ["50", "", "5,00%", ""],
        ["Total Final de Erros", "", "Taxa Final", ""],
        ["40", "", "4,00%", ""],
    ]);
    const workbook = XLSX.read(payload.html, { type: "string" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    assert.equal(sheet["!merges"].length, 26);
    assert.ok(sheet["!merges"].some(range => XLSX.utils.encode_range(range) === "A6:D6"));
    assert.ok(sheet["!merges"].some(range => XLSX.utils.encode_range(range) === "C14:D14"));
    assert.doesNotMatch(payload.text, /Processamento|Volume Recebido/);
});

test("formato de colagem do Planilhas centraliza as duas direções em títulos, dados e células vazias", () => {
    populate();
    for (const kind of ["receipt", "expedition"]) {
        const { html } = createReportSummaryClipboard(kind);
        assert.match(html, /<google-sheets-html-origin><table\b[^>]*data-sheets-root="1"/);
        assert.ok(html.endsWith("</table></google-sheets-html-origin>"));
        const cells = [...html.matchAll(/<td\b([^>]*)>([^<]*)<\/td>/g)];
        assert.equal(cells.length, kind === "receipt" ? 9 : 26);
        for (const [, attributes] of cells) {
            const format = JSON.parse(attributes.match(/data-sheets-userformat='([^']+)'/)[1]);
            assert.equal(format["2"] & (64 | 128), 64 | 128);
            assert.equal(format["9"], 1);
            assert.equal(format["10"], 1);
        }
    }
});

test("os turnos ocupam blocos lado a lado sem atingir os cabeçalhos, as divisórias ou outro relatório", () => {
    populate();
    const occupied = new Set();
    for (const [window, firstColumn] of [["AM", "A"], ["PM1", "F"], ["PM2", "K"]]) {
        const options = { context: { window } };
        const receipt = createReportSummaryClipboard("receipt", options);
        const expedition = createReportSummaryClipboard("expedition", options);
        assert.equal(receipt.target, `${firstColumn}3`);
        assert.equal(expedition.target, `${firstColumn}8`);
        assert.equal(matrix(receipt).length, 5);
        assert.equal(matrix(expedition).length, 14);
        for (const payload of [receipt, expedition]) {
            assert.ok(matrix(payload).every(row => row.length === 4));
            const [, column, firstRow] = payload.target.match(/^([A-Z]+)(\d+)$/);
            const pasted = new Map(matrix(payload).flatMap((row, rowOffset) => row.map((value, columnOffset) => {
                const cell = `${String.fromCharCode(column.charCodeAt(0) + columnOffset)}${Number(firstRow) + rowOffset}`;
                assert.equal(occupied.has(cell), false, `${window}: sobreposição em ${cell}`);
                occupied.add(cell);
                return [cell, value];
            })));
            // The "Último" sheets read these rows in the new Base do Resumo layout.
            const valuesByRow = payload === receipt
                ? [[5, "2", "1200"], [7, "1500", "1100"]]
                : [[10, "1", "1000"], [12, "100", "01:05:30"], [15, "30", "20"],
                    [17, "10", "20,00%"], [19, "50", "5,00%"], [21, "40", "4,00%"]];
            const secondColumn = String.fromCharCode(firstColumn.charCodeAt(0) + 2);
            for (const [row, left, right] of valuesByRow) {
                assert.equal(pasted.get(`${firstColumn}${row}`), left);
                assert.equal(pasted.get(`${secondColumn}${row}`), right);
            }
        }
    }
    for (const cell of occupied) {
        assert.doesNotMatch(cell, /^[EJ]/);
        assert.ok(Number(cell.match(/\d+$/)[0]) >= 3);
    }
});

test("campos ausentes ficam vazios, zeros continuam numéricos e dados parciais não inventam resultados", () => {
    assert.equal(createReportSummaryClipboard("receipt").hasData, false);
    assert.equal(createReportSummaryClipboard("expedition").hasData, false);
    populate();
    resetReceiptLinehaulState();
    assert.deepEqual(matrix(createReportSummaryClipboard("receipt"))[2], ["", "", "", ""]);
    restoreExpeditionState({ routes, floorVolume: 0 });
    let rows = matrix(createReportSummaryClipboard("expedition"));
    assert.equal(rows[4][0], "0");
    assert.deepEqual(rows[9], ["", "", "", ""]);
    restoreExpeditionState({ routes: [], hasErrorData: true, errorTotals: { sortingErrors: 0, labelingErrors: 0 } });
    const payload = createReportSummaryClipboard("expedition");
    rows = matrix(payload);
    assert.equal(payload.hasData, true);
    assert.deepEqual(rows[2], ["", "", "", ""]);
    assert.deepEqual(rows[7], ["0", "", "0", ""]);
    assert.deepEqual(rows[11], ["0", "", "", ""]);
    assert.throws(() => createReportSummaryClipboard("other"), /inválido/);
});

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

class Element {
    dataset = {};
    attributes = {};
    textContent = "";
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
}
class Image extends Element {}
class Button extends Element {
    listeners = {};
    title = "Copiar resumo";
    addEventListener(name, handler) { (this.listeners[name] ??= []).push(handler); }
    async fire(name = "click", event = {}) {
        await Promise.all((this.listeners[name] ?? []).map(handler => handler(event)));
    }
}

function setup(t, clipboard) {
    const notification = new Element();
    const text = new Element();
    const elements = { receiptNotification: notification, receiptNotificationIcon: new Image(), receiptNotificationText: text };
    replaceGlobal(t, "HTMLElement", Element);
    replaceGlobal(t, "HTMLButtonElement", Button);
    replaceGlobal(t, "HTMLImageElement", Image);
    replaceGlobal(t, "document", { getElementById: id => elements[id] });
    replaceGlobal(t, "navigator", { clipboard });
    return { notification, text };
}

const receiptBinding = {
    reportId: "receipt", kind: "receipt",
    subscribe: [subscribeReceiptState, subscribeReceiptLinehaulState, subscribeReportContext],
};

test("clique grava apenas os dados e cabeçalhos do relatório em HTML e TSV", async t => {
    populate();
    const writes = [];
    const { notification, text } = setup(t, { write: async items => writes.push(items[0].data) });
    replaceGlobal(t, "ClipboardItem", class { constructor(data) { this.data = data; } });
    const button = new Button();
    assert.equal(bindReportSummaryCopyButton(button, receiptBinding), true);
    assert.equal(bindReportSummaryCopyButton(button, receiptBinding), true);
    assert.equal(button.listeners.click.length, 1);
    assert.equal(button.listeners.contextmenu, undefined);
    await button.fire();
    assert.equal(await writes[0]["text/plain"].text(), createReportSummaryClipboard("receipt").text);
    assert.equal(await writes[0]["text/html"].text(), createReportSummaryClipboard("receipt").html);
    assert.equal(notification.dataset.notificationType, "success");
    assert.match(text.textContent, /Cole em A3/);
    updateReportContextField("window", "PM1");
    await button.fire("contextmenu");
    assert.equal(writes.length, 1);
    await button.fire();
    assert.equal(await writes[1]["text/plain"].text(), createReportSummaryClipboard("receipt").text);
    assert.match(text.textContent, /Cole em F3/);
    updateReportContextField("window", "PM2");
    await button.fire("click", { shiftKey: true });
    assert.equal(await writes[2]["text/plain"].text(), createReportSummaryClipboard("receipt").text);
    assert.match(text.textContent, /Cole em K3/);
    assert.match(button.title, /K3/);
});

test("fallback de texto lê o estado atual e os botões acompanham importação e limpeza", async t => {
    const writes = [];
    setup(t, { writeText: async value => writes.push(value) });
    replaceGlobal(t, "ClipboardItem", undefined);
    const button = new Button();
    bindReportSummaryCopyButton(button, receiptBinding);
    assert.equal(button.disabled, true);
    await button.fire();
    assert.deepEqual(writes, []);
    populate();
    assert.equal(button.disabled, false);
    updateReportContextField("plannedVolume", 4321);
    await button.fire();
    assert.equal(matrix({ text: writes[0] })[4][0], "4321");
    resetReceiptReport();
    assert.equal(button.disabled, false);
    resetReceiptLinehaulState();
    assert.equal(button.disabled, true);
});

test("falha de permissão e cliques duplicados restauram o botão e permitem nova tentativa", async t => {
    populate();
    let finish;
    const writes = [];
    const { notification } = setup(t, { writeText: value => {
        writes.push(value);
        return new Promise(resolve => { finish = resolve; });
    } });
    replaceGlobal(t, "ClipboardItem", undefined);
    const button = new Button();
    bindReportSummaryCopyButton(button, receiptBinding);
    const pending = button.fire();
    assert.equal(button.disabled, true);
    assert.equal(button.attributes["aria-busy"], "true");
    await button.fire();
    assert.equal(writes.length, 1);
    finish();
    await pending;
    navigator.clipboard.writeText = async () => { throw new Error("NotAllowedError"); };
    await button.fire();
    assert.equal(notification.dataset.notificationType, "error");
    assert.equal(button.disabled, false);
    assert.equal(button.attributes["aria-busy"], undefined);
    navigator.clipboard = undefined;
    await button.fire();
    assert.equal(notification.dataset.notificationType, "error");
    navigator.clipboard = { writeText: async value => writes.push(value) };
    await button.fire();
    assert.equal(notification.dataset.notificationType, "success");
});

test("inicialização conecta ambos os botões sem depender da subaba selecionada", async t => {
    populate();
    const writes = [];
    setup(t, { writeText: async value => writes.push(value) });
    replaceGlobal(t, "ClipboardItem", undefined);
    const receipt = new Button();
    const expedition = new Button();
    const root = { querySelector: selector => ({
        "#receiptCopySummaryButton": receipt, "#expeditionCopySummaryButton": expedition,
    })[selector] };
    assert.equal(initializeReportSummaryCopy(root), true);
    assert.equal(initializeReportSummaryCopy(root), true);
    await receipt.fire();
    await expedition.fire();
    assert.equal(writes[0].split("\n").length, 5);
    assert.equal(writes[1].split("\n").length, 14);
    assert.equal(expedition.listeners.click.length, 1);
    resetExpeditionReport();
    assert.equal(expedition.disabled, true);
    assert.equal(bindReportSummaryCopyButton(null, receiptBinding), false);
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    for (const id of ["receiptCopySummaryButton", "expeditionCopySummaryButton"]) {
        assert.equal(html.split(`id="${id}"`).length - 1, 1);
    }
});
