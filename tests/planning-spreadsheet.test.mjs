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
    assertPlanningSpreadsheetCapacity,
    createPlanningSpreadsheetBlob,
    createPlanningSpreadsheetCells,
    createPlanningSpreadsheetFileName,
    createPlanningSpreadsheetLayout,
    createPlanningSpreadsheetSheetName,
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
        cellValues:
            template.cellValues,
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
        backlog: {
            packages:
                "BR-PACOTE-001\nBR-PACOTE-002\nbr-pacote-001",
            bulky:
                "BR-VOLUMOSO-001\nBR-PACOTE-002",
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
                A3: cells.A3,
                B3: cells.B3,
                C3: cells.C3,
                A7: cells.A7,
                B7: cells.B7,
                C7: cells.C7,
                A11: cells.A11,
                B11: cells.B11,
                C11: cells.C11,
            },
            {
                A3: 8970,
                B3: 95,
                C3: 20000,
                A7: 2,
                B7: 1,
                C7: 8967,
                A11: 3,
                B11: 2,
                C11: 2,
            },
        );

        assert.deepEqual(
            [
                cells.E3,
                cells.E4,
                cells.F3,
            ],
            [
                "BR-PACOTE-001",
                "BR-PACOTE-002",
                "BR-VOLUMOSO-001",
            ],
        );

        assert.equal(
            cells.E5,
            undefined,
        );

        assert.equal(
            cells.F4,
            undefined,
        );

        assert.deepEqual(
            [
                cells[`A${lhsStart}`],
                cells[`B${lhsStart}`],
                cells[`C${lhsStart}`],
                cells[`A${lhsStart + 2}`],
                cells[`B${lhsStart + 2}`],
                cells[`C${lhsStart + 2}`],
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
                `A${layout.segregatedLhs.startRow}`
            ],
            undefined,
        );

        assert.equal(
            cells[
                `A${layout.tos.startRow}`
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
                cells[`A${segregatedStart}`],
                cells[`B${segregatedStart}`],
                cells[`C${segregatedStart}`],
                cells[`A${segregatedStart + 1}`],
                cells[`B${segregatedStart + 1}`],
                cells[`C${segregatedStart + 1}`],
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
                cells[`A${tosStart}`],
                cells[`B${tosStart}`],
                cells[`C${tosStart}`],
                cells[`A${tosStart + 1}`],
                cells[`B${tosStart + 1}`],
                cells[`C${tosStart + 1}`],
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

        assert.deepEqual(
            layout,
            {
                lhs: { startRow: 15, rowCount: 20 },
                segregatedLhs: { startRow: 37, rowCount: 20 },
                tos: { startRow: 59, rowCount: 5942 },
                backlog: { startRow: 3, rowCount: 5998 },
            },
        );
    },
);

test("reconhece ⬝, — e os dois marcadores misturados nas linhas disponíveis", async () => {
    const { cellValues, layout } = await loadPlanningTemplate();
    for (const marker of ["⬝", "—", "mixed"]) {
        const values = new Map(Array.from(cellValues, ([reference, value], index) => [
            reference,
            ["⬝", "—"].includes(value)
                ? ` ${marker === "mixed" ? (index % 2 ? "⬝" : "—") : marker} `
                : value,
        ]));
        assert.deepEqual(createPlanningSpreadsheetLayout(values), layout, `Marcador: ${marker}`);
        assert.equal(createPlanningSpreadsheetCells(createPlanningState(),
            createPlanningSpreadsheetLayout(values)).A15, "LT0QA702II1S1");
    }
});

test("não considera células sem marcador ou com dados como linhas disponíveis", async () => {
    const { cellValues } = await loadPlanningTemplate();
    for (const value of ["", "LH-OCUPADO", 0]) {
        const values = new Map(cellValues);
        values.set("A15", value);
        assert.throws(() => createPlanningSpreadsheetLayout(values), /LHs Programados não possui linhas disponíveis/);
    }
    const values = new Map(cellValues);
    values.set("E1", "Outra seção");
    assert.throws(() => createPlanningSpreadsheetLayout(values), /Backlog Adicionado não foi encontrada/);
});

test("valida os limites de LHs, TOs e das duas categorias do backlog", async () => {
    const { layout } = await loadPlanningTemplate();
    const sections = [
        ["lhs", layout.lhs.rowCount, "LHs programados"],
        ["segregatedLhs", layout.segregatedLhs.rowCount, "LHs a segregar"],
        ["tos", layout.tos.rowCount, "TOs para segregar"],
        ["backlogPackages", layout.backlog.rowCount, "pacotes normais no backlog"],
        ["backlogBulky", layout.backlog.rowCount, "pacotes volumosos no backlog"],
    ];
    for (const [section, limit, label] of sections) {
        const rows = { lhs: [], segregatedLhs: [], tos: [], backlogPackages: [], backlogBulky: [] };
        rows[section] = Array.from({ length: limit });
        assert.equal(assertPlanningSpreadsheetCapacity(rows, layout), true);
        rows[section].push({});
        assert.throws(() => assertPlanningSpreadsheetCapacity(rows, layout), {
            message: `O modelo comporta até ${limit} ${label}, mas o relatório possui ${limit + 1}.`,
        });
    }
});

test("exporta até a última linha disponível de cada seção do modelo atual", async () => {
    const { layout } = await loadPlanningTemplate();
    const state = createPlanningState();
    state.lhs = Array.from({ length: layout.lhs.rowCount }, (_, index) => ({
        id: index + 1, code: `LH-${index + 1}`, origin: "Origem de teste", quantity: 6000,
        segregate: true, segregateTos: index === 0,
        tos: index === 0 ? Array.from({ length: layout.tos.rowCount }, (_, toIndex) => ({
            id: toIndex + 1, code: `TO-${toIndex + 1}`, quantity: 1,
        })) : [],
    }));
    state.backlog = {
        packages: Array.from({ length: layout.backlog.rowCount }, (_, index) => `BR-PACOTE-${index + 1}`).join("\n"),
        bulky: Array.from({ length: layout.backlog.rowCount }, (_, index) => `BR-VOLUMOSO-${index + 1}`).join("\n"),
    };
    const template = await readFile(templatePath);
    const outputBlob = await createPlanningSpreadsheetBlob(state, new Date(2026, 9, 13, 12), {
        fetchFunction: async () => ({ ok: true, status: 200, arrayBuffer: async () => template }),
        jsZipLibrary: JSZip,
    });
    const workbook = XLSX.read(Buffer.from(await outputBlob.arrayBuffer()), { type: "buffer" });
    const sheet = workbook.Sheets["13-10"];
    assert.equal(sheet.A34.v, "LH-20");
    assert.equal(sheet.A56.v, "LH-20");
    assert.equal(sheet.A6000.v, "TO-5942");
    assert.equal(sheet.B6000.v, "LH-1");
    assert.equal(sheet.C6000.v, 1);
    assert.equal(sheet.E6000.v, "BR-PACOTE-5998");
    assert.equal(sheet.F6000.v, "BR-VOLUMOSO-5998");
    assert.equal(sheet.D3, undefined);
    assert.equal(sheet.G3, undefined);
});

test("exporta campos sem valor como — e mantém zero como número", async () => {
    const { layout } = await loadPlanningTemplate();
    const state = createPlanningState();
    state.dailyCapacity = null;
    state.lhs[0] = { ...state.lhs[0], code: "", origin: "", quantity: 0 };
    const cells = createPlanningSpreadsheetCells(state, layout);
    assert.equal(cells.C3, "—");
    assert.equal(cells.A15, "—");
    assert.equal(cells.B15, "—");
    assert.equal(cells.C15, 0);
});

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
                cells[`A${tosStart}`],
                cells[`A${tosStart + 24}`],
                cells[`C${tosStart + 24}`],
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

        const preservedPaths = originalEntries.filter(path => path !== "xl/worksheets/sheet1.xml");
        const originalWorksheetXml = await archive.file("xl/worksheets/sheet1.xml").async("string");
        const { cellValues } = await readXlsxTemplateWorksheet({ archive, sheetName: "Modelo" });
        const cells = createPlanningSpreadsheetCells(createPlanningState(), createPlanningSpreadsheetLayout(cellValues));

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

        const cellPattern = /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g;
        const getCellXml = xml => new Map(Array.from(xml.matchAll(cellPattern), ([cell]) => [cell.match(/\br="([^"]+)"/)[1], cell]));
        const originalCells = getCellXml(originalWorksheetXml);
        const updatedCells = getCellXml(worksheetXml);
        for (const reference of Object.keys(cells)) {
            assert.equal(updatedCells.get(reference).match(/\bs="([^"]+)"/)?.[1],
                originalCells.get(reference).match(/\bs="([^"]+)"/)?.[1], `Estilo preservado: ${reference}`);
        }
        const maskUpdatedCells = xml => xml.replace(cellPattern, cell => {
            const reference = cell.match(/\br="([^"]+)"/)[1];
            return Object.hasOwn(cells, reference) ? `<mapped-cell r="${reference}"/>` : cell;
        });
        assert.equal(maskUpdatedCells(worksheetXml), maskUpdatedCells(originalWorksheetXml));

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
            sheet.A3.v,
            8970,
        );

        assert.equal(
            sheet.A15.v,
            "LT0QA702II1S1",
        );

        assert.equal(
            sheet.E1.v,
            "Backlog Adicionado",
        );

        assert.equal(
            sheet.E3.v,
            "BR-PACOTE-001",
        );

        assert.equal(
            sheet.F3.v,
            "BR-VOLUMOSO-001",
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
    "renomeia a aba gerada com a data local",
    async function () {
        const date =
            new Date(
                2026,
                9,
                7,
                20,
                30,
            );

        assert.equal(
            createPlanningSpreadsheetSheetName(
                date,
            ),
            "07-10",
        );

        const template =
            await readFile(
                templatePath,
            );

        const outputBlob =
            await createPlanningSpreadsheetBlob(
                createPlanningState(),
                date,
                {
                    fetchFunction:
                        async function () {
                            return {
                                ok: true,
                                status: 200,
                                arrayBuffer:
                                    async function () {
                                        return template;
                                    },
                            };
                        },
                    jsZipLibrary:
                        JSZip,
                },
            );

        const output =
            Buffer.from(
                await outputBlob.arrayBuffer(),
            );

        const workbook =
            XLSX.read(
                output,
                {
                    type: "buffer",
                    cellStyles: true,
                },
            );

        assert.deepEqual(
            workbook.SheetNames,
            [
                "07-10",
            ],
        );

        assert.equal(
            workbook.Sheets["07-10"].E3.v,
            "BR-PACOTE-001",
        );

        assert.equal(
            workbook.Sheets["07-10"].F3.v,
            "BR-VOLUMOSO-001",
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
            /await createPlanningSpreadsheetBlob\(\s*state,\s*exportDate/,
        );

        assert.match(
            view,
            /createPlanningSpreadsheetFileName\(\s*exportDate/,
        );
    },
);
