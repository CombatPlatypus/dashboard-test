import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { beforeEach, test } from "node:test";

import {
    findLossesRateWorkbookHistory,
} from "../js/reports/losses-rate/workbook.js";
import {
    canExportLossesRateReport,
} from "../js/reports/losses-rate/export.js";

const require = createRequire(import.meta.url);
const XLSX = require("../js/libraries/xlsx.full.min.js");

function createLossesRateWorkbook(
    identification,
) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
        [identification],
        [
            "Possíveis Perdas",
            "Lost",
            "Avaria",
            "Volume Movimentado",
            "Taxa",
            "Mês",
        ],
        [
            111,
            26,
            60,
            356741,
            0.000241071,
            "Outubro",
        ],
    ]);

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Taxa de Perdas",
    );

    return workbook;
}

beforeEach(() => {
    globalThis.window = { XLSX };
});

test("ignora a identificação da planilha", () => {
    const result =
        findLossesRateWorkbookHistory(
            createLossesRateWorkbook(
                "LM HUB SP Santos Praia Grande 02 / LSP-63 - SPM07",
            ),
        );

    assert.equal(
        Object.hasOwn(
            result,
            "identification",
        ),
        false,
    );
    assert.equal(result.importedRows, 1);
    assert.deepEqual(
        result.history[9],
        {
            possibleLosses: 111,
            lost: 26,
            damage: 60,
            moved: 356741,
        },
    );
});

test("aceita qualquer conteúdo no campo ignorado", () => {
    const result =
        findLossesRateWorkbookHistory(
            createLossesRateWorkbook(
                "Texto livre sem identificação estruturada",
            ),
        );

    assert.equal(result.importedRows, 1);
});

test("libera a exportação sem identificação", () => {
    assert.equal(
        canExportLossesRateReport({
            activeMonth: 0,
            months: [
                {
                    possibleLosses: 0,
                    lost: 26,
                    damage: 60,
                    moved: 356741,
                },
            ],
        }),
        true,
    );
});
