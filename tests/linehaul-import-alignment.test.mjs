import assert from "node:assert/strict";
import { test } from "node:test";

import {
    parsePlanningSpXPlainText,
    selectPlanningSpXLhs,
} from "../js/reports/planning/import.js";

import {
    parseReceiptLinehaulSpXPlainText,
} from "../js/reports/receipt/linehaul-import.js";

import {
    createSpXLinehaulWindowCandidates,
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

const referenceDate = new Date("2026-11-16T15:00:00-03:00");
const record = (index, window, scheduledDate, waiting = true) => ({
    code: `LT${String(index).padStart(8, "0")}`, window, scheduledDate, waiting,
});

test("escolhe o primeiro bloco com STA/STD elegível de cada CPT em uma importação só com Waiting", () => {
    const records = [
        record(1, "AM", "11-17"), record(2, "AM", "11-19"),
        record(3, "PM1", "11-16"),
        record(4, "AM", "11-17"), record(5, "AM", "11-18"),
        record(6, "PM2", "11-16"), record(7, "PM2", "11-18"),
        record(8, "AM", "11-16"), record(9, "AM", "11-16"),
    ];

    const candidates = createSpXLinehaulWindowCandidates(records, referenceDate);
    assert.deepEqual(candidates.map(({ window, selection }) => [window, selection.records.map(row => row.code)]), [
        ["AM", [records[3].code, records[4].code]],
        ["PM1", [records[2].code]],
        ["PM2", [records[5].code, records[6].code]],
    ]);
    assert.equal(candidates[0].selection.skippedScheduleGroups, 1);
});

test("um LH isolado com data elegível pode ser o primeiro bloco, independentemente do indicador", () => {
    for (const waiting of [true, false]) {
        const isolated = record(1, "AM", "2026-11-16", waiting);
        const records = [
            isolated, record(2, "PM2", "11-16"),
            record(3, "AM", "11-17"), record(4, "AM", "11-17"),
        ];
        assert.deepEqual(selectSpXLinehaulRecords(records, "AM", referenceDate).records, [isolated]);
        assert.deepEqual(selectPlanningSpXLhs(records, "AM", referenceDate).lhs.map(lh => lh.code), [isolated.code]);
    }
});

test("compara dias em São Paulo e inclui o segundo dia na virada de ano", () => {
    const midnightUTC = new Date("2027-01-01T02:30:00Z");
    for (const date of ["12-31", "01-01", "2027-01-02"]) {
        const lh = record(1, "AM", date);
        assert.deepEqual(selectSpXLinehaulRecords([lh], "AM", midnightUTC).records, [lh]);
    }
    for (const date of [null, "12-30", "01-03", "2026-01-01", "02-30"]) {
        const lh = record(1, "AM", date, false);
        assert.equal(selectSpXLinehaulRecords([lh], "AM", midnightUTC).records.length, 0);
    }
});

test("blocos mistos continuam usando os pares consecutivos e grupos Waiting exigem data em todos os LHs", () => {
    const waiting = record(1, "AM", "11-16");
    const missingDate = record(2, "AM", null);
    const mixed = { ...missingDate, waiting: false };
    const noCpt = record(3, "", "11-16", false);
    assert.equal(selectSpXLinehaulRecords([waiting, missingDate], "AM", referenceDate).records.length, 0);
    assert.deepEqual(selectSpXLinehaulRecords([waiting, mixed, noCpt], "AM", referenceDate).records,
        [waiting, mixed, noCpt]);
    assert.equal(selectSpXLinehaulRecords([waiting, noCpt, mixed], "AM", referenceDate).records.length, 0);
});

test("ambos os importadores leem STA/STD de células multilinha e da ordem das colunas do SPX", () => {
    const rows = [
        ["Número do LH", "Station", "Indicador de Pontualidade", "Veículo", "STA\nSTD", "ATA", "CPT"],
        ["LT00000001", "[1]FM Hub SP Origem", "Waiting\n-", "TRUCK", "16-1102:30", "15-11 20:00", "AM"],
        ["LT00000002", "[2]FM Hub SP Origem", "Early Arrival", "TRUCK", "", "16-11 19:00", "PM2"],
        ["LT00000003", "[3]FM Hub SP Origem", "Waiting\n-", "TRUCK", "18/11/2026\n20:00", "", "AM"],
    ];
    const quote = value => value.includes("\n") ? `"${value}"` : value;
    const tsv = rows.map(row => row.map(quote).join("\t")).join("\n");
    const linear = rows.map(row => row.join("\n")).join("\n");
    const parsers = [parsePlanningSpXPlainText, parseReceiptLinehaulSpXPlainText];
    for (const source of [tsv, linear]) {
        for (const parse of parsers) {
            const parsed = parse(source);
            assert.deepEqual(parsed.map(lh => [lh.window, lh.waiting, lh.scheduledDate]), [
                ["AM", true, "11-16"], ["PM2", false, null], ["AM", true, "2026-11-18"],
            ]);
            assert.deepEqual(createSpXLinehaulWindowCandidates(parsed, referenceDate)
                .map(({ selection }) => selection.records.map(lh => lh.code)), [["LT00000001"], []]);
        }
    }
});
