import assert from "node:assert/strict";
import { test } from "node:test";

import {
    parsePlanningSpXPlainText,
} from "../js/reports/planning/import.js";

import {
    parseReceiptLinehaulSpXPlainText,
} from "../js/reports/receipt/linehaul-import.js";

import {
    selectSpXLinehaulRecords,
} from "../js/reports/core/spx-linehaul-rules.js";

const headings = [
    "Número do LH",
    "Station",
    "Indicador de Pontualidade",
    "CPT",
];

function createRecord(
    code,
    position,
    explicitWindow = false,
) {
    return [
        code,
        `20261010F0_${position}_0000_04:00_05:00_HUB_PM101`,
        `[${position}]FM Hub_SP_Origem_${position}`,
        "On-Time Arrival",
        ...(explicitWindow ? ["PM1"] : []),
        "Pedido Carregado",
        String(position * 100),
        "Pending",
        "VisualizarTransferência",
    ];
}

test(
    "Planejamento e Processamento recuperam a mesma janela pelo nome da viagem",
    function () {
        const text = [
            ...headings,
            ...createRecord(
                "LT0QAA02IM1N1",
                1,
                true,
            ),
            ...createRecord(
                "LT0QAA02IE871",
                2,
            ),
            ...createRecord(
                "LT0QAA02IE5M1",
                3,
            ),
            ...createRecord(
                "LT0QAA02IEVI1",
                4,
                true,
            ),
            ...createRecord(
                "LT0QAA02IAMB1",
                5,
                true,
            ),
        ].join("\n");

        const planningRecords =
            parsePlanningSpXPlainText(
                text,
            );

        const receiptRecords =
            parseReceiptLinehaulSpXPlainText(
                text,
            );

        assert.deepEqual(
            planningRecords.map(
                function (record) {
                    return record.window;
                },
            ),
            [
                "PM1",
                "PM1",
                "PM1",
                "PM1",
                "PM1",
            ],
        );

        assert.deepEqual(
            receiptRecords.map(
                function (record) {
                    return record.window;
                },
            ),
            planningRecords.map(
                function (record) {
                    return record.window;
                },
            ),
        );

        const planningSelection =
            selectSpXLinehaulRecords(
                planningRecords,
                "PM1",
            );

        const receiptSelection =
            selectSpXLinehaulRecords(
                receiptRecords,
                "PM1",
            );

        assert.deepEqual(
            planningSelection.records.map(
                function (record) {
                    return record.code;
                },
            ),
            receiptSelection.records.map(
                function (record) {
                    return record.code;
                },
            ),
        );

        assert.equal(
            planningSelection.records.length,
            5,
        );
    },
);
