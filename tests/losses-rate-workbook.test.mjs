import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { beforeEach, test } from "node:test";

import {
    findLossesRateWorkbookHistory,
} from "../js/reports/losses-rate/workbook.js";

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

test("lê a identificação consolidada da nova estrutura", () => {
    const result =
        findLossesRateWorkbookHistory(
            createLossesRateWorkbook(
                "LM HUB SP Santos Praia Grande 02 / LSP-63 - SPM07",
            ),
        );

    assert.deepEqual(
        result.identification,
        {
            description:
                "LM HUB SP Santos Praia Grande 02",
            hubCode: "LSP-63",
            subRegional: "SPM07",
        },
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

test("rejeita a identificação fora do formato da nova estrutura", () => {
    assert.throws(
        function () {
            findLossesRateWorkbookHistory(
                createLossesRateWorkbook(
                    "LM HUB SP Santos Praia Grande 02",
                ),
            );
        },
        /A célula A1.*Descrição \/ Código do Hub - Sub Regional/,
    );
});
