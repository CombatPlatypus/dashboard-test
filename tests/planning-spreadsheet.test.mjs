import assert from "node:assert/strict";
import {
    readFile,
} from "node:fs/promises";
import {
    createRequire,
} from "node:module";
import {
    test,
} from "node:test";

import {
    createPlanningSpreadsheetCells,
    createPlanningSpreadsheetFileName,
} from "../js/reports/planning/spreadsheet.js";

import {
    updateXlsxTemplateArchive,
} from "../js/reports/xlsx-template.js";

const require =
    createRequire(
        import.meta.url,
    );

const JSZip =
    require(
        "../js/libraries/jszip.min.js",
    );

const XLSX =
    require(
        "../js/libraries/xlsx.full.min.js",
    );

const templatePath =
    new URL(
        "../xlsx/Relatório de Planejamento - Planilhas da Operação 2026.xlsx",
        import.meta.url,
    );

function createPlanningState() {
    return {
        averageSpr: 95,
        dailyCapacity: 20000,
        vehicleCounts: {
            cars: null,
            motorcycles: null,
            fiorinos: null,
        },
        collectionPool: {
            backlogPackages: 20,
            backlogBulky: 12,
            errors: 2,
            added: 32,
            removed: 2,
        },
        lhs: [
            {
                id: 1,
                code: "LT0QA702II1S1",
                origin: "Guarulhos",
                quantity: 2786,
                segregate: false,
                segregateTos: false,
                tos: [],
            },
            {
                id: 2,
                code: "LT0QA702IEPC1",
                origin: "São Bernardo",
                quantity: 606,
                segregate: false,
                segregateTos: false,
                tos: [],
            },
            {
                id: 3,
                code: "LT0QA702IP701",
                origin: "Cumbica Guarulhos",
                quantity: 5575,
                segregate: false,
                segregateTos: false,
                tos: [],
            },
        ],
    };
}

test(
    "mapeia o relatório de planejamento para as células do modelo",
    function () {
        const cells =
            createPlanningSpreadsheetCells(
                createPlanningState(),
            );

        assert.deepEqual(
            {
                B3: cells.B3,
                C3: cells.C3,
                D3: cells.D3,
                B7: cells.B7,
                C7: cells.C7,
                D7: cells.D7,
                B11: cells.B11,
                C11: cells.C11,
                D11: cells.D11,
            },
            {
                B3: 8999,
                C3: 95,
                D3: 20000,
                B7: 20,
                C7: 12,
                D7: 8967,
                B11: 32,
                C11: 2,
                D11: 2,
            },
        );

        assert.deepEqual(
            [
                cells.B15,
                cells.C15,
                cells.D15,
                cells.B17,
                cells.C17,
                cells.D17,
                cells.B18,
                cells.C18,
                cells.D18,
            ],
            [
                "LT0QA702II1S1",
                "Guarulhos",
                2786,
                "LT0QA702IP701",
                "Cumbica Guarulhos",
                5575,
                "—",
                "—",
                "—",
            ],
        );

        assert.equal(
            cells.B25,
            "—",
        );

        assert.equal(
            cells.B35,
            "—",
        );
    },
);

test(
    "preenche LHs e TOs segregados com a quantidade efetivamente segregada",
    function () {
        const state =
            createPlanningState();

        state.lhs[0].segregate =
            true;

        state.lhs[1].segregate =
            true;

        state.lhs[1].segregateTos =
            true;

        state.lhs[1].tos = [
            {
                id: 1,
                code: "TO-001",
                quantity: 20,
            },
            {
                id: 2,
                code: "",
                quantity: null,
            },
            {
                id: 3,
                code: "TO-003",
                quantity: 3,
            },
        ];

        const cells =
            createPlanningSpreadsheetCells(
                state,
            );

        assert.deepEqual(
            [
                cells.B25,
                cells.C25,
                cells.D25,
                cells.B26,
                cells.C26,
                cells.D26,
            ],
            [
                "LT0QA702II1S1",
                "Guarulhos",
                2786,
                "LT0QA702IEPC1",
                "São Bernardo",
                23,
            ],
        );

        assert.deepEqual(
            [
                cells.B35,
                cells.C35,
                cells.D35,
                cells.B36,
                cells.C36,
                cells.D36,
            ],
            [
                "TO-001",
                "LT0QA702IEPC1",
                20,
                "TO-003",
                "LT0QA702IEPC1",
                3,
            ],
        );
    },
);

test(
    "impede que o download omita registros que não cabem no modelo",
    function () {
        const state =
            createPlanningState();

        state.lhs =
            Array.from(
                {
                    length: 9,
                },
                function (_, index) {
                    return {
                        id: index + 1,
                        code: `LH-${index + 1}`,
                        origin: "Origem",
                        quantity: 1,
                        segregate: false,
                        segregateTos: false,
                        tos: [],
                    };
                },
            );

        assert.throws(
            function () {
                createPlanningSpreadsheetCells(
                    state,
                );
            },
            /até 8 LHs programados/,
        );
    },
);

test(
    "preenche o XLSX sem alterar estilos, desenhos ou áreas não mapeadas",
    async function () {
        const template =
            await readFile(
                templatePath,
            );

        const archive =
            await JSZip.loadAsync(
                template,
            );

        const originalEntries =
            Object.keys(
                archive.files,
            ).sort();

        const preservedPaths = [
            "xl/styles.xml",
            "xl/sharedStrings.xml",
            "xl/drawings/drawing1.xml",
        ];

        const preservedContents =
            Object.fromEntries(
                await Promise.all(
                    preservedPaths.map(
                        async function (path) {
                            return [
                                path,
                                await archive.file(path)
                                    .async("string"),
                            ];
                        },
                    ),
                ),
            );

        await updateXlsxTemplateArchive({
            archive,
            sheetName: "Modelo",
            cells:
                createPlanningSpreadsheetCells(
                    createPlanningState(),
                ),
        });

        const worksheetXml =
            await archive.file(
                "xl/worksheets/sheet1.xml",
            ).async("string");

        assert.match(
            worksheetXml,
            /<c r="B3" s="7"><v>8999<\/v><\/c>/,
        );

        assert.match(
            worksheetXml,
            /<c r="B15" s="7" t="inlineStr"><is><t>LT0QA702II1S1<\/t><\/is><\/c>/,
        );

        assert.match(
            worksheetXml,
            /<c r="F1" s="1" t="s"><v>1<\/v><\/c>/,
        );

        const output =
            await archive.generateAsync({
                type: "nodebuffer",
                compression: "DEFLATE",
            });

        const reopenedArchive =
            await JSZip.loadAsync(
                output,
            );

        assert.deepEqual(
            Object.keys(
                reopenedArchive.files,
            ).sort(),
            originalEntries,
        );

        for (const path of preservedPaths) {
            assert.equal(
                await reopenedArchive.file(path)
                    .async("string"),
                preservedContents[path],
            );
        }

        const workbook =
            XLSX.read(
                output,
                {
                    type: "buffer",
                    cellStyles: true,
                },
            );

        const sheet =
            workbook.Sheets.Modelo;

        assert.equal(
            sheet.B3.v,
            8999,
        );

        assert.equal(
            sheet.B15.v,
            "LT0QA702II1S1",
        );

        assert.equal(
            sheet.F1.v,
            "Backlog Adicionado",
        );
    },
);

test(
    "gera um nome de arquivo estável para a data local",
    function () {
        const date =
            new Date(
                2026,
                9,
                7,
                20,
                30,
            );

        assert.equal(
            createPlanningSpreadsheetFileName(
                date,
            ),
            "relatorio-de-planejamento-2026-10-07.xlsx",
        );
    },
);

test(
    "o HTML carrega o JSZip e conecta o botão ao exportador de planilhas",
    async function () {
        const [
            html,
            view,
        ] = await Promise.all([
            readFile(
                new URL(
                    "../index.html",
                    import.meta.url,
                ),
                "utf8",
            ),
            readFile(
                new URL(
                    "../js/reports/planning/view.js",
                    import.meta.url,
                ),
                "utf8",
            ),
        ]);

        assert.match(
            html,
            /id="planningSpreadsheetDownloadButton"[^>]+title="Baixar planilha de planejamento"/,
        );

        assert.ok(
            html.indexOf(
                'src="js/libraries/jszip.min.js"',
            ) <
            html.indexOf(
                'type="module" src="js/reports/init.js"',
            ),
        );

        assert.match(
            view,
            /planningSpreadsheetDownloadButton\.addEventListener\(\s*"click",\s*handleDownloadPlanningSpreadsheet/,
        );

        assert.match(
            view,
            /await createPlanningSpreadsheetBlob\(\s*state/,
        );
    },
);
