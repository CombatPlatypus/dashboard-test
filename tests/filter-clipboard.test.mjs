import assert from "node:assert/strict";
import { test } from "node:test";

import {
    findBestClipboardSource,
    findCompatibleClipboardSource,
    normalizeText,
    parseClipboardHtmlRows,
    parseClipboardRows,
} from "../js/filter/clipboard-source.js";

const purpose = {
    filterColumn: "Order ID",
    columns: [
        "Order ID",
        "Status",
        "Current Station",
        "Data",
    ],
    requiredColumns: [
        "Order ID",
        "Status",
        "Current Station",
    ],
    columnAliases: {
        "Order ID": [
            "SPX TN (Número de rastreamento)",
        ],
        Status: [
            "Status do pedido",
        ],
        "Current Station": [
            "Station Atual",
        ],
    },
};

test("reconhece os cabeçalhos em português", () => {
    const rows = [[
        "SPX TN (Número de rastreamento)",
        "Station Atual",
        "Status do pedido",
    ]];

    const source =
        findCompatibleClipboardSource(
            rows,
            purpose,
        );

    assert.deepEqual(
        source.missingColumns,
        [],
    );
    assert.equal(
        source.headerIndexes.get(
            normalizeText("Order ID"),
        ),
        0,
    );
    assert.equal(
        source.headerIndexes.get(
            normalizeText("Current Station"),
        ),
        1,
    );
    assert.equal(
        source.headerIndexes.get(
            normalizeText("Status"),
        ),
        2,
    );
});

test("ignora espaços especiais e caracteres invisíveis nos cabeçalhos", () => {
    const rows = [[
        "SPX TN (Número de rastreamento)",
        "Station\u00a0\u200bAtual",
        "Status\n  do pedido",
    ]];

    const source =
        findCompatibleClipboardSource(
            rows,
            purpose,
        );

    assert.deepEqual(
        source.missingColumns,
        [],
    );
});

test("prioriza a tabela estruturada quando o texto da página separa os cabeçalhos", () => {
    const structuredRows = [
        [
            "SPX TN (Número de rastreamento)",
            "Station Atual",
            "Status do pedido",
        ],
        [
            "BR123",
            "SoC_SP_Santana",
            "SOC_LHTransported",
        ],
    ];

    const flatTextRows = [
        ["SPX TN (Número de rastreamento)"],
        ["BR123"],
        ["Station Atual"],
        ["SoC_SP_Santana"],
        ["Status do pedido"],
        ["SOC_LHTransported"],
    ];

    const source =
        findBestClipboardSource(
            [
                structuredRows,
                flatTextRows,
            ],
            purpose,
        );

    assert.deepEqual(
        source.missingColumns,
        [],
    );
    assert.equal(
        source.rows,
        structuredRows,
    );
});

test("extrai células de tabela do HTML copiado", () => {
    const tableRows = [{
        children: [
            {
                tagName: "TH",
                textContent:
                    "SPX TN (Número de rastreamento)",
            },
            {
                tagName: "TH",
                textContent:
                    "Station\u00a0Atual",
            },
            {
                tagName: "TH",
                textContent:
                    "Status do pedido",
            },
        ],
    }];

    class ClipboardDomParser {
        parseFromString() {
            return {
                querySelectorAll() {
                    return tableRows;
                },
            };
        }
    }

    assert.deepEqual(
        parseClipboardHtmlRows(
            "<table></table>",
            ClipboardDomParser,
        ),
        [[
            "SPX TN (Número de rastreamento)",
            "Station Atual",
            "Status do pedido",
        ]],
    );
});

test("mantém a leitura tabulada como fallback", () => {
    assert.deepEqual(
        parseClipboardRows(
            "Order ID\tStatus\r\nBR123\tTransported\r\n",
        ),
        [
            ["Order ID", "Status"],
            ["BR123", "Transported"],
        ],
    );
});
