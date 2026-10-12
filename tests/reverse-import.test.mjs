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

test("lê a TO em B2 e soma os pacotes nas categorias da reversa", () => {
    const rows = createRows({
        packages: [
            ["BR1", "Return"],
            ["BR2", "Return"],
            ["BR3", "Missorted"],
            ["BR4", "Liquidate"],
            ["BR5", "Intercept"],
            ["BR5", "Intercept"],
        ],
    });

    const transfer =
        createReverseImportRecord(
            rows,
            {
                sourceFileName:
                    "transport-list.xlsx",
            },
        );

    assert.equal(transfer.to, "TO202610065X5E2");
    assert.equal(transfer.destination, "SoC de destino");
    assert.equal(transfer.quantity, 5);
    assert.deepEqual(transfer.quantities, {
        return: 2,
        missorted: 1,
        liquidate: 1,
        confiscated: 1,
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
            );

        assert.equal(
            transfer.to,
            "TO202610065X5E2",
        );
        assert.equal(transfer.quantity, 3);
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
        return: 2,
        missorted: 1,
        liquidate: 2,
        confiscated: 0,
    });

    const updatedFirst =
        createReverseImportRecord(
            createRows({
                packages: [
                    ["BR20", "Return"],
                    ["BR21", "Intercept"],
                    ["BR22", "Intercept"],
                ],
            }),
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
        return: 1,
        missorted: 0,
        liquidate: 2,
        confiscated: 2,
    });
});
