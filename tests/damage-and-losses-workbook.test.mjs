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
import { getDamageAndLossesState, replaceDamageAndLossesData, resetDamageAndLossesState, subscribeDamageAndLossesState } from "../js/reports/damage-and-losses/state.js";
import { getLossesState, replaceLossesData, resetLossesState, subscribeLossesState } from "../js/reports/damage-and-losses/losses-state.js";
import { buildEmployeeOccurrenceRanking } from "../js/reports/employee-ranking/model.js";
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
    assert.equal(result.damage.receivedDamage, null);
    assert.equal(result.losses.importedRows, 4);
    assert.equal(result.losses.returnedImportedRows, 2);
    assert.equal(result.losses.offPackages, null);
    assert.deepEqual(result.losses.days, [
        { date: "2026-10-01", underReview: 0, confirmedLosses: 1, returnedPackages: 0, recoveryDone: 1, recoveryPending: 0, recoveryInvalidId: 0, recoveryUninformed: 0 },
        { date: "2026-10-02", underReview: 1, confirmedLosses: 0, returnedPackages: 1, recoveryDone: 0, recoveryPending: 1, recoveryInvalidId: 0, recoveryUninformed: 0 },
        { date: "2026-10-03", underReview: 0, confirmedLosses: 2, returnedPackages: 1, recoveryDone: 0, recoveryPending: 0, recoveryInvalidId: 1, recoveryUninformed: 1 },
    ]);
    assert.equal(result.lossesRate.importedRows, 12);
    assert.deepEqual(result.lossesRate.history[9], {
        possibleLosses: 111, lost: 26, damage: 60, moved: 356741,
    });
    assert.deepEqual(result.lossesRate.history[0], {
        possibleLosses: 0, lost: 0, damage: 0, moved: 0,
    });
});

test("conta Pacotes OFF por linha, Log e mês da expedição em São Paulo", async t => {
    const returnedName = "Histórico de Retornados";
    const workbook = createDamageAndLossesWorkbook(returnedName);
    const novemberSerial = Date.UTC(2026, 10, 15) / 86_400_000 + 25569;
    workbook.Sheets[returnedName] = XLSX.utils.aoa_to_sheet([
        ["", "Histórico de Retornados - Novembro"],
        ["", "Semana", "Devolução", "Expedição", "Código BR", "Rota Embarcada", "Rota Correta", "AT Embarcada", "Log", "Turno"],
        ["", "W44", "01/11/2026", "31/10/2026", "R1", "", "", "", "Antônio da Costa", "AM"],
        ["", "W46", "16/11/2026", "15/11/2026", "R2", "", "", "", "  MARIA da SILVA Santos ", "AM"],
        ["", "W46", "16/11/2026", new Date(2026, 10, 16, 12), "R2", "", "", "", "Maria   da Silva Santos", "PM2"],
        ["", "W46", "01/12/2026", novemberSerial, "R3", "", "", "", "João de Souza Assis", "AM"],
        ["", "W46", "", "2026-11-16", "", "", "", "", "Ana da Rocha Costa", ""],
        ["", "W46", "16/11/2026", "", "R4", "", "", "", "Fora da Contagem", "AM"],
        ["", "W46", "16/11/2026", "15/11/2026", "R5", "", "", "", " ", "PM2"],
        ["", "W46", "16/11/2026", "16/11/2025", "R6", "", "", "", "Outro Ano", "AM"],
    ]);
    const file = createFile(workbook);
    const result = await readDamageAndLossesFile(file, new Date("2026-11-16T15:00:00Z"));
    assert.equal(result.losses.offPackages.month, "2026-11");
    assert.deepEqual(buildEmployeeOccurrenceRanking(result.losses.offPackages.operators).map(entry => [
        entry.displayName, entry.quantity,
    ]), [
        ["Ana Rocha", 1],
        ["João Souza", 1],
        ["Maria Silva", 2],
    ]);

    const beginningOfMonthUtc = await readDamageAndLossesFile(file, new Date("2026-11-01T01:00:00Z"));
    assert.deepEqual(beginningOfMonthUtc.losses.offPackages, {
        month: "2026-10", operators: [{ operator: "Antônio da Costa", quantity: 1 }],
    });

    const offChanges = [];
    const unsubscribe = subscribeLossesState((_, change) => offChanges.push(change.offPackagesChanged));
    t.after(() => {
        unsubscribe();
        resetLossesState();
    });
    replaceLossesData(result.losses);
    assert.deepEqual(getLossesState().offPackages, result.losses.offPackages);
    replaceLossesData(result.losses);
    assert.deepEqual(offChanges, [true, false]);
    resetLossesState();
    assert.equal(getLossesState().offPackages, null);
    assert.deepEqual(offChanges, [true, false, true]);
});

test("conta Avarias Recebidas por Data e Log no mês, independentemente do turno", async t => {
    const workbook = createDamageAndLossesWorkbook();
    const novemberSerial = Date.UTC(2026, 10, 15) / 86_400_000 + 25569;
    workbook.Sheets["Histórico de Avarias Recebidas"] = XLSX.utils.aoa_to_sheet([
        ["", "Histórico de Avarias Recebidas"],
        ["", "Semana", "Data", "Código BR", "Turno", "Tipo de Produto", "Local de Apuração", "Log"],
        ["", "W44", "31/10/2026", "AV1", "AM", "Líquido", "Recebimento", "Ana da Rocha Lima"],
        ["", "W46", "15/11/2026", "AV2", "AM", "Vidro", "Recebimento", " MARIA da SILVA Santos "],
        ["", "W46", new Date(2026, 10, 16, 12), "AV2", "PM2", "Vidro", "Expedição", "Maria   da Silva Santos"],
        ["", "W46", novemberSerial, "AV3", "PM1", "Líquido", "Sorting/Alocação", "João de Souza Assis"],
        ["", "W46", "2026-11-16", "AV4", "AM", "Vidro", "Recebimento", "Ana da Rocha Lima"],
        ["", "W46", "16/11/2025", "AV5", "AM", "Vidro", "Recebimento", "Outro Ano"],
        ["", "W46", "16/11/2026", "AV6", "AM", "Vidro", "Recebimento", " "],
        ["", "W46", "", "AV7", "AM", "Vidro", "Recebimento", "Sem Data"],
    ]);
    const file = createFile(workbook);
    const { damage, losses } = await readDamageAndLossesFile(file, new Date("2026-11-16T15:00:00Z"));
    assert.equal(damage.receivedDamage.month, "2026-11");
    assert.equal(losses.offPackages, null);
    assert.deepEqual(buildEmployeeOccurrenceRanking(damage.receivedDamage.operators).map(entry => [
        entry.displayName, entry.quantity,
    ]), [
        ["Ana Rocha", 1],
        ["João Souza", 1],
        ["Maria Silva", 2],
    ]);

    const beginningOfMonthUtc = await readDamageAndLossesFile(file, new Date("2026-11-01T01:00:00Z"));
    assert.deepEqual(beginningOfMonthUtc.damage.receivedDamage, {
        month: "2026-10", operators: [{ operator: "Ana da Rocha Lima", quantity: 1 }],
    });

    const receivedDamageChanges = [];
    const unsubscribe = subscribeDamageAndLossesState((_, change) => receivedDamageChanges.push(change.receivedDamageChanged));
    t.after(() => {
        unsubscribe();
        resetDamageAndLossesState();
    });
    replaceDamageAndLossesData(damage);
    assert.deepEqual(getDamageAndLossesState().receivedDamage, damage.receivedDamage);
    replaceDamageAndLossesData({ ...damage, sourceFileName: "Outra cópia.xlsx" });
    assert.deepEqual(receivedDamageChanges, [true, false]);
    resetDamageAndLossesState();
    assert.equal(getDamageAndLossesState().receivedDamage, null);
    assert.deepEqual(receivedDamageChanges, [true, false, true]);
});

test("prioriza Histórico de Avarias Recebidas e aceita o nome anterior em arquivos antigos", () => {
    const workbook = createDamageAndLossesWorkbook();
    const current = "Histórico de Avarias Recebidas";
    const legacy = "Avarias Recebidas";
    workbook.Sheets[legacy] = workbook.Sheets[current];
    workbook.SheetNames.unshift(legacy);
    assert.equal(findDamageMonthSource(workbook).productSource.sheetName, current);

    workbook.SheetNames = workbook.SheetNames.filter(name => name !== current);
    assert.equal(findDamageMonthSource(workbook).productSource.sheetName, legacy);
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
