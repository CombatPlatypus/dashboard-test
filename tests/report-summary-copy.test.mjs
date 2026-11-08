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
import { replaceParcelRows, resetParcelReport, restoreParcelState, updateParcelFilter } from "../js/reports/parcel-sweeper/state.js";
import { resetReverseReport, restoreReverseState, upsertReverseTransfer } from "../js/reports/reverse/state.js";

const require = createRequire(import.meta.url);
const XLSX = require("../js/libraries/xlsx.full.min.js");
const matrix = payload => payload.text.split("\n").map(row => row.split("\t"));
const routes = [{
    code: "AT1", status: "Validated", finalOrders: 1000, missortedOrders: 50,
    validationOperator: "Ana", validationStartTime: "2026-10-23 08:00:00",
    validationEndTime: "2026-10-23 09:05:30", validationDurationSeconds: 3930,
}];
const parcelRows = [
    { trackingNumber: "BR1", countType: "Backlog", expected: "Y" },
    { trackingNumber: "BR2", countType: "Exception", expected: "Y" },
    { trackingNumber: "BR3", countType: "Missing", expected: "Y" },
    { trackingNumber: "BR4", countType: "Missing", expected: "Y" },
    { trackingNumber: "BR5", countType: "Mis-sorted", expected: "N" },
    { trackingNumber: "BR6", countType: "Exception", expected: "N" },
];
const reverseTransfers = [
    { to: "TO1", quantities: { return: 5, missorted: 2, liquidate: 0, confiscated: 1 } },
    { to: "TO2", quantities: { return: 3, missorted: 0, liquidate: 7, confiscated: 2 } },
];
const copyDate = new Date("2026-11-02T12:00:00-03:00");

beforeEach(() => {
    resetReceiptReport();
    resetReceiptLinehaulState();
    resetExpeditionReport();
    resetParcelReport();
    resetReverseReport();
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

test("processamento inclui o resumo e a lista dos recebedores selecionados em C7:F62", () => {
    populate();
    const payload = createReportSummaryClipboard("receipt");
    assert.equal(payload.target, "C7");
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

test("expedição inclui resumo, erros e lista de conferentes em G7:J62", () => {
    populate();
    const payload = createReportSummaryClipboard("expedition");
    assert.equal(payload.target, "G7");
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

test("parcel copia G5:J9 com data em J5 e traço em H7, deixando espaço para a reversa em G11", () => {
    replaceParcelRows(parcelRows);
    const payload = createReportSummaryClipboard("parcel", { now: copyDate });
    assert.equal(payload.target, "G5");
    assert.equal(payload.sheet, "Base da Visão Geral");
    assert.equal(payload.hasData, true);
    assert.equal(payload.copyError, "");
    assert.deepEqual(matrix(payload), [
        ["Relatório Parcel Sweeper", "", "", "02/11/2026"],
        ["Porcentagem Total", "", "Total de Bipado", ""],
        ["50,00%", "-", "4", ""],
        ["Pacotes Exception", "", "Pacotes Missorted", ""],
        ["2", "", "1", ""],
    ]);
    const workbook = XLSX.read(payload.html, { type: "string" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    assert.deepEqual(sheet["!merges"].map(XLSX.utils.encode_range), [
        "A1:C1", "A2:B2", "C2:D2", "C3:D3", "A4:B4", "C4:D4", "A5:B5", "C5:D5",
    ]);
    assert.equal(sheet.B3.v, "-");
    assert.equal(sheet.C3.v, 4);
    assert.equal(sheet.A5.v, 2);
    assert.equal(sheet.C5.v, 1);
    assert.equal([...payload.html.matchAll(/<col width="100"/g)].length, 4);
    const cells = [...payload.html.matchAll(/<td\b([^>]*)>([^<]*)<\/td>/g)];
    assert.equal(cells.length, 11);
    assert.deepEqual(cells.slice(4, 6).map(([, , text]) => text), ["50,00%", "-"]);
    assert.ok(cells.slice(4, 6).every(([, attributes]) => attributes.includes('colspan="1"')));
    for (const [, attributes] of cells) {
        assert.match(attributes, /border:1px solid #000000;/);
        assert.match(attributes, /text-align:center;vertical-align:middle/);
        const format = JSON.parse(attributes.match(/data-sheets-userformat='([^']+)'/)[1]);
        assert.equal(format["9"], 1);
        assert.equal(format["10"], 1);
        assert.equal(format["15"], "Roboto");
    }
    assert.match(cells[0][1], /colspan="3"/);
    assert.match(cells[0][1], /font-size:12pt/);
    assert.match(cells[1][1], /colspan="1"/);
    assert.equal(cells[1][2], "02/11/2026");
});

test("parcel mantém zeros reais e deixa a porcentagem vazia quando não há base de cobertura", () => {
    let payload = createReportSummaryClipboard("parcel");
    assert.equal(payload.hasData, false);
    assert.deepEqual(matrix(payload)[2], Array(4).fill(""));
    assert.deepEqual(matrix(payload)[4], Array(4).fill(""));
    replaceParcelRows([{ trackingNumber: "BR1", countType: "Missing", expected: "Y" }]);
    payload = createReportSummaryClipboard("parcel");
    assert.equal(payload.hasData, true);
    assert.deepEqual(matrix(payload)[2], ["0,00%", "-", "0", ""]);
    assert.deepEqual(matrix(payload)[4], ["0", "", "0", ""]);
    replaceParcelRows(parcelRows.map(row => ({ ...row, expected: "N" })));
    payload = createReportSummaryClipboard("parcel");
    assert.deepEqual(matrix(payload)[2], ["", "-", "4", ""]);
    assert.deepEqual(matrix(payload)[4], ["2", "", "1", ""]);
    replaceParcelRows(parcelRows.map(({ expected, ...row }) => row));
    assert.equal(matrix(createReportSummaryClipboard("parcel"))[2][0], "66,67%");
});

test("parcel copia o resumo completo em G5 independentemente da janela e do filtro de pacotes", () => {
    replaceParcelRows(parcelRows);
    const original = createReportSummaryClipboard("parcel");
    for (const window of ["AM", "PM1", "PM2"]) {
        updateReportContextField("window", window);
        for (const filter of ["backlog", "exception", "all"]) {
            updateParcelFilter(filter);
            const payload = createReportSummaryClipboard("parcel");
            assert.equal(payload.text, original.text);
            assert.equal(payload.target, "G5");
            assert.equal(payload.shift, null);
        }
    }
});

test("botão do parcel acompanha importação, limpeza e restauração e orienta colar na Base da Visão Geral", async t => {
    const { nativeCopies, parcelNotification, parcelText } = setup(t, {}, { nativeCopy: true, clipboardItem: false });
    const { parcel, root } = createCopyButtons();
    assert.equal(initializeReportSummaryCopy(root), true);
    assert.equal(initializeReportSummaryCopy(root), true);
    assert.equal(parcel.listeners.click.length, 1);
    assert.equal(parcel.disabled, true);
    await parcel.fire();
    assert.equal(nativeCopies.length, 0);
    replaceParcelRows(parcelRows);
    assert.equal(parcel.disabled, false);
    assert.equal(parcel.title, "Relatório Parcel Sweeper: copiar para G5 da aba Base da Visão Geral.");
    assert.equal(parcel.attributes["aria-label"], parcel.title);
    await parcel.fire();
    const payload = createReportSummaryClipboard("parcel");
    assert.equal(nativeCopies[0]["text/plain"], payload.text);
    assert.equal(nativeCopies[0]["text/html"], payload.html);
    assert.equal(parcelNotification.dataset.notificationType, "success");
    assert.equal(parcelText.textContent,
        "Relatório Parcel Sweeper copiado. Cole em G5 da aba Base da Visão Geral. Use Ctrl+V para manter mesclagens e alinhamento.");
    assert.equal(parcel.attributes["aria-busy"], undefined);
    resetParcelReport();
    assert.equal(parcel.disabled, true);
    await parcel.fire();
    assert.equal(nativeCopies.length, 1);
    restoreParcelState({ rows: [{ trackingNumber: "BR1", countType: "Mis-sorted", expected: "Y" }] });
    assert.equal(parcel.disabled, false);
    await parcel.fire();
    const restored = matrix({ text: nativeCopies[1]["text/plain"] });
    assert.deepEqual(restored[2], ["100,00%", "-", "1", ""]);
    assert.deepEqual(restored[4], ["0", "", "1", ""]);
});

test("reversa copia G11:J13 com título, data e os totais das TOs na ordem da planilha", () => {
    restoreReverseState({ transfers: reverseTransfers });
    const payload = createReportSummaryClipboard("reverse", { now: copyDate });
    assert.equal(payload.target, "G11");
    assert.equal(payload.sheet, "Base da Visão Geral");
    assert.equal(payload.hasData, true);
    assert.equal(payload.copyError, "");
    assert.deepEqual(matrix(payload), [
        ["Reversa", "", "", "02/11/2026"],
        ["Return", "Missorted", "Liquidate", "Confiscado"],
        ["8", "2", "7", "3"],
    ]);
    const workbook = XLSX.read(payload.html, { type: "string" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    assert.deepEqual(sheet["!merges"].map(XLSX.utils.encode_range), ["A1:C1"]);
    assert.deepEqual([sheet.A3.v, sheet.B3.v, sheet.C3.v, sheet.D3.v], [8, 2, 7, 3]);
    assert.equal([...payload.html.matchAll(/<col width="125"/g)].length, 4);
    const cells = [...payload.html.matchAll(/<td\b([^>]*)>([^<]*)<\/td>/g)];
    assert.equal(cells.length, 10);
    for (const [, attributes] of cells) {
        assert.match(attributes, /border:1px solid #000000;/);
        assert.match(attributes, /text-align:center;vertical-align:middle/);
    }
    assert.match(cells[0][1], /colspan="3"/);
    assert.match(cells[0][1], /font-size:12pt/);
    assert.match(cells[1][1], /colspan="1"/);
});

test("reversa deixa totais vazios sem dados e preserva zeros com uma categoria importada", () => {
    let payload = createReportSummaryClipboard("reverse");
    assert.equal(payload.hasData, false);
    assert.deepEqual(matrix(payload)[2], ["", "", "", ""]);
    upsertReverseTransfer({ to: "TO1", quantities: { return: 10 } });
    payload = createReportSummaryClipboard("reverse");
    assert.equal(payload.hasData, true);
    assert.deepEqual(matrix(payload)[2], ["10", "0", "0", "0"]);
    for (const window of ["AM", "PM1", "PM2"]) {
        updateReportContextField("window", window);
        assert.equal(createReportSummaryClipboard("reverse").target, "G11");
        assert.equal(createReportSummaryClipboard("reverse").shift, null);
    }
});

test("botão da reversa acompanha TOs atualizadas, limpeza e restauração e copia HTML e TSV", async t => {
    const { nativeCopies, reverseNotification, reverseText } = setup(t, {}, { nativeCopy: true, clipboardItem: false });
    const { reverse, root } = createCopyButtons();
    assert.equal(initializeReportSummaryCopy(root), true);
    assert.equal(initializeReportSummaryCopy(root), true);
    assert.equal(reverse.listeners.click.length, 1);
    assert.equal(reverse.disabled, true);
    await reverse.fire();
    assert.equal(nativeCopies.length, 0);
    restoreReverseState({ transfers: reverseTransfers });
    assert.equal(reverse.disabled, false);
    assert.equal(reverse.title, "Resumo de reversa: copiar para G11 da aba Base da Visão Geral.");
    assert.equal(reverse.attributes["aria-label"], reverse.title);
    await reverse.fire();
    const payload = createReportSummaryClipboard("reverse");
    assert.equal(nativeCopies[0]["text/plain"], payload.text);
    assert.equal(nativeCopies[0]["text/html"], payload.html);
    assert.equal(reverseNotification.dataset.notificationType, "success");
    assert.equal(reverseText.textContent,
        "Resumo de reversa copiado. Cole em G11 da aba Base da Visão Geral. Use Ctrl+V para manter mesclagens e alinhamento.");
    upsertReverseTransfer({ to: "TO1", quantities: { return: 2 } });
    await reverse.fire();
    assert.deepEqual(matrix({ text: nativeCopies[1]["text/plain"] })[2], ["5", "0", "7", "2"]);
    resetReverseReport();
    assert.equal(reverse.disabled, true);
    await reverse.fire();
    assert.equal(nativeCopies.length, 2);
    restoreReverseState({ transfers: reverseTransfers });
    assert.equal(reverse.disabled, false);
    await reverse.fire();
    assert.deepEqual(matrix({ text: nativeCopies[2]["text/plain"] })[2], ["8", "2", "7", "3"]);
});

test("data do Parcel e da Reversa usa o dia de São Paulo e muda na próxima cópia após a meia-noite", async t => {
    const RealDate = Date;
    let instant = RealDate.parse("2026-11-03T02:59:59Z");
    replaceGlobal(t, "Date", class extends RealDate {
        constructor(...args) { super(...(args.length ? args : [instant])); }
        static now() { return instant; }
    });
    replaceParcelRows(parcelRows);
    restoreReverseState({ transfers: reverseTransfers });
    const { nativeCopies } = setup(t, {}, { nativeCopy: true, clipboardItem: false });
    const { parcel, reverse, root } = createCopyButtons();
    initializeReportSummaryCopy(root);
    await parcel.fire();
    await reverse.fire();
    assert.equal(matrix({ text: nativeCopies[0]["text/plain"] })[0][3], "02/11/2026");
    assert.equal(matrix({ text: nativeCopies[1]["text/plain"] })[0][3], "02/11/2026");
    instant = RealDate.parse("2026-11-03T03:00:00Z");
    await parcel.fire();
    await reverse.fire();
    assert.equal(matrix({ text: nativeCopies[2]["text/plain"] })[0][3], "03/11/2026");
    assert.equal(matrix({ text: nativeCopies[3]["text/plain"] })[0][3], "03/11/2026");
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
    for (const [window, firstRow] of [["AM", 7], ["PM1", 67], ["PM2", 127]]) {
        const options = { context: { window } };
        const receipt = createReportSummaryClipboard("receipt", options);
        const expedition = createReportSummaryClipboard("expedition", options);
        assert.equal(receipt.target, `C${firstRow}`);
        assert.equal(expedition.target, `G${firstRow}`);
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
        for (const column of "CDEFGHIJ") {
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

function createCopyButtons() {
    const receipt = new Button(), expedition = new Button(), parcel = new Button(), reverse = new Button();
    const root = { querySelector: selector => ({
        "#receiptCopySummaryButton": receipt, "#expeditionCopySummaryButton": expedition,
        "#parcelCopySummaryButton": parcel, "#reverseCopySummaryButton": reverse,
    })[selector] };
    return { receipt, expedition, parcel, reverse, root };
}

function setup(t, clipboard, { nativeCopy = false, clipboardItem = true } = {}) {
    const notification = new Element();
    const text = new Element();
    const expeditionNotification = new Element();
    const expeditionText = new Element();
    const parcelNotification = new Element();
    const parcelText = new Element();
    const reverseNotification = new Element();
    const reverseText = new Element();
    const elements = {
        receiptNotification: notification, receiptNotificationIcon: new Image(), receiptNotificationText: text,
        expeditionNotification, expeditionNotificationIcon: new Image(), expeditionNotificationText: expeditionText,
        parcelNotification, parcelNotificationIcon: new Image(), parcelNotificationText: parcelText,
        reverseNotification, reverseNotificationIcon: new Image(), reverseNotificationText: reverseText,
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
    return { notification, text, expeditionNotification, expeditionText, parcelNotification, parcelText,
        reverseNotification, reverseText, nativeCopies, copyListeners };
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
    assert.match(text.textContent, /Cole em C7/);
    updateReportContextField("window", "PM1");
    await button.fire("contextmenu");
    assert.equal(writes.length, 1);
    await button.fire();
    assert.equal(await writes[1]["text/plain"].text(), createReportSummaryClipboard("receipt").text);
    assert.match(text.textContent, /Cole em C67/);
    updateReportContextField("window", "PM2");
    await button.fire("click", { shiftKey: true });
    assert.equal(await writes[2]["text/plain"].text(), createReportSummaryClipboard("receipt").text);
    assert.match(text.textContent, /Cole em C127/);
    assert.match(button.title, /C127/);
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
    const { receipt, expedition, root } = createCopyButtons();
    assert.equal(initializeReportSummaryCopy(root), true);
    assert.equal(initializeReportSummaryCopy(root), true);
    for (const [window, receiptTarget, expeditionTarget] of [
        ["AM", "C7", "G7"], ["PM1", "C67", "G67"], ["PM2", "C127", "G127"],
    ]) {
        updateReportContextField("window", window);
        for (const [button, target] of [[receipt, receiptTarget], [expedition, expeditionTarget]]) {
            assert.ok(button.title.includes(`copiar para ${target} da aba Base dos Turnos.`));
            assert.equal(button.attributes["aria-label"], button.title);
            await button.fire();
        }
        assert.equal(text.textContent,
            `Resumo de processamento copiado. Cole em ${receiptTarget} da aba Base dos Turnos (${window}). Use Ctrl+V para manter mesclagens e alinhamento.`);
        assert.equal(expeditionText.textContent,
            `Resumo de expedição e erros copiado. Cole em ${expeditionTarget} da aba Base dos Turnos (${window}). Use Ctrl+V para manter mesclagens e alinhamento.`);
    }
    assert.equal(writes.length, 6);
    assert.ok(writes.every(value => value.split("\n").length === 56));
    assert.equal(expedition.listeners.click.length, 1);
    resetExpeditionReport();
    assert.equal(expedition.disabled, true);
    assert.equal(bindReportSummaryCopyButton(null, receiptBinding), false);
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    for (const id of ["receiptCopySummaryButton", "expeditionCopySummaryButton", "parcelCopySummaryButton", "reverseCopySummaryButton"]) {
        assert.equal(html.split(`id="${id}"`).length - 1, 1);
    }
});
