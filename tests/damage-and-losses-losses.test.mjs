import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeEach, test } from "node:test";

import {
    createLossesMonthData,
    findLossesMonthSource,
} from "../js/reports/damage-and-losses/import.js";
import {
    getLossesSummary,
    replaceLossesData,
    resetLossesState,
} from "../js/reports/damage-and-losses/losses-state.js";

const require = createRequire(import.meta.url);
const XLSX = require("../js/libraries/xlsx.full.min.js");

function createLossesWorkbook(
    returnedSheetName = "Históricos de Retornados",
) {
    const workbook = XLSX.utils.book_new();
    const history = XLSX.utils.aoa_to_sheet([
        ["Data", "Código BR", "Situação"],
        [new Date(2026, 9, 1, 12), "BR1", "Lost"],
        [new Date(2026, 9, 2, 12), "BR2", "Em Análise"],
        [new Date(2026, 9, 3, 12), "BR3", "Lost"],
        [new Date(2026, 9, 3, 12), "BR4", "Lost"],
    ]);
    const base = XLSX.utils.aoa_to_sheet([
        [
            "Data",
            "Código BR",
            "Situação",
            "Rota",
            "AT",
            "ID do Motorista",
            "Motorista",
            "Produto",
            "Pack Recovery",
        ],
        [new Date(2026, 9, 1, 12), "BR1", "Lost", "", "", "", "", "", "Feito"],
        [new Date(2026, 9, 2, 12), "BR2", "Em Análise", "", "", "", "", "", "Não Feito"],
        [new Date(2026, 9, 3, 12), "BR3", "Lost", "", "", "", "", "", "ID Inválido"],
        [new Date(2026, 9, 3, 12), "BR4", "Lost", "", "", "", "", "", "-"],
    ]);
    const returned = XLSX.utils.aoa_to_sheet([
        ["Semana", "Devolução", "Expedição", "Código BR"],
        ["W40", new Date(2026, 9, 2, 12), new Date(2026, 9, 1, 12), "RET1"],
        ["W40", new Date(2026, 9, 3, 12), new Date(2026, 9, 2, 12), "RET2"],
    ]);

    XLSX.utils.book_append_sheet(
        workbook,
        history,
        "Histórico de Análises",
    );
    XLSX.utils.book_append_sheet(
        workbook,
        base,
        "Base de Análises",
    );
    XLSX.utils.book_append_sheet(
        workbook,
        returned,
        returnedSheetName,
    );

    return workbook;
}

beforeEach(() => {
    globalThis.window = { XLSX };
    resetLossesState();
});

test("importa as quatro opções atuais do Pack Recovery e os pacotes retornados", () => {
    const source =
        findLossesMonthSource(
            createLossesWorkbook(),
        );
    const imported =
        createLossesMonthData(
            source,
            new Date(2026, 9, 3, 12),
        );

    replaceLossesData(imported);

    const summary = getLossesSummary();
    assert.equal(summary.confirmedLosses, 3);
    assert.equal(summary.underReview, 1);
    assert.equal(summary.returnedPackages, 2);
    assert.equal(summary.recoveryDone, 1);
    assert.equal(summary.recoveryNotDone, 1);
    assert.equal(summary.recoveryInvalidId, 1);
    assert.equal(summary.recoveryUninformed, 1);
    assert.equal(summary.packRecoveryTotal, 4);
    assert.equal(
        summary.traditionalAnalysis.totalMonth
            .returnedPackages,
        2,
    );
});

test("aceita o nome singular informado para a aba de retornados", () => {
    const source =
        findLossesMonthSource(
            createLossesWorkbook(
                "Histórico de Retornados",
            ),
        );

    assert.equal(
        source.returnedSource.sheetName,
        "Histórico de Retornados",
    );
});

test("o HTML liga o novo gráfico e a linha de retornados ao estado", () => {
    const html = readFileSync(
        new URL("../index.html", import.meta.url),
        "utf8",
    );
    const lossesView = readFileSync(
        new URL(
            "../js/reports/damage-and-losses/losses-view.js",
            import.meta.url,
        ),
        "utf8",
    );

    assert.equal(
        Array.from(
            html.matchAll(
                /id="lossesReturnedComparisonChart"/g,
            ),
        ).length,
        1,
    );
    assert.match(
        html,
        /data-losses-analysis-field="returnedPackages"/,
    );
    assert.doesNotMatch(
        html + lossesView,
        /savedAwaitingTicket|emptyAwaitingTicket|Aguardando Ticket/,
    );
});
