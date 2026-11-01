import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeEach, test } from "node:test";
import {
    bindReportSummaryCopyButton, createReportSummaryClipboard, initializeReportSummaryCopy,
} from "../js/reports/summary-copy.js";
import { restoreReportContext, subscribeReportContext, updateReportContextField } from "../js/reports/core/report-context.js";
import { formatReportPersonWithOps } from "../js/reports/core/person-name.js";
import { resetReceiptReport, restoreReceiptState, subscribeReceiptState } from "../js/reports/receipt/state.js";
import { resetReceiptLinehaulState, restoreReceiptLinehaulState, subscribeReceiptLinehaulState } from "../js/reports/receipt/linehaul-state.js";
import { resetExpeditionReport, restoreExpeditionState } from "../js/reports/expedition/state.js";

const require = createRequire(import.meta.url);
const XLSX = require("../js/libraries/xlsx.full.min.js");
const matrix = payload => payload.text.split("\n").map(row => row.split("\t"));
const routes = [{
    code: "AT1", status: "Validated", finalOrders: 1000, missortedOrders: 50,
    validationOperator: "Ana", validationStartTime: "2026-10-23 08:00:00",
    validationEndTime: "2026-10-23 09:05:30", validationDurationSeconds: 3930,
}];

beforeEach(() => {
    resetReceiptReport();
    resetReceiptLinehaulState();
    resetExpeditionReport();
    restoreReportContext({ window: "AM", plannedVolume: 1500 });
});

function populate() {
    restoreReceiptState({ operators: [
        { receiver: "Ana", labeler: "Lia", packagesReceived: 900, errorQuantity: 12, selected: true },
        { receiver: "Bia", labeler: "Duda", packagesReceived: 200, errorQuantity: 0, selected: true },
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

test("processamento inclui o resumo e a lista dos recebedores selecionados em A3:D58", () => {
    populate();
    const payload = createReportSummaryClipboard("receipt");
    assert.equal(payload.target, "A3");
    assert.equal(payload.hasData, true);
    const rows = matrix(payload);
    assert.equal(rows.length, 56);
    assert.deepEqual(rows.slice(0, 9), [
        ["Último Processamento", "", "", ""],
        ["LHs Descarregados", "", "Volume Descarregado", ""],
        ["2", "", "1200", ""],
        ["Volume Esperado", "", "Volume Recebido", ""],
        ["1500", "", "1100", ""],
        ["Lista de Recebedores", "", "", ""],
        ["Recebor SPX", "Etiquetador", "Recebido", "Erros"],
        ["Ana", "Lia", "900", "12"],
        ["Bia", "Duda", "200", "0"],
    ]);
    assert.ok(rows.slice(9).every(row => row.every(value => value === "")));
    assert.doesNotMatch(payload.text, /Caio/);
    const workbook = XLSX.read(payload.html, { type: "string" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    assert.deepEqual(sheet["!merges"].map(XLSX.utils.encode_range), [
        "A1:D1", "A2:B2", "C2:D2", "A3:B3", "C3:D3", "A4:B4", "C4:D4", "A5:B5", "C5:D5", "A6:D6",
    ]);
    assert.equal(sheet.A3.v, 2);
    assert.equal(sheet.C3.v, 1200);
    assert.equal(sheet.A8.v, "Ana");
    assert.equal(sheet.B8.v, "Lia");
    assert.equal(sheet.C8.v, 900);
    assert.equal(sheet.D9.v, 0);
});

test("expedição inclui resumo, erros e lista de conferentes em E3:H58", () => {
    populate();
    const payload = createReportSummaryClipboard("expedition");
    assert.equal(payload.target, "E3");
    assert.equal(payload.hasData, true);
    const rows = matrix(payload);
    assert.equal(rows.length, 56);
    assert.deepEqual(rows.slice(0, 17), [
        ["Última Expedição", "", "", ""],
        ["Rotas Conferidas", "", "Volume Expedido", ""],
        ["1", "", "1000", ""],
        ["Volume no Piso", "", "Duração", ""],
        ["100", "", "01:05:30", ""],
        ["Análise de Erros", "", "", ""],
        ["Sorting", "", "Etiquetagem", ""],
        ["30", "", "20", ""],
        ["Revertidos", "", "Taxa de Revertidos", ""],
        ["10", "", "20,00%", ""],
        ["Total de Erros", "", "Taxa de Erros", ""],
        ["50", "", "5,00%", ""],
        ["Saldo Final", "", "Taxa Final", ""],
        ["40", "", "4,00%", ""],
        ["Lista de Conferentes", "", "", ""],
        ["Conferente SPX", "", "Rotas Feitas", "Tempo Médio"],
        ["Ana", "", "1", "01:05:30"],
    ]);
    assert.ok(rows.slice(17).every(row => row.every(value => value === "")));
    const workbook = XLSX.read(payload.html, { type: "string" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    assert.equal(sheet["!merges"].length, 68);
    assert.ok(sheet["!merges"].some(range => XLSX.utils.encode_range(range) === "A6:D6"));
    assert.ok(sheet["!merges"].some(range => XLSX.utils.encode_range(range) === "C14:D14"));
    assert.ok(sheet["!merges"].some(range => XLSX.utils.encode_range(range) === "A15:D15"));
    assert.ok(sheet["!merges"].some(range => XLSX.utils.encode_range(range) === "A17:B17"));
    assert.equal(sheet.A17.v, "Ana");
    assert.equal(sheet.C17.v, 1);
    assert.doesNotMatch(payload.text, /Processamento|Volume Recebido/);
});

test("colagem inclui bordas, fontes, tamanhos e centralização em títulos, dados e células vazias", () => {
    populate();
    for (const kind of ["receipt", "expedition"]) {
        const { html } = createReportSummaryClipboard(kind);
        assert.match(html, /<google-sheets-html-origin><table\b[^>]*data-sheets-root="1"/);
        assert.ok(html.startsWith('<html><head><meta charset="utf-8"></head><body><!--StartFragment-->'));
        assert.ok(html.endsWith('</tbody></table></google-sheets-html-origin><!--EndFragment--></body></html>'));
        assert.match(html, /data-sheets-baot="1"/);
        assert.equal([...html.matchAll(/<col width="150"/g)].length, 4);
        assert.equal([...html.matchAll(/<tr\b/g)].length, 56);
        const cells = [...html.matchAll(/<td\b([^>]*)>([^<]*)<\/td>/g)];
        assert.equal(cells.length, kind === "receipt" ? 210 : 150);
        for (const [, attributes] of cells) {
            const format = JSON.parse(attributes.match(/data-sheets-userformat='([^']+)'/)[1]);
            assert.equal(format["2"] & (64 | 128), 64 | 128);
            assert.equal(format["9"], 1);
            assert.equal(format["10"], 1);
            assert.match(attributes, /rowspan="1"/);
            const span = Number(attributes.match(/colspan="(\d+)"/)[1]);
            assert.match(attributes, new RegExp(`width="${150 * span}"`));
            assert.match(attributes, /text-align:center;vertical-align:middle/);
            assert.match(attributes, /border:1px solid #000000;/);
            assert.equal(format["2"] & (4096 | 8192), 4096 | 8192);
            assert.ok(["Roboto", "Arial"].includes(format["15"]));
            assert.match(attributes, new RegExp(`font-family:${format["15"]};font-size:${format["16"]}pt`));
        }
        const fontSizes = new Map(cells.map(([, attributes, value]) => [value,
            JSON.parse(attributes.match(/data-sheets-userformat='([^']+)'/)[1])["16"],
        ]));
        if (kind === "receipt") {
            assert.equal(fontSizes.get("Último Processamento"), 11);
            assert.equal(fontSizes.get("Lista de Recebedores"), 12);
            assert.equal(fontSizes.get("Recebor SPX"), 11);
            assert.equal(fontSizes.get("LHs Descarregados"), 11);
        } else {
            for (const title of ["Última Expedição", "Análise de Erros", "Lista de Conferentes"]) {
                assert.equal(fontSizes.get(title), 12);
            }
            assert.equal(fontSizes.get("Conferente SPX"), 11);
            assert.equal(fontSizes.get("Rotas Conferidas"), 11);
        }
    }
});

test("resumos e listas ocupam apenas o bloco reservado de cada janela", () => {
    populate();
    const occupied = new Set();
    for (const [window, firstRow] of [["AM", 3], ["PM1", 62], ["PM2", 121]]) {
        const options = { context: { window } };
        const receipt = createReportSummaryClipboard("receipt", options);
        const expedition = createReportSummaryClipboard("expedition", options);
        assert.equal(receipt.target, `A${firstRow}`);
        assert.equal(expedition.target, `E${firstRow}`);
        assert.equal(matrix(receipt).length, 56);
        assert.equal(matrix(expedition).length, 56);
        for (const payload of [receipt, expedition]) {
            assert.ok(matrix(payload).every(row => row.length === 4));
            const [, column, rowNumber] = payload.target.match(/^([A-Z]+)(\d+)$/);
            const pasted = new Map(matrix(payload).flatMap((row, rowOffset) => row.map((value, columnOffset) => {
                const cell = `${String.fromCharCode(column.charCodeAt(0) + columnOffset)}${Number(rowNumber) + rowOffset}`;
                assert.equal(occupied.has(cell), false, `${window}: sobreposição em ${cell}`);
                occupied.add(cell);
                return [cell, value];
            })));
            const valuesByRow = payload === receipt
                ? [[2, "2", "1200"], [4, "1500", "1100"], [7, "Ana", "900"], [8, "Bia", "200"]]
                : [[2, "1", "1000"], [4, "100", "01:05:30"], [7, "30", "20"],
                    [9, "10", "20,00%"], [11, "50", "5,00%"], [13, "40", "4,00%"], [16, "Ana", "1"]];
            const secondColumn = String.fromCharCode(column.charCodeAt(0) + 2);
            for (const [rowOffset, left, right] of valuesByRow) {
                assert.equal(pasted.get(`${column}${firstRow + rowOffset}`), left);
                assert.equal(pasted.get(`${secondColumn}${firstRow + rowOffset}`), right);
            }
        }
        for (const column of "ABCDEFGH") {
            assert.equal(occupied.has(`${column}${firstRow - 2}`), false);
            assert.equal(occupied.has(`${column}${firstRow - 1}`), false);
            assert.equal(occupied.has(`${column}${firstRow + 56}`), false);
        }
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

test("listas preservam campos ausentes, zeros e texto escapado sem copiar recebedores desmarcados", () => {
    restoreReceiptState({ operators: [
        { receiver: "[ops1]ANA&<SPX> SILVA", labeler: '[ops2]LIA" SOUZA', packagesReceived: 0, errorQuantity: 0 },
        { receiver: "Bruno", labeler: "", packagesReceived: null, errorQuantity: null },
        { receiver: "Caio", packagesReceived: 20, selected: false },
    ] });
    const payload = createReportSummaryClipboard("receipt");
    assert.equal(payload.hasData, true);
    assert.deepEqual(matrix(payload).slice(7, 9), [
        ["[ops1] Ana&<spx>", '[ops2] Lia"', "0", "0"], ["Bruno", "", "", ""],
    ]);
    assert.match(payload.html, /Ana&amp;&lt;spx&gt;/);
    assert.match(payload.html, /Lia&quot;/);
    assert.doesNotMatch(payload.text, /Caio/);
});

test("nomes copiados mantêm o código OPS e apenas o primeiro nome com inicial maiúscula", () => {
    for (const [input, expected] of [
        ["[ops112064]MARIANE RAMOS DE OLIVEIRA", "[ops112064] Mariane"],
        [" [OPS209211] ANTONIO HENRIQUE ALVES ", "[ops209211] Antonio"],
        ["[ops434601]WILLIAN SILVA SOUZA", "[ops434601] Willian"],
        ["[ops209316]JOÃO PAULO", "[ops209316] João"],
        ["[ops434593]TAMIRES CRISTINA", "[ops434593] Tamires"],
        ["MARIANE RAMOS", "Mariane"], ["[ops112064]", "[ops112064]"], [null, ""], ["", ""],
    ]) assert.equal(formatReportPersonWithOps(input), expected);
    restoreReceiptState({ operators: [{ receiver: "[ops112064]MARIANE RAMOS DE OLIVEIRA",
        labeler: "[ops209316]JOÃO PAULO", packagesReceived: 10 }] });
    assert.deepEqual(matrix(createReportSummaryClipboard("receipt"))[7],
        ["[ops112064] Mariane", "[ops209316] João", "10", ""]);
    restoreExpeditionState({ routes: [{ ...routes[0], validationOperator: "[ops434601]WILLIAN SILVA SOUZA" }] });
    assert.equal(matrix(createReportSummaryClipboard("expedition"))[16][0], "[ops434601] Willian");
});

test("conferentes seguem o ranking selecionado, agrupam rotas validadas e mantêm tempo ausente vazio", () => {
    restoreExpeditionState({
        excludedOperatorKeys: ["caio"],
        routes: [
            { code: "AT1", status: "Validated", validationOperator: "Ana", validationDurationSeconds: 60 },
            { code: "AT2", status: "Validated", validationOperator: "Ana", validationDurationSeconds: 120 },
            { code: "AT3", status: "Validated", validationOperator: "Bruno", validationDurationSeconds: 0 },
            { code: "AT4", status: "Validated", validationOperator: "Bia" },
            { code: "AT5", status: "Validated", validationOperator: "Caio", validationDurationSeconds: 30 },
            { code: "AT6", status: "Created", validationOperator: "Duda", validationDurationSeconds: 30 },
        ],
    });
    const rows = matrix(createReportSummaryClipboard("expedition"));
    assert.deepEqual(rows.slice(16, 19), [
        ["Ana", "", "2", "00:01:30"], ["Bruno", "", "1", "00:00:00"], ["Bia", "", "1", ""],
    ]);
    assert.ok(rows.slice(19).every(row => row.every(value => value === "")));
});

test("nova cópia com menos recebedores apaga as linhas restantes da lista anterior", () => {
    populate();
    assert.equal(matrix(createReportSummaryClipboard("receipt"))[8][0], "Bia");
    restoreReceiptState({ operators: [{ receiver: "Ana", packagesReceived: 10 }] });
    const rows = matrix(createReportSummaryClipboard("receipt"));
    assert.equal(rows.length, 56);
    assert.equal(rows[7][0], "Ana");
    assert.ok(rows.slice(8).every(row => row.every(value => value === "")));
});

test("listas cheias cabem na última linha e excesso impede a cópia sem descartar pessoas", async t => {
    const writes = [];
    const { text, expeditionText } = setup(t, { write: async items => writes.push(await items[0].data["text/plain"].text()) });
    for (const [kind, limit, notificationText] of [["receipt", 49, text], ["expedition", 40, expeditionText]]) {
        const setCount = count => {
            if (kind === "receipt") {
                restoreReceiptState({ operators: Array.from({ length: count }, (_, index) => ({
                    receiver: `Pessoa ${index + 1}`, packagesReceived: 1,
                })) });
            } else {
                restoreExpeditionState({ routes: Array.from({ length: count }, (_, index) => ({
                    code: `AT${index + 1}`, status: "Validated", validationOperator: `Pessoa ${index + 1}`,
                })) });
            }
        };
        setCount(limit + 1);
        const button = new Button();
        bindReportSummaryCopyButton(button, { reportId: kind, kind, subscribe: [] });
        const before = writes.length;
        const invalid = createReportSummaryClipboard(kind);
        assert.ok(invalid.copyError.includes(`comporta ${limit}`));
        await button.fire();
        assert.equal(writes.length, before);
        assert.equal(notificationText.textContent, invalid.copyError);
        setCount(limit);
        const valid = createReportSummaryClipboard(kind);
        assert.equal(valid.copyError, "");
        assert.equal(matrix(valid)[55][0], "Pessoa");
        await button.fire();
        assert.equal(writes.length, before + 1);
    }
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

function setup(t, clipboard, { nativeCopy = false, clipboardItem = true } = {}) {
    const notification = new Element();
    const text = new Element();
    const expeditionNotification = new Element();
    const expeditionText = new Element();
    const elements = {
        receiptNotification: notification, receiptNotificationIcon: new Image(), receiptNotificationText: text,
        expeditionNotification, expeditionNotificationIcon: new Image(), expeditionNotificationText: expeditionText,
    };
    replaceGlobal(t, "HTMLElement", Element);
    replaceGlobal(t, "HTMLButtonElement", Button);
    replaceGlobal(t, "HTMLImageElement", Image);
    const copyListeners = new Set();
    const nativeCopies = [];
    replaceGlobal(t, "document", {
        getElementById: id => elements[id],
        addEventListener: (type, handler) => { if (type === "copy") copyListeners.add(handler); },
        removeEventListener: (type, handler) => { if (type === "copy") copyListeners.delete(handler); },
        execCommand: command => {
            if (!nativeCopy || command !== "copy") return false;
            const data = {};
            const event = { clipboardData: { setData: (type, value) => { data[type] = value; } },
                preventDefault() { this.defaultPrevented = true; } };
            copyListeners.forEach(handler => handler(event));
            if (event.defaultPrevented) nativeCopies.push(data);
            return Boolean(event.defaultPrevented);
        },
    });
    replaceGlobal(t, "navigator", { clipboard });
    replaceGlobal(t, "ClipboardItem", clipboardItem ? class { constructor(data) { this.data = data; } } : undefined);
    return { notification, text, expeditionNotification, expeditionText, nativeCopies, copyListeners };
}

const receiptBinding = {
    reportId: "receipt", kind: "receipt",
    subscribe: [subscribeReceiptState, subscribeReceiptLinehaulState, subscribeReportContext],
};

test("clique grava apenas os dados e cabeçalhos do relatório em HTML e TSV", async t => {
    populate();
    const writes = [];
    const { notification, text, copyListeners } = setup(t, { write: async items => writes.push(items[0].data) });
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
    assert.match(text.textContent, /Cole em A62/);
    updateReportContextField("window", "PM2");
    await button.fire("click", { shiftKey: true });
    assert.equal(await writes[2]["text/plain"].text(), createReportSummaryClipboard("receipt").text);
    assert.match(text.textContent, /Cole em A121/);
    assert.match(button.title, /A121/);
    assert.equal(copyListeners.size, 0);
});

test("evento nativo copia HTML e TSV juntos e lê os dados atuais após importação e edição", async t => {
    const { nativeCopies, copyListeners } = setup(t, { write: async () => assert.fail("evento nativo deve ter prioridade") },
        { nativeCopy: true, clipboardItem: false });
    const button = new Button();
    bindReportSummaryCopyButton(button, receiptBinding);
    assert.equal(button.disabled, true);
    await button.fire();
    assert.deepEqual(nativeCopies, []);
    populate();
    assert.equal(button.disabled, false);
    updateReportContextField("plannedVolume", 4321);
    await button.fire();
    const payload = createReportSummaryClipboard("receipt");
    assert.equal(nativeCopies[0]["text/plain"], payload.text);
    assert.equal(nativeCopies[0]["text/html"], payload.html);
    assert.equal(matrix({ text: nativeCopies[0]["text/plain"] })[4][0], "4321");
    assert.equal(copyListeners.size, 0);
    resetReceiptReport();
    assert.equal(button.disabled, false);
    resetReceiptLinehaulState();
    assert.equal(button.disabled, true);
});

test("somente texto simples não informa sucesso nem substitui a cópia formatada", async t => {
    populate();
    const writes = [];
    const { notification, text, copyListeners } = setup(t, { writeText: async value => writes.push(value) }, { clipboardItem: false });
    const button = new Button();
    bindReportSummaryCopyButton(button, receiptBinding);
    await button.fire();
    assert.deepEqual(writes, []);
    assert.equal(notification.dataset.notificationType, "error");
    assert.match(text.textContent, /tabela com formatação/);
    assert.equal(copyListeners.size, 0);
});

test("falha de permissão e cliques duplicados restauram o botão e permitem nova tentativa", async t => {
    populate();
    let finish;
    const writes = [];
    const { notification, copyListeners } = setup(t, { write: value => {
        writes.push(value);
        return new Promise(resolve => { finish = resolve; });
    } });
    document.execCommand = () => { throw new Error("Native copy unavailable"); };
    const button = new Button();
    bindReportSummaryCopyButton(button, receiptBinding);
    const pending = button.fire();
    assert.equal(button.disabled, true);
    assert.equal(button.attributes["aria-busy"], "true");
    await button.fire();
    assert.equal(writes.length, 1);
    finish();
    await pending;
    navigator.clipboard.write = async () => { throw new Error("NotAllowedError"); };
    await button.fire();
    assert.equal(notification.dataset.notificationType, "error");
    assert.equal(button.disabled, false);
    assert.equal(button.attributes["aria-busy"], undefined);
    navigator.clipboard = undefined;
    await button.fire();
    assert.equal(notification.dataset.notificationType, "error");
    navigator.clipboard = { write: async value => writes.push(value) };
    await button.fire();
    assert.equal(notification.dataset.notificationType, "success");
    assert.equal(copyListeners.size, 0);
});

test("ambos os botões atualizam as notificações e dicas de colagem conforme a janela selecionada", async t => {
    populate();
    const writes = [];
    const { text, expeditionText } = setup(t, { write: async items => writes.push(await items[0].data["text/plain"].text()) });
    const receipt = new Button();
    const expedition = new Button();
    const root = { querySelector: selector => ({
        "#receiptCopySummaryButton": receipt, "#expeditionCopySummaryButton": expedition,
    })[selector] };
    assert.equal(initializeReportSummaryCopy(root), true);
    assert.equal(initializeReportSummaryCopy(root), true);
    for (const [window, receiptTarget, expeditionTarget] of [
        ["AM", "A3", "E3"], ["PM1", "A62", "E62"], ["PM2", "A121", "E121"],
    ]) {
        updateReportContextField("window", window);
        for (const [button, target] of [[receipt, receiptTarget], [expedition, expeditionTarget]]) {
            assert.ok(button.title.includes(`copiar para ${target} da aba Base do Resumo.`));
            assert.equal(button.attributes["aria-label"], button.title);
            await button.fire();
        }
        assert.equal(text.textContent,
            `Resumo de processamento copiado. Cole em ${receiptTarget} da aba Base do Resumo (${window}). Use Ctrl+V para manter mesclagens e alinhamento.`);
        assert.equal(expeditionText.textContent,
            `Resumo de expedição e erros copiado. Cole em ${expeditionTarget} da aba Base do Resumo (${window}). Use Ctrl+V para manter mesclagens e alinhamento.`);
    }
    assert.equal(writes.length, 6);
    assert.ok(writes.every(value => value.split("\n").length === 56));
    assert.equal(expedition.listeners.click.length, 1);
    resetExpeditionReport();
    assert.equal(expedition.disabled, true);
    assert.equal(bindReportSummaryCopyButton(null, receiptBinding), false);
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    for (const id of ["receiptCopySummaryButton", "expeditionCopySummaryButton"]) {
        assert.equal(html.split(`id="${id}"`).length - 1, 1);
    }
});
