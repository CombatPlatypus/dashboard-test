import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { beforeEach, test } from "node:test";
import { createDamageAndLossesWorkbook } from "./fixtures/damage-and-losses-workbook.mjs";
import { readDamageAndLossesFile } from "../js/reports/damage-and-losses/import.js";
import {
    exportDamageAndLossesSession, importDamageAndLossesData, importDamageAndLossesSession,
    resetDamageAndLossesController,
} from "../js/reports/damage-and-losses/controller.js";
import { getDamageAndLossesState } from "../js/reports/damage-and-losses/state.js";
import { getLossesState } from "../js/reports/damage-and-losses/losses-state.js";
import { getConsolidatedSummary } from "../js/reports/damage-and-losses/consolidated-model.js";
import { createHistoryClipboardText, getMonthlyOccurrenceHistory, normalizeOccurrenceHistory } from "../js/reports/damage-and-losses/history.js";
import { createConsolidatedCompositionChart } from "../js/reports/damage-and-losses/consolidated-charts.js";
import { getLossesRateState, replaceLossesRateHistory, resetLossesRateReport } from "../js/reports/losses-rate/state.js";

const require = createRequire(import.meta.url);
const XLSX = require("../js/libraries/xlsx.full.min.js");
const referenceDate = new Date(2026, 9, 21, 12);

beforeEach(() => {
    globalThis.window = { XLSX };
    resetDamageAndLossesController();
    resetLossesRateReport();
});

async function importWorkbook(workbook = createDamageAndLossesWorkbook()) {
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    return readDamageAndLossesFile({ name: "teste.xlsx", arrayBuffer: async () => bytes }, referenceDate);
}

test("preserva todos os meses no estado, inclusive avarias sem estação, para filtrar a exibição", async () => {
    const workbook = createDamageAndLossesWorkbook();
    const sheet = workbook.Sheets["Histórico de Avarias e Perdas"];
    XLSX.utils.sheet_add_aoa(sheet, [
        ["W01", new Date(2026, 0, 1, 12), "ANTIGO", "Não Recebido", "", "", "", "", "", "", "W01", new Date(2026, 0, 2, 12), "PERDA-ANTIGA", "Lost"],
        ["W43", new Date(2026, 9, 21, 12), "SEM-ESTACAO", "Sem Dados"],
        ["W43", "data inválida", "IGNORAR", "Recebido"],
    ], { origin: "A7" });
    const result = await importWorkbook(workbook);
    assert.equal(result.damage.importedRows, 3);
    assert.equal(result.losses.importedRows, 4);
    importDamageAndLossesData(result);
    const damageHistory = getDamageAndLossesState().history;
    const lossesHistory = getLossesState().history;
    assert.deepEqual(damageHistory.map(row => row.packageCode), ["SEM-ESTACAO", "AV3", "AV2", "AV1", "ANTIGO"]);
    assert.equal(damageHistory.at(-1).situation, "Não Recebido");
    assert.equal(lossesHistory.length, 5);
    assert.deepEqual(lossesHistory.at(-1), { date: "2026-01-02", packageCode: "PERDA-ANTIGA", situation: "Lost" });
});

test("histórico mensal prioriza o mês atual e mantém data decrescente sem alterar a origem", () => {
    const records = Object.freeze([
        { date: "2026-09-30", packageCode: "BR-ANTERIOR" },
        { date: "2026-10-01", packageCode: "BR-PRIMEIRO" },
        { date: "2026-11-01", packageCode: "BR-FUTURO" },
        { date: "2026-10-21", packageCode: "BR-ULTIMO" },
    ].map(Object.freeze));
    assert.deepEqual(getMonthlyOccurrenceHistory(records, referenceDate).map(row => row.packageCode),
        ["BR-ULTIMO", "BR-PRIMEIRO"]);
    assert.equal(records[0].packageCode, "BR-ANTERIOR");
    assert.equal(records.length, 4);
});

test("histórico mensal considera só datas reais e BR preenchido antes de decidir o mês anterior", () => {
    const records = [
        { date: "2026-10-32", packageCode: "BR-DATA-INVALIDA" },
        { date: "2026-10-20", packageCode: "  " },
        { date: "2026-10-15" },
        { date: "2026-09-30", packageCode: "BR-VALIDO", situation: "Não Recebido" },
        { date: "2026-08-31", packageCode: "BR-ANTIGO" },
    ];
    assert.deepEqual(getMonthlyOccurrenceHistory(records, referenceDate), [
        { date: "2026-09-30", packageCode: "BR-VALIDO", situation: "Não Recebido" },
    ]);
    assert.deepEqual(getMonthlyOccurrenceHistory(records.slice(0, 3), referenceDate), []);
    assert.deepEqual(getMonthlyOccurrenceHistory([records.at(-1)], referenceDate), []);
    assert.deepEqual(getMonthlyOccurrenceHistory(null, referenceDate), []);
});

test("histórico mensal trata dezembro do ano anterior e ignora o mesmo mês de outro ano", () => {
    const records = [
        { date: "2025-12-31", packageCode: "BR-DEZEMBRO" },
        { date: "2025-01-10", packageCode: "BR-OUTRO-ANO" },
    ];
    assert.equal(getMonthlyOccurrenceHistory(records, new Date(2026, 0, 31, 12))[0].packageCode, "BR-DEZEMBRO");
    assert.deepEqual(getMonthlyOccurrenceHistory([records[1]], new Date(2026, 0, 1, 12)), []);
    assert.deepEqual(getMonthlyOccurrenceHistory([
        { date: "2026-02-29", packageCode: "BR-DATA-INVALIDA" },
        { date: "2026-01-31", packageCode: "BR-JANEIRO" },
    ], new Date(2026, 1, 1, 12)).map(row => row.packageCode), ["BR-JANEIRO"]);
});

test("salva, restaura e limpa os históricos sem perder os totais nem alterar os snapshots", async () => {
    importDamageAndLossesData(await importWorkbook());
    const session = exportDamageAndLossesSession();
    const snapshot = getDamageAndLossesState();
    snapshot.history[0].packageCode = "ALTERADO";
    assert.equal(getDamageAndLossesState().history[0].packageCode, "AV3");
    resetDamageAndLossesController();
    assert.deepEqual(getDamageAndLossesState().history, []);
    assert.deepEqual(getLossesState().history, []);
    importDamageAndLossesSession(JSON.parse(JSON.stringify(session)));
    assert.deepEqual(exportDamageAndLossesSession(), session);
    delete session.history;
    delete session.losses.history;
    importDamageAndLossesSession(session);
    assert.deepEqual(getDamageAndLossesState().history, []);
    assert.deepEqual(getLossesState().history, []);
    assert.equal(getConsolidatedSummary(undefined, undefined, undefined, referenceDate).hub, 2);
});

test("rosca usa avarias do Hub e exclui SOC e retornados; taxa usa o mês correspondente", async () => {
    const result = await importWorkbook();
    importDamageAndLossesData(result);
    const rateState = { year: 2026, activeMonth: 0, months: result.lossesRate.history };
    const summary = getConsolidatedSummary(getDamageAndLossesState(), getLossesState(), rateState, referenceDate);
    assert.equal(summary.hub, 2);
    assert.equal(summary.soc, 1);
    assert.deepEqual(summary.composition, [1, 3, 2]);
    assert.equal(summary.total, 6);
    assert.equal(summary.lossRate, 86 / 356741);
    assert.equal(getConsolidatedSummary(getDamageAndLossesState(), getLossesState(), { ...rateState, year: 2025 }, referenceDate).lossRate, null);
    resetDamageAndLossesController();
    assert.equal(getConsolidatedSummary(undefined, undefined, rateState).lossRate, null);
    assert.deepEqual(getConsolidatedSummary().composition, [0, 0, 0]);
});

test("cards e rosca usam o mês anterior quando não há registros atuais, sem misturar períodos", async () => {
    importDamageAndLossesData(await importWorkbook());
    const summary = getConsolidatedSummary(undefined, undefined, undefined, new Date(2026, 10, 1, 12));
    assert.equal(summary.hasDamageData, true);
    assert.equal(summary.hasLossesData, true);
    assert.deepEqual([summary.hub, summary.soc, summary.underReview, summary.confirmedLosses], [2, 1, 1, 3]);
    assert.deepEqual(summary.composition, [1, 3, 2]);
    assert.equal(summary.total, 6);
    assert.equal(summary.monthIndex, 9);
    assert.equal(summary.fallbackUsed, true);
    assert.equal(summary.lossRate, null);
    assert.equal(getDamageAndLossesState().history.length, 3);
    assert.equal(getLossesState().history.length, 4);
    const mixed = getConsolidatedSummary(undefined, {
        ...getLossesState(), days: [{ date: "2026-11-01", underReview: 4 }],
    }, undefined, new Date(2026, 10, 1, 12));
    assert.deepEqual(mixed.composition, [4, 0, 0]);
    assert.equal(mixed.fallbackUsed, false);
    const stale = getConsolidatedSummary(undefined, undefined, undefined, new Date(2026, 11, 1, 12));
    assert.deepEqual(stale.composition, [0, 0, 0]);
});

test("cópia inclui cabeçalho e todos os registros, preservando datas e códigos como texto", () => {
    const records = normalizeOccurrenceHistory([
        { date: "2026-10-20", packageCode: "001234X", situation: "Não Recebido" },
        { date: "2026-10-21", packageCode: "BR2", situation: "Em\nAnálise" },
        { date: "2026-02-30", packageCode: "INVÁLIDO" },
        { date: "2026-10-21", packageCode: "" },
    ]);
    assert.equal(createHistoryClipboardText(records),
        "Data\tCódigo BR\tSituação\n21/10/2026\tBR2\tEm Análise\n20/10/2026\t001234X\tNão Recebido");
});

test("o mês anterior pode ser dezembro do ano anterior, inclusive para a taxa de perdas", () => {
    const months = Array.from({ length: 12 }, () => ({}));
    months[11] = { moved: 1000, lost: 2, damage: 5 };
    replaceLossesRateHistory(months, { year: 2025 });
    assert.equal(getLossesRateState().year, 2025);
    const summary = getConsolidatedSummary(
        { ...getDamageAndLossesState(), days: [{ date: "2025-12-31", hub: 5, soc: 2 }] },
        { ...getLossesState(), days: [{ date: "2025-12-30", underReview: 3, confirmedLosses: 2 }] },
        getLossesRateState(), new Date(2026, 0, 1, 12),
    );
    assert.equal(summary.monthIndex, 11);
    assert.equal(summary.year, 2025);
    assert.equal(summary.fallbackUsed, true);
    assert.equal(summary.lossRate, 0.007);
    assert.deepEqual(summary.composition, [3, 2, 5]);
});

test("a rosca consolidada usa o mesmo renderizador 3D do dashboard", () => {
    window.Chart = class { constructor(canvas, config) { return config; } };
    const chart = createConsolidatedCompositionChart({});
    assert.deepEqual(chart.data.labels, ["Em Análise", "Lost", "Avarias"]);
    assert.deepEqual(chart.data.datasets[0].backgroundColor, ["#2538a5", "#8B0000", "#f99400"]);
    assert.equal(chart.plugins[0].id, "consolidated-composition-3d");
    assert.equal(chart.options.animation, false);
});
