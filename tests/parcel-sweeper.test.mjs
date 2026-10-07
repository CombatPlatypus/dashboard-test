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
    formatParcelOperatorName,
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

test("exibe código Ops e somente o primeiro nome com inicial maiúscula", () => {
    const examples = [
        ["[Ops68017]LUCAS CAMPOS JUNQUEIRA", "[Ops68017] Lucas"],
        ["  [ops0012]  mARIA   EDUARDA SANTOS  ", "[Ops0012] Maria"],
        ["[Ops26438]JÕAO PEDRO PEREIRA BARROS", "[Ops26438] Jõao"],
        ["[OPS3]ÁLVARO ÉRICO SILVA", "[Ops3] Álvaro"],
        ["[Ops85572]LETICIA OLIVEIRA", "[Ops85572] Leticia"],
        ["[Ops4]ANA", "[Ops4] Ana"],
        ["[Ops5]", "[Ops5]"],
        ["operador@empresa.com", "operador@empresa.com"],
        [null, ""],
    ];

    for (const [original, formatted] of examples) {
        assert.equal(formatParcelOperatorName(original), formatted);
    }
});

test("abreviar nomes não altera os dados originais nem une operadores distintos", () => {
    const names = [
        "[Ops10]LUCAS CAMPOS JUNQUEIRA",
        "[Ops20]LUCAS CAMPOS SILVA",
    ];
    const rows = names.map((operator, index) => createParcelRow({
        trackingNumber: `BR${index}`,
        scannedStatus: "LMHub_Received",
        operator,
        countType: "Backlog",
        scannedTime: "2026-10-02 14:00:00",
    }));

    const summary = createParcelSummary(rows);
    assert.equal(summary.operatorStats.length, 2);
    assert.deepEqual(rows.map(row => row.operator), names);
    assert.deepEqual(summary.operatorStats.map(stat =>
        formatParcelOperatorName(stat.operator),
    ), ["[Ops10] Lucas", "[Ops20] Lucas"]);
    assert.ok(summary.operatorStats.every(stat => stat.count === 1));
});

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

// Os histogramas preservam volume e cadência, sem nomes reais ou códigos BR.
const cadenceSamples = JSON.parse(readFileSync(
    new URL("./fixtures/parcel-sweeper-cadence.json", import.meta.url),
    "utf8",
));

function createRowsFromGapHistogram(profile, operator) {
    const gaps = Object.entries(profile.gapHistogram).flatMap(
        ([gap, count]) => Array(count).fill(Number(gap)),
    );

    assert.equal(gaps.length + 1, profile.count);

    let timestamp = Date.UTC(2026, 9, 2, 14);

    return createOperatorRows({
        operator,
        count: profile.count,
        gapSeconds: 0,
    }).map((row, index) => {
        if (index > 0) {
            timestamp += gaps[index - 1] * 1000;
        }

        return createParcelRow({
            ...row,
            scannedTime: formatTimestamp(timestamp),
        });
    });
}

for (const sample of cadenceSamples) {
    test(`reproduz cadência e previsões da amostra ${sample.source} sem depender dos nomes`, () => {
        const profiles = sample.operators.map((profile, index) => ({
            ...profile,
            operator: `[Ops${index + 100}]OPERADOR ${index + 1}`,
        }));

        // O arquivo pode trazer as linhas em ordem cronológica inversa.
        const rows = profiles.flatMap(profile =>
            createRowsFromGapHistogram(profile, profile.operator),
        ).reverse();
        const summary = createParcelSummary(rows);

        for (const profile of profiles) {
            const operator = summary.operatorStats.find(stat =>
                stat.operator === profile.operator,
            );

            assert.equal(operator.count, profile.count);
            assert.equal(operator.timedScanCount, profile.count);
            // Rótulo físico e previsão são distintos nos casos incertos
            // ou com poucos horários; não tratamos esses casos como acertos.
            assert.equal(operator.packageKind, profile.expectedPackageKind ?? profile.packageKind);
            assert.equal(operator.medianGapSeconds, profile.medianGapSeconds);
            assert.equal(operator.p75GapSeconds, profile.p75GapSeconds);
            if (typeof profile.hasSufficientTimingEvidence === "boolean") {
                assert.equal(operator.classification.hasSufficientTimingEvidence,
                    profile.hasSufficientTimingEvidence);
            }
        }

        assert.equal(summary.commonRows.length, sample.commonCount);
        assert.equal(summary.bulkyRows.length, sample.bulkyCount);
    });
}

test("não classifica volumosos com poucos horários válidos, baixo volume rápido ou uma pausa isolada", () => {
    const insufficientTimes = createOperatorRows({
        operator: "[Ops3]POUCOS HORARIOS",
        count: 25,
        gapSeconds: 10,
    }).map((row, index) => createParcelRow({
        ...row,
        scannedTime: index < 2 ? row.scannedTime : "",
    }));

    const profiles = [
        { operator: "[Ops4]BIPAGEM RAPIDA", count: 25, gapHistogram: { 2: 24 } },
        { operator: "[Ops5]PAUSA ISOLADA", count: 25, gapHistogram: { 2: 23, 300: 1 } },
        { operator: "[Ops6]AMOSTRA PEQUENA", count: 14, gapHistogram: { 10: 13 } },
    ];

    const rows = [
        ...createOperatorRows({ operator: "[Ops1]BASE A", count: 100, gapSeconds: 2 }),
        ...createOperatorRows({ operator: "[Ops2]BASE B", count: 90, gapSeconds: 2 }),
        ...insufficientTimes,
        ...profiles.flatMap(profile => createRowsFromGapHistogram(profile, profile.operator)),
    ];

    const operators = classifyParcelOperators(rows);

    assert.equal(operators.find(stat => stat.operator.includes("HORARIOS")).timedScanCount, 2);
    assert.equal(operators.find(stat => stat.operator.includes("HORARIOS"))
        .classification.hasSufficientTimingEvidence, false);
    assert.ok(operators.every(stat => stat.packageKind === "common"));
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
        "7d 0h 30min",
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
            2,
        ],
    );
});

test("Exception exige Final Status LMHub_Received, inclusive no filtro Todos", () => {
    const rows = [
        { countType: "Backlog" },
        { countType: "Exception", finalStatus: "LMHub_Received" },
        { countType: " exception ", finalStatus: " LMHub_Received " },
        { countType: "Exception", finalStatus: "SOC_Received", scannedStatus: "LMHub_Received" },
        { countType: "Exception", finalStatus: "Return_LMHub_Received" },
        { countType: "Exception", finalStatus: "lmhub_received" },
        { countType: "Exception", finalStatus: "-" },
        { countType: "Exception", finalStatus: "" },
        { countType: "Exception", finalStatus: null },
        { countType: "Exception" },
        { countType: "Missing" },
    ];

    assert.equal(
        filterParcelPackageRows(
            rows,
            "all",
        ).length,
        3,
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
        2,
    );

    assert.deepEqual(filterParcelPackageRows(rows, "all"), rows.slice(0, 3));
    assert.deepEqual(filterParcelPackageRows(rows, "backlog"), rows.slice(0, 1));
    assert.deepEqual(filterParcelPackageRows(rows, "exception"), rows.slice(1, 3));
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

test("preserva nomes acentuados em CSV UTF-8 com ou sem BOM e em CSV legado", async () => {
    const require = createRequire(import.meta.url);
    const previousWindow = globalThis.window;
    globalThis.window = { XLSX: require("../js/libraries/xlsx.full.min.js") };

    const expectedOperator = "[Ops26438]JÕAO PEDRO PEREIRA BARROS";
    const csv = [
        "SPX Tracking Number,Scanned Status,Count Type,Operator,Aging Time,Scanned Time",
        `BR1,LMHub_Received,Backlog,${expectedOperator},5h,2026-09-26 15:27:31`,
    ].join("\r\n");

    try {
        for (const content of [csv, `\uFEFF${csv}`, Buffer.from(csv, "latin1")]) {
            const imported = await readParcelFile(new File([content], "acentos.csv"));
            assert.equal(imported.rows[0].operator, expectedOperator);
        }
    } finally {
        if (previousWindow === undefined) {
            delete globalThis.window;
        } else {
            globalThis.window = previousWindow;
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
        "parcelMissortedTotal",
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
