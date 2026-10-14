import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, test } from "node:test";

import {
    createReverseImportRecord,
    readReverseFile,
} from "../js/reports/reverse/import.js";

import {
    createReverseSummary,
} from "../js/reports/reverse/model.js";

import {
    getReverseState,
    resetReverseReport,
    upsertReverseTransfer,
} from "../js/reports/reverse/state.js";

afterEach(() => {
    resetReverseReport();
});

function createRows({
    to = "TO202610065X5E2",
    packages = [
        ["BR1", "Return"],
        ["BR2", "Return"],
        ["BR3", "Missorted"],
    ],
} = {}) {
    const rows = [
        ["", "Total Scanned Orders", "Total Actual Orders"],
        ["TO Number", to],
        ["Total Orders", packages.length, packages.length],
        ["Total Weight", "10.000"],
        ["Sender", "LM Hub"],
        ["Receiver", "SoC de destino"],
        ["Receiver Type", "Station"],
        ["TO Created Time", "06-10-2026 00:20"],
        ["TO Complete Time", "07-10-2026 06:44"],
    ];

    while (rows.length < 23) rows.push([]);

    rows.push([
        "No",
        "SPX Tracking Number",
        "Assisted Sorting Task ID",
        "3PL Tracking Number",
        "District",
        "Scan Time",
        "Weight(kg)",
        "Journey Type",
        "Remark",
    ]);

    packages.forEach(([trackingNumber, type], index) => {
        rows.push([
            index + 1,
            trackingNumber,
            "",
            "",
            "Praia Grande",
            "07-10-2026 01:30",
            "1.000",
            type,
            "",
        ]);
    });

    return rows;
}

test("lê a TO em B2 e classifica pacotes únicos pelo tipo escolhido, ignorando Journey Type", () => {
    const rows = createRows({
        packages: [
            ["BR1", "Return"],
            ["BR2", "Return"],
            ["BR3", "Missorted"],
            ["BR4", "Liquidate"],
            ["BR5", "Confiscado"],
            ["BR5", "Confiscado"],
        ],
    });

    const transfer =
        createReverseImportRecord(
            rows,
            {
                sourceFileName:
                    "transport-list.xlsx",
                reverseType: "missorted",
            },
        );

    assert.equal(transfer.to, "TO202610065X5E2");
    assert.equal(transfer.destination, "SoC de destino");
    assert.equal(transfer.quantity, 5);
    assert.deepEqual(transfer.quantities, {
        return: 0,
        missorted: 5,
        liquidate: 0,
        confiscated: 0,
    });
});

test("arquivo XLSX do SPX é lido de ponta a ponta", async () => {
    const require = createRequire(import.meta.url);
    const XLSX = require(
        "../js/libraries/xlsx.full.min.js",
    );
    const workbook =
        XLSX.utils.book_new();
    const worksheet =
        XLSX.utils.aoa_to_sheet(
            createRows(),
        );

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Transport List",
    );

    const bytes =
        XLSX.write(
            workbook,
            {
                type: "array",
                bookType: "xlsx",
            },
        );

    const previousWindow =
        globalThis.window;

    globalThis.window = {
        XLSX,
    };

    try {
        const transfer =
            await readReverseFile(
                new File(
                    [bytes],
                    "transport-list.xlsx",
                ),
                { reverseType: "liquidate" },
            );

        assert.equal(
            transfer.to,
            "TO202610065X5E2",
        );
        assert.equal(transfer.quantity, 3);
        assert.equal(transfer.quantities.liquidate, 3);
    } finally {
        if (previousWindow === undefined) {
            delete globalThis.window;
        } else {
            globalThis.window =
                previousWindow;
        }
    }
});

test("uma TO nova é adicionada e a mesma TO é atualizada sem duplicar totais", () => {
    const first =
        createReverseImportRecord(
            createRows(),
            { reverseType: "return" },
        );

    const second =
        createReverseImportRecord(
            createRows({
                to: "TO202610076ABC1",
                packages: [
                    ["BR10", "Liquidate"],
                    ["BR11", "Liquidate"],
                ],
            }),
            { reverseType: "liquidate" },
        );

    assert.equal(
        upsertReverseTransfer(first)
            .status,
        "added",
    );
    assert.equal(
        upsertReverseTransfer(second)
            .status,
        "added",
    );

    let summary =
        createReverseSummary(
            getReverseState()
                .transfers,
        );

    assert.equal(summary.transfers.length, 2);
    assert.equal(summary.total, 5);
    assert.deepEqual(summary.quantities, {
        return: 3,
        missorted: 0,
        liquidate: 2,
        confiscated: 0,
    });

    const updatedFirst =
        createReverseImportRecord(
            createRows({
                packages: [
                    ["BR20", "Return"],
                    ["BR21", "Confiscado"],
                    ["BR22", "Confiscado"],
                ],
            }),
            { reverseType: "confiscated" },
        );

    assert.equal(
        upsertReverseTransfer(
            updatedFirst,
        ).status,
        "updated",
    );

    summary =
        createReverseSummary(
            getReverseState()
                .transfers,
        );

    assert.equal(summary.transfers.length, 2);
    assert.equal(summary.total, 5);
    assert.deepEqual(summary.quantities, {
        return: 0,
        missorted: 0,
        liquidate: 2,
        confiscated: 3,
    });
});

test("os quatro tipos aceitam Forward, tipos desconhecidos e coluna Journey Type ausente", () => {
    for (const reverseType of ["return", "missorted", "liquidate", "confiscated"]) {
        const rows = createRows({ packages: [["BR1", "Forward"], ["BR2", ""], ["BR3", "Unknown"]] });
        rows[23][7] = "";
        const transfer = createReverseImportRecord(rows, { reverseType });
        assert.equal(transfer.quantity, 3);
        assert.equal(transfer.quantities[reverseType], 3);
        assert.equal(Object.values(transfer.quantities).filter(value => value > 0).length, 1);
    }
});

test("exige tipo válido antes de ler ou analisar o arquivo", async () => {
    for (const reverseType of [undefined, "", "Forward", "intercept", "invalid"]) {
        assert.throws(() => createReverseImportRecord(createRows(), { reverseType }), /Escolha o tipo/);
        let reads = 0;
        await assert.rejects(readReverseFile({
            name: "transport.xlsx", size: 1,
            arrayBuffer() { reads++; throw new Error("Não deve ler"); },
        }, { reverseType }), /Escolha o tipo/);
        assert.equal(reads, 0);
    }
});
