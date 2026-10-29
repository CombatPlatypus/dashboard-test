import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { canExportReceiptSpreadsheet, createReceiptSpreadsheetBlob, createReceiptSpreadsheetFileName } from "../js/reports/receipt/spreadsheet.js";
import { canExportExpeditionSpreadsheet, createExpeditionSpreadsheetBlob, createExpeditionSpreadsheetFileName } from "../js/reports/expedition/spreadsheet.js";
import { createExpeditionSpreadsheetState, createReceiptSpreadsheetSnapshot } from "./fixtures/report-spreadsheets.mjs";
import { readXlsxTemplateWorksheet } from "../js/reports/xlsx-template.js";

const require = createRequire(import.meta.url);
const JSZip = require("../js/libraries/jszip.min.js");
const XLSX = require("../js/libraries/xlsx.full.min.js");
const date = new Date(2026, 9, 28, 12);
const options = {
    jsZipLibrary: JSZip,
    fetchFunction: async url => {
        const bytes = await readFile(new URL(`../${url}`, import.meta.url));
        return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
    },
};

async function generate(kind, state) {
    const create = kind === "receipt" ? createReceiptSpreadsheetBlob : createExpeditionSpreadsheetBlob;
    const blob = await create(state, date, options);
    const bytes = Buffer.from(await blob.arrayBuffer());
    const archive = await JSZip.loadAsync(bytes);
    const workbook = XLSX.read(bytes, { type: "buffer", cellNF: true });
    for (const sheetName of workbook.SheetNames) {
        const { cellValues } = await readXlsxTemplateWorksheet({ archive, sheetName });
        // Confere o texto gravado no XML; o leitor legado normaliza alguns caracteres Unicode.
        for (const [reference, value] of cellValues) {
            workbook.Sheets[sheetName][reference] ??= {};
            workbook.Sheets[sheetName][reference].v = value;
        }
    }
    return { blob, archive, workbook };
}

test("processamento preenche as duas abas, respeita seleções e mantém zeros e valores ausentes", async () => {
    const { workbook } = await generate("receipt", createReceiptSpreadsheetSnapshot());
    assert.deepEqual(workbook.SheetNames, ["Descarregamento de LHs", "Mesa de Recebimento"]);
    const lhs = workbook.Sheets[workbook.SheetNames[0]], receipt = workbook.Sheets[workbook.SheetNames[1]];
    assert.deepEqual(["A3", "C3", "E3", "G3"].map(ref => lhs[ref].v), ["PM1", 320, 120, 2]);
    assert.deepEqual(["A7", "C7", "E7", "G7", "A8", "G8", "A9"].map(ref => lhs[ref].v),
        ["LH001", "Motorista A", "Cajamar", 120, "LH003", 0, "—"]);
    assert.deepEqual(["A3", "C3", "E3", "G3", "I3"].map(ref => receipt[ref].v), ["PM1", 1000, 150, 3, "2,00%"]);
    assert.deepEqual(["A7", "E7", "G7", "I7", "A8", "G8", "I8", "A9"].map(ref => receipt[ref].v),
        ["[ops1]MARIA DA SILVA", 100, 3, "3,00%", "[ops2]JOSE SANTOS", "—", "—", "—"]);
    assert.deepEqual(["L2", "L3", "N3", "L4", "N4"].map(ref => receipt[ref].v), ["Recebedor", "Maria", "João", "Jose", "—"]);
});

test("processamento exporta a participação no total de erros quando selecionada", async () => {
    const snapshot = createReceiptSpreadsheetSnapshot();
    snapshot.receipt.useTotalErrorParticipation = true;
    const { workbook } = await generate("receipt", snapshot);
    assert.equal(workbook.Sheets["Mesa de Recebimento"].I6.v, "Participação nos Erros");
    assert.equal(workbook.Sheets["Mesa de Recebimento"].I7.v, "100,00%");
});

test("expedição preenche resumo, conferentes, erros e ruas usando os mesmos cálculos do relatório", async () => {
    const { workbook, archive } = await generate("expedition", createExpeditionSpreadsheetState());
    assert.deepEqual(workbook.SheetNames, ["Resumo da Expedição", "Análise de Erros e Ruas", "Tabelas dos Gráficos"]);
    assert.equal(workbook.Workbook.Sheets[2].Hidden, 1);
    const summary = workbook.Sheets[workbook.SheetNames[0]], errors = workbook.Sheets[workbook.SheetNames[1]];
    assert.deepEqual(["A3", "C3", "E3", "G3", "I3", "K3"].map(ref => summary[ref].v), ["PM1", 1, 2, 350, 10, "30:00"]);
    assert.deepEqual(["A7", "C7", "E7", "G7", "I7", "K7"].map(ref => summary[ref].v), [3, 2, 10, 3, 4, "—"]);
    assert.deepEqual(["A11", "E11", "G11", "I11", "K11", "A12"].map(ref => summary[ref].v), ["Ana", 2, "15:00", "10:00", "20:00", "—"]);
    assert.deepEqual(["A3", "C3", "E3", "G3", "A7", "C7", "E7", "G7"].map(ref => errors[ref].v), [4, 6, 10, "2,86%", 2, "20,00%", 8, "2,29%"]);
    assert.deepEqual(["J3", "L3", "J6", "L6"].map(ref => errors[ref].v), ["A", "B", "40,00%", "60,00%"]);
    assert.deepEqual(["J10", "K10", "L10", "M10", "J11", "J12"].map(ref => errors[ref].v), ["A", 2, 4, "40,00%", "B", "—"]);
    const hidden = workbook.Sheets["Tabelas dos Gráficos"];
    assert.equal(hidden.A2.v, "Erros de Etiquetagem");
    assert.equal(hidden.B2.f, "'Análise de Erros e Ruas'!C3");
    assert.deepEqual(["B1", "B2", "B3", "B4"].map(ref => hidden[ref].v), [4, 6, 2, 8]);
    const chart = await archive.file("xl/charts/chart1.xml").async("string");
    assert.match(chart, /Erros de Etiquetagem/);
    const cache = chart.match(/<c:numCache>([\s\S]*?)<\/c:numCache>/)[1];
    assert.deepEqual([...cache.matchAll(/<c:v>(.*?)<\/c:v>/g)].map(match => Number(match[1])), [4, 6, 2, 8]);
});

test("arquivos gerados preservam estilos, mesclagens, desenhos e fórmulas fora das áreas preenchidas", async () => {
    for (const [kind, state, template] of [["receipt", createReceiptSpreadsheetSnapshot(), "Processamento"],
        ["expedition", createExpeditionSpreadsheetState(), "Expedição"]]) {
        const original = await JSZip.loadAsync(await readFile(new URL(`../xlsx/Relatório de ${template}.xlsx`, import.meta.url)));
        const { archive, workbook } = await generate(kind, state);
        assert.deepEqual(Object.keys(archive.files).sort(), Object.keys(original.files).sort());
        for (const filename of Object.keys(original.files).filter(name => !original.files[name].dir && !/^xl\/(worksheets\/sheet\d+|charts\/chart\d+)\.xml$/.test(name))) {
            assert.deepEqual(await archive.file(filename).async("uint8array"), await original.file(filename).async("uint8array"), filename);
        }
        for (const filename of Object.keys(original.files).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))) {
            const before = await original.file(filename).async("string"), after = await archive.file(filename).async("string");
            assert.equal(after.match(/<mergeCells\b[\s\S]*?<\/mergeCells>/)?.[0], before.match(/<mergeCells\b[\s\S]*?<\/mergeCells>/)?.[0]);
            assert.deepEqual([...after.matchAll(/<c\b[^>]*\br="([^"]+)"[^>]*\bs="([^"]+)"/g)].map(match => match.slice(1)),
                [...before.matchAll(/<c\b[^>]*\br="([^"]+)"[^>]*\bs="([^"]+)"/g)].map(match => match.slice(1)));
        }
        if (kind === "expedition") assert.ok(workbook.Sheets["Tabelas dos Gráficos"].A7.f.startsWith("SORT("));
    }
});

test("capacidade do próprio modelo bloqueia o download em vez de perder linhas", async () => {
    const snapshot = createReceiptSpreadsheetSnapshot();
    snapshot.linehaul.linehauls = Array.from({ length: 16 }, (_, index) => ({ code: `LH${index}`, selected: true, loadedOrders: 1 }));
    await assert.rejects(generate("receipt", snapshot), /até 15 LHs descarregados/);
    snapshot.linehaul.linehauls = [];
    snapshot.receipt.operators = Array.from({ length: 30 }, (_, index) => ({ receiver: `Operador ${index}`, packagesReceived: 1, errorQuantity: 0 }));
    await assert.rejects(generate("receipt", snapshot), /até 29 recebedores/);
    const state = createExpeditionSpreadsheetState();
    state.excludedOperatorKeys = [];
    state.routes = Array.from({ length: 41 }, (_, index) => ({ ...state.routes[0], validationOperator: `Conferente ${index}` }));
    await assert.rejects(generate("expedition", state), /até 40 conferentes/);
    state.routes = Array.from({ length: 19 }, (_, index) => ({ ...state.routes[0], corridor: `RUA ${index}` }));
    await assert.rejects(generate("expedition", state), /até 18 ruas/);
});

test("ausência de dados, arquivos e biblioteca tem tratamento explícito e nomes seguem a data local", async () => {
    assert.equal(canExportReceiptSpreadsheet({ receipt: { operators: [] }, linehaul: { linehauls: [] } }), false);
    assert.equal(canExportExpeditionSpreadsheet({ routes: [], hasErrorData: false }), false);
    await assert.rejects(createReceiptSpreadsheetBlob(createReceiptSpreadsheetSnapshot(), date, {
        ...options, fetchFunction: async () => ({ ok: false, status: 404 }),
    }), /404/);
    await assert.rejects(createExpeditionSpreadsheetBlob(createExpeditionSpreadsheetState(), date, {
        ...options, jsZipLibrary: {},
    }), /JSZip/);
    assert.equal(createReceiptSpreadsheetFileName(date), "relatorio-de-processamento-2026-10-28.xlsx");
    assert.equal(createExpeditionSpreadsheetFileName(date), "relatorio-de-expedicao-2026-10-28.xlsx");
});
