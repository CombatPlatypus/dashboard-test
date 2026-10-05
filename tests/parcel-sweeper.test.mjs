import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";

import {
    classifyParcelOperators,
    createParcelAgingDistribution,
    createParcelRow,
    createParcelSummary,
    filterParcelPackageRows,
    isParcelOperator,
} from "../js/reports/parcel-sweeper/model.js";

import {
    readParcelFile,
} from "../js/reports/parcel-sweeper/import.js";

function formatTimestamp(
    timestamp,
) {
    return new Date(
        timestamp,
    )
        .toISOString()
        .slice(
            0,
            19,
        )
        .replace(
            "T",
            " ",
        );
}

function createOperatorRows({
    operator,
    count,
    gapSeconds,
    startOffsetSeconds = 0,
}) {
    const start =
        Date.UTC(
            2026,
            9,
            2,
            14,
            0,
            startOffsetSeconds,
        );

    return Array.from(
        {
            length: count,
        },
        function (
            _,
            index,
        ) {
            return createParcelRow({
                trackingNumber:
                    `BR${operator.replace(/\D/g, "")}${index}`,
                scannedStatus:
                    "LMHub_Received",
                countType:
                    index % 5 === 0
                        ? "Exception"
                        : "Backlog",
                operator,
                agingTime: "5h",
                scannedTime:
                    formatTimestamp(
                        start +
                        index *
                            gapSeconds *
                            1000,
                    ),
            });
        },
    );
}

test("identifica o operador de volumosos pela combinação de baixo volume e cadência lenta", () => {
    const rows = [
        ...createOperatorRows({
            operator:
                "[Ops68017]LUCAS CAMPOS JUNQUEIRA",
            count: 100,
            gapSeconds: 2,
        }),
        ...createOperatorRows({
            operator:
                "[Ops251131]THAIANE NUNES DE OLIVEIRA",
            count: 90,
            gapSeconds: 2,
        }),
        ...createOperatorRows({
            operator:
                "[Ops202379]YAGO MARTINS PENUELA",
            count: 25,
            gapSeconds: 10,
        }),
        ...createOperatorRows({
            operator:
                "[Ops999999]OPERADOR DE APOIO",
            count: 25,
            gapSeconds: 2,
        }),
    ];

    const operators =
        classifyParcelOperators(
            rows,
        );

    assert.equal(
        operators.find(
            function (operator) {
                return operator.operator
                    .includes(
                        "YAGO",
                    );
            },
        ).packageKind,
        "bulky",
    );

    assert.equal(
        operators.find(
            function (operator) {
                return operator.operator
                    .includes(
                        "APOIO",
                    );
            },
        ).packageKind,
        "common",
    );

    assert.equal(
        operators.filter(
            function (operator) {
                return operator.packageKind ===
                    "bulky";
            },
        ).length,
        1,
    );
});

test("aceita somente operadores iniciados por [Ops] sem diferenciar maiúsculas", () => {
    assert.equal(
        isParcelOperator(
            "[ops68017]LUCAS",
        ),
        true,
    );

    assert.equal(
        isParcelOperator(
            " [Ops251131]THAIANE",
        ),
        true,
    );

    assert.equal(
        isParcelOperator(
            "operador@empresa.com",
        ),
        false,
    );
});

test("calcula cobertura e omite operadores fora do padrão apenas das análises por operador", () => {
    const rows = [
        createParcelRow({
            trackingNumber: "BR1",
            scannedStatus: "LMHub_Received",
            countType: "Backlog",
            operator: "[Ops1]ANA",
            scannedTime: "2026-10-02 14:00:00",
        }),
        createParcelRow({
            trackingNumber: "BR2",
            scannedStatus: "LMHub_Received",
            countType: "Exception",
            operator: "ana@empresa.com",
            scannedTime: "2026-10-02 14:00:01",
        }),
        createParcelRow({
            trackingNumber: "BR3",
            scannedStatus: "-",
            countType: "Missing",
            operator: "",
            scannedTime: "",
        }),
    ];

    const summary =
        createParcelSummary(
            rows,
        );

    assert.equal(
        summary.totalRows,
        3,
    );
    assert.equal(
        summary.scannedCount,
        2,
    );
    assert.equal(
        summary.unscannedCount,
        1,
    );
    assert.equal(
        summary.ignoredScannedCount,
        1,
    );
    assert.equal(
        summary.operatorStats.length,
        1,
    );
});

test("distribui aging nas sete faixas e exclui valores abaixo de uma hora", () => {
    const values = [
        "1h",
        "6h",
        "7h",
        "12h",
        "13h",
        "1d 0h",
        "1d 1h",
        "2d 0h",
        "2d 1h",
        "4d 0h",
        "4d 1h",
        "7d 0h",
        "7d 1h",
        "38min",
        "",
    ];

    const rows =
        values.map(
            function (
                agingTime,
                index,
            ) {
                return createParcelRow({
                    trackingNumber:
                        `BR${index}`,
                    scannedStatus:
                        "LMHub_Received",
                    countType:
                        "Backlog",
                    operator:
                        "[Ops1]ANA",
                    agingTime,
                    scannedTime:
                        formatTimestamp(
                            Date.UTC(
                                2026,
                                9,
                                2,
                                14,
                                0,
                                index,
                            ),
                        ),
                });
            },
        );

    assert.deepEqual(
        createParcelAgingDistribution(
            rows,
        ).map(
            function (bin) {
                return bin.count;
            },
        ),
        [
            2,
            2,
            2,
            2,
            2,
            2,
            1,
        ],
    );
});

test("os três filtros usam Count Type e Todos reúne Backlog e Exception", () => {
    const rows = [
        { countType: "Backlog" },
        { countType: "Exception" },
        { countType: "Missing" },
    ];

    assert.equal(
        filterParcelPackageRows(
            rows,
            "all",
        ).length,
        2,
    );

    assert.equal(
        filterParcelPackageRows(
            rows,
            "backlog",
        ).length,
        1,
    );

    assert.equal(
        filterParcelPackageRows(
            rows,
            "exception",
        ).length,
        1,
    );
});

test("importa o CSV exportado pelo Parcel Sweeper", async () => {
    const require =
        createRequire(
            import.meta.url,
        );

    const previousWindow =
        globalThis.window;

    globalThis.window = {
        XLSX:
            require(
                "../js/libraries/xlsx.full.min.js",
            ),
    };

    try {
        const csv = [
            "SPX Tracking Number,Scanned Status,Expedite Tag,Final Status,Sort Code,Next Step Action,OnHold Times,Count Type,Expected,Operator,Aging Time,Scanned Time",
            "BR1,LMHub_Received,-,LMHub_Received,SOC-SP8,Process for delivery,0,Backlog,Y,[Ops1]ANA,5h,2026-10-02 14:00:00",
            "BR2,-,-,SOC_LHTransported,SOC-SP8,-,0,Missing,Y,,,",
        ].join(
            "\n",
        );

        const file =
            new File(
                [
                    csv,
                ],
                "parcel-test.csv",
                {
                    type: "text/csv",
                },
            );

        const imported =
            await readParcelFile(
                file,
            );

        assert.equal(
            imported.rows.length,
            2,
        );

        assert.equal(
            createParcelSummary(
                imported.rows,
            ).scannedCount,
            1,
        );
    } finally {
        if (
            previousWindow ===
            undefined
        ) {
            delete globalThis.window;
        } else {
            globalThis.window =
                previousWindow;
        }
    }
});

test("o HTML e a inicialização ligam todos os pontos do relatório", () => {
    const html =
        readFileSync(
            new URL(
                "../index.html",
                import.meta.url,
            ),
            "utf8",
        );

    const init =
        readFileSync(
            new URL(
                "../js/reports/init.js",
                import.meta.url,
            ),
            "utf8",
        );

    [
        "parcelTotalScanned",
        "parcelBacklogTotal",
        "parcelExceptionTotal",
        "parcelUnscannedTotal",
        "parcelCoverageChart",
        "parcelAgingChart",
        "parcelOperatorDistributionBody",
        "parcelCommonPackagesBody",
        "parcelBulkyPackagesBody",
    ].forEach(
        function (id) {
            assert.equal(
                Array.from(
                    html.matchAll(
                        new RegExp(
                            `id=\"${id}\"`,
                            "g",
                        ),
                    ),
                ).length,
                1,
            );
        },
    );

    assert.match(
        html,
        /accept="\.csv,\.xlsx,\.xls"/,
    );

    assert.match(
        init,
        /reportManager\.register\(\s*parcelReport/,
    );

});
