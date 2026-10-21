import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { beforeEach, test } from "node:test";

import {
    createDamageMonthData,
    createLossesMonthData,
    findDamageMonthSource,
    findLossesMonthSource,
    readDamageAndLossesFile,
} from "../js/reports/damage-and-losses/import.js";
import {
    createDamageAndLossesWorkbook,
} from "./fixtures/damage-and-losses-workbook.mjs";

const require = createRequire(import.meta.url);
const XLSX = require("../js/libraries/xlsx.full.min.js");
const historyName = "Histórico de Avarias e Perdas";
const referenceDate = new Date(2026, 9, 20, 12);

function createFile(workbook) {
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    return {
        name: "Avarias e Perdas.xlsx",
        arrayBuffer: async () => bytes,
    };
}

beforeEach(() => {
    globalThis.window = { XLSX };
});

test("importa o novo XLSX completo sem misturar os históricos lado a lado", async () => {
    const result = await readDamageAndLossesFile(
        createFile(createDamageAndLossesWorkbook()),
        referenceDate,
    );

    assert.equal(result.damage.sourceSheetName, historyName);
    assert.equal(result.losses.sourceSheetName, historyName);
    assert.equal(result.damage.importedRows, 3);
    assert.deepEqual(result.damage.days.map(day => ({
        date: day.date,
        hub: day.hub,
        soc: day.soc,
        liquid: day.liquid,
        glass: day.glass,
    })), [
        { date: "2026-10-01", hub: 1, soc: 0, liquid: 1, glass: 0 },
        { date: "2026-10-05", hub: 0, soc: 1, liquid: 0, glass: 0 },
        { date: "2026-10-06", hub: 1, soc: 0, liquid: 0, glass: 1 },
    ]);
    assert.deepEqual(result.damage.socStations, [
        { name: "SOC_SP_Cajamar", count: 1 },
    ]);
    assert.equal(result.losses.importedRows, 4);
    assert.equal(result.losses.returnedImportedRows, 2);
    assert.deepEqual(result.losses.days, [
        { date: "2026-10-01", underReview: 0, confirmedLosses: 1, returnedPackages: 0, recoveryDone: 1, recoveryNotDone: 0, recoveryInvalidId: 0, recoveryUninformed: 0 },
        { date: "2026-10-02", underReview: 1, confirmedLosses: 0, returnedPackages: 1, recoveryDone: 0, recoveryNotDone: 1, recoveryInvalidId: 0, recoveryUninformed: 0 },
        { date: "2026-10-03", underReview: 0, confirmedLosses: 2, returnedPackages: 1, recoveryDone: 0, recoveryNotDone: 0, recoveryInvalidId: 1, recoveryUninformed: 1 },
    ]);
    assert.equal(result.lossesRate.importedRows, 12);
    assert.deepEqual(result.lossesRate.history[9], {
        possibleLosses: 111, lost: 26, damage: 60, moved: 356741,
    });
    assert.deepEqual(result.lossesRate.history[0], {
        possibleLosses: 0, lost: 0, damage: 0, moved: 0,
    });
});

test("cada histórico seleciona seu próprio mês quando um bloco só tem dados anteriores", () => {
    const workbook = createDamageAndLossesWorkbook();
    const sheet = workbook.Sheets[historyName];
    for (const [address, day] of [["B3", 1], ["B4", 5], ["B5", 6]]) {
        sheet[address] = { t: "d", v: new Date(2026, 8, day, 12) };
    }

    const damage = createDamageMonthData(findDamageMonthSource(workbook), referenceDate);
    const losses = createLossesMonthData(findLossesMonthSource(workbook), referenceDate);
    assert.equal(damage.monthIndex, 8);
    assert.equal(damage.fallbackUsed, true);
    assert.equal(damage.importedRows, 3);
    assert.equal(losses.monthIndex, 9);
    assert.equal(losses.fallbackUsed, false);
    assert.equal(losses.importedRows, 4);
});

test("identifica os blocos pelos títulos mesmo se as posições forem trocadas", () => {
    const workbook = createDamageAndLossesWorkbook();
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[historyName], {
        header: 1, defval: "", raw: true, blankrows: false,
    });
    workbook.Sheets[historyName] = XLSX.utils.aoa_to_sheet(rows.map(row => [
        ...row.slice(10, 14), ...Array(6).fill(""), ...row.slice(0, 4),
    ]));

    assert.equal(createDamageMonthData(findDamageMonthSource(workbook), referenceDate).importedRows, 3);
    assert.equal(createLossesMonthData(findLossesMonthSource(workbook), referenceDate).importedRows, 4);
});

test("não usa o cabeçalho do bloco vizinho quando faltam colunas de avarias", () => {
    const workbook = createDamageAndLossesWorkbook();
    delete workbook.Sheets[historyName].C2;
    assert.throws(() => findDamageMonthSource(workbook), /bloco Histórico de Avarias.*colunas necessárias/);
    assert.equal(createLossesMonthData(findLossesMonthSource(workbook), referenceDate).importedRows, 4);
});

test("informa bloco ausente e cabeçalho incompleto nas perdas", () => {
    const workbook = createDamageAndLossesWorkbook();
    delete workbook.Sheets[historyName].N2;
    assert.throws(() => findLossesMonthSource(workbook), /bloco Histórico de Perdas.*Situação/);

    delete workbook.Sheets[historyName].K1;
    assert.throws(() => findLossesMonthSource(workbook), /não possui o bloco Histórico de Perdas/);
});

test("exige a nova aba unificada em vez do modelo antigo com abas separadas", async () => {
    const workbook = createDamageAndLossesWorkbook();
    XLSX.utils.book_append_sheet(workbook, workbook.Sheets[historyName], "Histórico de Avarias");
    XLSX.utils.book_append_sheet(workbook, workbook.Sheets[historyName], "Histórico de Análises");
    workbook.SheetNames = workbook.SheetNames.filter(name => name !== historyName);
    delete workbook.Sheets[historyName];

    assert.throws(() => findDamageMonthSource(workbook), /não possui a aba Histórico de Avarias e Perdas/);
    assert.throws(() => findLossesMonthSource(workbook), /não possui a aba Histórico de Avarias e Perdas/);
    assert.equal(findDamageMonthSource(workbook, { required: false }), null);
    assert.equal(findLossesMonthSource(workbook, { required: false }), null);
    await assert.rejects(readDamageAndLossesFile(createFile(workbook), referenceDate), /Histórico de Avarias e Perdas/);
});
