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
    createPlanningSpreadsheetLayout,
} from "../js/reports/planning/spreadsheet.js";

import {
    readXlsxTemplateWorksheet,
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
        "../xlsx/Relatório de Planejamento.xlsx",
        import.meta.url,
    );

async function loadPlanningTemplate() {
    const archive =
        await JSZip.loadAsync(
            await readFile(
                templatePath,
            ),
        );

    const template =
        await readXlsxTemplateWorksheet({
            archive,
            sheetName: "Modelo",
        });

    return {
        archive,
        layout:
            createPlanningSpreadsheetLayout(
                template.cellValues,
            ),
    };
}

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
    async function () {
        const { layout } =
            await loadPlanningTemplate();

        const cells =
            createPlanningSpreadsheetCells(
                createPlanningState(),
                layout,
            );

        const lhsStart =
            layout.lhs.startRow;

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
                cells[`B${lhsStart}`],
                cells[`C${lhsStart}`],
                cells[`D${lhsStart}`],
                cells[`B${lhsStart + 2}`],
                cells[`C${lhsStart + 2}`],
                cells[`D${lhsStart + 2}`],
            ],
            [
                "LT0QA702II1S1",
                "Guarulhos",
                2786,
                "LT0QA702IP701",
                "Cumbica Guarulhos",
                5575,
            ],
        );

        assert.equal(
            cells[
                `B${layout.segregatedLhs.startRow}`
            ],
            undefined,
        );

        assert.equal(
            cells[
                `B${layout.tos.startRow}`
            ],
            undefined,
        );
    },
);

test(
    "preenche LHs e TOs segregados com a quantidade efetivamente segregada",
    async function () {
        const { layout } =
            await loadPlanningTemplate();

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
                layout,
            );

        const segregatedStart =
            layout.segregatedLhs.startRow;

        const tosStart =
            layout.tos.startRow;

        assert.deepEqual(
            [
                cells[`B${segregatedStart}`],
                cells[`C${segregatedStart}`],
                cells[`D${segregatedStart}`],
                cells[`B${segregatedStart + 1}`],
                cells[`C${segregatedStart + 1}`],
                cells[`D${segregatedStart + 1}`],
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
                cells[`B${tosStart}`],
                cells[`C${tosStart}`],
                cells[`D${tosStart}`],
                cells[`B${tosStart + 1}`],
                cells[`C${tosStart + 1}`],
                cells[`D${tosStart + 1}`],
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
    "descobre no próprio modelo as novas faixas disponíveis",
    async function () {
        const { layout } =
            await loadPlanningTemplate();

        assert.ok(
            layout.lhs.rowCount >= 20,
        );

        assert.ok(
            layout.segregatedLhs.rowCount >= 20,
        );

        assert.ok(
            layout.segregatedLhs.startRow >
            layout.lhs.startRow,
        );

        assert.ok(
            layout.tos.startRow >
            layout.segregatedLhs.startRow,
        );

        assert.ok(
            layout.tos.rowCount > 20,
        );
    },
);

test(
    "usa a faixa ampliada de TOs sem o limite antigo de 20 linhas",
    async function () {
        const { layout } =
            await loadPlanningTemplate();

        const state =
            createPlanningState();

        state.lhs[0].segregate =
            true;

        state.lhs[0].segregateTos =
            true;

        state.lhs[0].tos =
            Array.from(
                {
                    length: 25,
                },
                function (_, index) {
                    return {
                        id: index + 1,
                        code: `TO-${index + 1}`,
                        quantity: index + 1,
                    };
                },
            );

        const cells =
            createPlanningSpreadsheetCells(
                state,
                layout,
            );

        const tosStart =
            layout.tos.startRow;

        assert.deepEqual(
            [
                cells[`B${tosStart}`],
                cells[`B${tosStart + 24}`],
                cells[`D${tosStart + 24}`],
            ],
            [
                "TO-1",
                "TO-25",
                25,
            ],
        );
    },
);

test(
    "preenche o XLSX sem alterar estilos, desenhos ou áreas não mapeadas",
    async function () {
        const {
            archive,
        } = await loadPlanningTemplate();

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
                function ({
                    cellValues,
                }) {
                    return createPlanningSpreadsheetCells(
                        createPlanningState(),
                        createPlanningSpreadsheetLayout(
                            cellValues,
                        ),
                    );
                },
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
