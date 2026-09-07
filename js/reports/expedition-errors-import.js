import {
    getExpeditionErrorAnalysis,
    getExpeditionState,
    replaceExpeditionErrorData,
} from "./expedition-state.js";

import {
    setReportNotification,
} from "./report-notifications.js";

/* CONFIGURAÇÕES */

const MAX_EXPEDITION_ERRORS_FILE_SIZE =
    10 * 1024 * 1024;

const MAX_EXPEDITION_ERRORS_HEADER_SEARCH_ROWS =
    50;

const expeditionErrorsFileExtensions =
    new Set([
        "xlsx",
        "xls",
    ]);

const expeditionErrorsSheetNames = {
    streets:
        "layout das ruas",

    errors:
        "bipagem de erros",
};

const expeditionErrorsColumnAliases = {
    code: [
        "codigo br",
    ],

    sorting: [
        "erro de sorting",
        "erros de sorting",
    ],

    labeling: [
        "erro de etiqueta",
        "erros de etiqueta",
        "erro de etiquetagem",
        "erros de etiquetagem",
    ],

    route: [
        "rota do pacote",
        "rota",
    ],
};

/* NORMALIZAÇÕES */

function normalizeExpeditionErrorsText(
    value,
) {
    return String(
        value ?? "",
    )
        .replace(
            /\s+/g,
            " ",
        )
        .trim();
}

function normalizeExpeditionErrorsKey(
    value,
) {
    return normalizeExpeditionErrorsText(
        value,
    )
        .normalize(
            "NFD",
        )
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            " ",
        )
        .trim();
}

function normalizeExpeditionRouteCode(
    value,
) {
    return normalizeExpeditionErrorsText(
        value,
    ).toUpperCase();
}

/* LOCALIZA AS ABAS DO MODELO */

function findExpeditionErrorsWorksheet(
    workbook,
    expectedName,
) {
    const sheetName =
        workbook.SheetNames.find(
            function (receivedName) {
                return (
                    normalizeExpeditionErrorsKey(
                        receivedName,
                    ) ===
                    expectedName
                );
            },
        );

    return sheetName
        ? workbook.Sheets[
            sheetName
        ]
        : null;
}

function getExpeditionWorksheetRows(
    worksheet,
) {
    return window.XLSX.utils
        .sheet_to_json(
            worksheet,
            {
                header: 1,
                defval: "",
                raw: false,
                blankrows: true,
            },
        );
}

/* LÊ O LAYOUT DAS RUAS */

function getExpeditionStreetName(
    sequence,
    letter,
) {
    const receivedLetter =
        normalizeExpeditionErrorsText(
            letter,
        );

    if (receivedLetter) {
        return /^rua\b/i.test(
            receivedLetter,
        )
            ? receivedLetter
            : `Rua ${receivedLetter}`;
    }

    return normalizeExpeditionErrorsText(
        sequence,
    );
}

function createExpeditionStreets(
    rows,
) {
    const streetColumnCount =
        Math.max(
            rows[0]?.length ?? 0,
            rows[1]?.length ?? 0,
            rows[2]?.length ?? 0,
        );

    const streets = [];

    for (
        let columnIndex = 1;
        columnIndex <
            streetColumnCount;
        columnIndex += 1
    ) {
        const sequence =
            normalizeExpeditionErrorsText(
                rows[0]?.[
                    columnIndex
                ],
            );

        const letter =
            normalizeExpeditionErrorsText(
                rows[1]?.[
                    columnIndex
                ],
            );

        const guardian =
            normalizeExpeditionErrorsText(
                rows[2]?.[
                    columnIndex
                ],
            );

        const routeCodes =
            new Set();

        for (
            let rowIndex = 3;
            rowIndex < rows.length;
            rowIndex += 1
        ) {
            const routeCode =
                normalizeExpeditionRouteCode(
                    rows[rowIndex]?.[
                        columnIndex
                    ],
                );

            if (routeCode) {
                routeCodes.add(
                    routeCode,
                );
            }
        }

        const name =
            getExpeditionStreetName(
                sequence,
                letter,
            );

        if (
            !name &&
            !guardian &&
            routeCodes.size === 0
        ) {
            continue;
        }

        streets.push({
            name:
                name ||
                `Rua ${streets.length + 1}`,

            guardian,
            routeCodes,
            sortingErrors: 0,
            labelingErrors: 0,
        });
    }

    if (streets.length === 0) {
        throw new Error(
            "Nenhuma rua foi encontrada na aba Layout das Ruas.",
        );
    }

    return streets;
}

function createExpeditionStreetRouteMap(
    streets,
) {
    const routes =
        new Map();

    let duplicateRoutes = 0;

    streets.forEach(
        function (
            street,
            streetIndex,
        ) {
            street.routeCodes
                .forEach(
                    function (routeCode) {
                        if (
                            routes.has(
                                routeCode,
                            )
                        ) {
                            duplicateRoutes += 1;
                            return;
                        }

                        routes.set(
                            routeCode,
                            streetIndex,
                        );
                    },
                );
        },
    );

    return {
        routes,
        duplicateRoutes,
    };
}

/* LÊ A BIPAGEM DE ERROS */

function findExpeditionErrorsColumn(
    headers,
    aliases,
    startIndex = 0,
    endIndex = headers.length,
) {
    for (
        let columnIndex = startIndex;
        columnIndex < endIndex;
        columnIndex += 1
    ) {
        if (
            aliases.includes(
                headers[columnIndex],
            )
        ) {
            return columnIndex;
        }
    }

    return -1;
}

function findExpeditionErrorsColumns(
    rows,
) {
    const searchLimit =
        Math.min(
            rows.length,
            MAX_EXPEDITION_ERRORS_HEADER_SEARCH_ROWS,
        );

    for (
        let rowIndex = 0;
        rowIndex < searchLimit;
        rowIndex += 1
    ) {
        const normalizedHeaders =
            (
                Array.isArray(
                    rows[rowIndex],
                )
                    ? rows[rowIndex]
                    : []
            ).map(
                normalizeExpeditionErrorsKey,
            );

        const sortingGroupColumn =
            findExpeditionErrorsColumn(
                normalizedHeaders,
                expeditionErrorsColumnAliases.sorting,
            );

        const labelingGroupColumn =
            findExpeditionErrorsColumn(
                normalizedHeaders,
                expeditionErrorsColumnAliases.labeling,
            );

        const legacyRouteColumn =
            findExpeditionErrorsColumn(
                normalizedHeaders,
                expeditionErrorsColumnAliases.route,
            );

        /*
         * Mantém compatibilidade com o formato antigo:
         * Erro de Sorting | Erro de Etiqueta | Rota do Pacote
         */
        if (
            sortingGroupColumn !== -1 &&
            labelingGroupColumn !== -1 &&
            legacyRouteColumn !== -1
        ) {
            return {
                rowIndex,

                columns: {
                    sorting:
                        sortingGroupColumn,

                    sortingRoute:
                        legacyRouteColumn,

                    labeling:
                        labelingGroupColumn,

                    labelingRoute:
                        legacyRouteColumn,
                },
            };
        }

        /*
         * Novo formato:
         *
         * Erro de Sorting       Erro de Etiqueta
         * Código BR | Rota      Código BR | Rota
         */
        if (
            sortingGroupColumn === -1 ||
            labelingGroupColumn === -1 ||
            rowIndex + 1 >= rows.length
        ) {
            continue;
        }

        const detailRowIndex =
            rowIndex + 1;

        const detailHeaders =
            (
                Array.isArray(
                    rows[detailRowIndex],
                )
                    ? rows[detailRowIndex]
                    : []
            ).map(
                normalizeExpeditionErrorsKey,
            );

        const sortingEndColumn =
            labelingGroupColumn >
            sortingGroupColumn
                ? labelingGroupColumn
                : detailHeaders.length;

        const labelingEndColumn =
            sortingGroupColumn >
            labelingGroupColumn
                ? sortingGroupColumn
                : detailHeaders.length;

        const sortingCodeColumn =
            findExpeditionErrorsColumn(
                detailHeaders,
                expeditionErrorsColumnAliases.code,
                sortingGroupColumn,
                sortingEndColumn,
            );

        const sortingRouteColumn =
            findExpeditionErrorsColumn(
                detailHeaders,
                expeditionErrorsColumnAliases.route,
                sortingGroupColumn,
                sortingEndColumn,
            );

        const labelingCodeColumn =
            findExpeditionErrorsColumn(
                detailHeaders,
                expeditionErrorsColumnAliases.code,
                labelingGroupColumn,
                labelingEndColumn,
            );

        const labelingRouteColumn =
            findExpeditionErrorsColumn(
                detailHeaders,
                expeditionErrorsColumnAliases.route,
                labelingGroupColumn,
                labelingEndColumn,
            );

        if (
            sortingCodeColumn !== -1 &&
            sortingRouteColumn !== -1 &&
            labelingCodeColumn !== -1 &&
            labelingRouteColumn !== -1
        ) {
            return {
                rowIndex:
                    detailRowIndex,

                columns: {
                    sorting:
                        sortingCodeColumn,

                    sortingRoute:
                        sortingRouteColumn,

                    labeling:
                        labelingCodeColumn,

                    labelingRoute:
                        labelingRouteColumn,
                },
            };
        }
    }

    throw new Error(
        "Não encontrei os blocos Erro de Sorting e Erro de Etiqueta com as colunas Código BR e Rota do Pacote na aba Bipagem de Erros.",
    );
}

function applyExpeditionErrorsToStreets(
    rows,
    header,
    streets,
    routeMap,
) {
    let sortingErrors = 0;
    let labelingErrors = 0;
    let unmappedSortingErrors = 0;
    let unmappedLabelingErrors = 0;

    for (
        let rowIndex =
            header.rowIndex + 1;
        rowIndex < rows.length;
        rowIndex += 1
    ) {
        const row =
            rows[rowIndex] ?? [];

        const sortingEntry =
            normalizeExpeditionErrorsText(
                row[
                    header.columns
                        .sorting
                ],
            );

        const labelingEntry =
            normalizeExpeditionErrorsText(
                row[
                    header.columns
                        .labeling
                ],
            );

        const sortingPackageRoute =
            normalizeExpeditionRouteCode(
                row[
                    header.columns
                        .sortingRoute
                ],
            );

        const labelingPackageRoute =
            normalizeExpeditionRouteCode(
                row[
                    header.columns
                        .labelingRoute
                ],
            );

        if (sortingEntry) {
            sortingErrors += 1;

            const sortingRoute =
                routeMap.has(
                    sortingPackageRoute,
                )
                    ? sortingPackageRoute
                    : normalizeExpeditionRouteCode(
                        sortingEntry,
                    );

            const streetIndex =
                routeMap.get(
                    sortingRoute,
                );

                if (
                    streetIndex ===
                    undefined
                ) {
                    unmappedSortingErrors += 1;
                } else {
                    streets[
                        streetIndex
                    ].sortingErrors += 1;
                }
        }

        if (labelingEntry) {
            labelingErrors += 1;

            const streetIndex =
                routeMap.get(
                    labelingPackageRoute,
                );

            if (
                streetIndex ===
                undefined
            ) {
                unmappedLabelingErrors += 1;
            } else {
                streets[
                    streetIndex
                ].labelingErrors += 1;
            }
        }
    }

    return {
        sortingErrors,
        labelingErrors,
        unmappedSortingErrors,
        unmappedLabelingErrors,
    };
}
    
/* CONVERTE A PLANILHA PARA O ESTADO */

function parseExpeditionErrorsWorkbook(
    workbook,
) {
    const streetsWorksheet =
        findExpeditionErrorsWorksheet(
            workbook,
            expeditionErrorsSheetNames
                .streets,
        );

    const errorsWorksheet =
        findExpeditionErrorsWorksheet(
            workbook,
            expeditionErrorsSheetNames
                .errors,
        );

    if (!streetsWorksheet) {
        throw new Error(
            "Não encontrei a aba Layout das Ruas.",
        );
    }

    if (!errorsWorksheet) {
        throw new Error(
            "Não encontrei a aba Bipagem de Erros.",
        );
    }

    const streetRows =
        getExpeditionWorksheetRows(
            streetsWorksheet,
        );

    const errorRows =
        getExpeditionWorksheetRows(
            errorsWorksheet,
        );

    const streets =
        createExpeditionStreets(
            streetRows,
        );

    const routeMapping =
        createExpeditionStreetRouteMap(
            streets,
        );

    const header =
        findExpeditionErrorsColumns(
            errorRows,
        );

    const totals =
        applyExpeditionErrorsToStreets(
            errorRows,
            header,
            streets,
            routeMapping.routes,
        );

    return {
        sortingErrors:
            totals.sortingErrors,

        labelingErrors:
            totals.labelingErrors,

        streets:
            streets.map(
                function (street) {
                    return {
                        name:
                            street.name,

                        guardian:
                            street.guardian,

                        sortingErrors:
                            street.sortingErrors,

                        labelingErrors:
                            street.labelingErrors,
                    };
                },
            ),

        duplicateRoutes:
            routeMapping
                .duplicateRoutes,

        unmappedSortingErrors:
            totals
                .unmappedSortingErrors,

        unmappedLabelingErrors:
            totals
                .unmappedLabelingErrors,
    };
}

/* LÊ O ARQUIVO */

async function readExpeditionErrorsFile(
    file,
) {
    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    if (
        !expeditionErrorsFileExtensions
            .has(
                extension,
            )
    ) {
        throw new Error(
            "Selecione a planilha XLSX ou XLS do processamento.",
        );
    }

    if (
        file.size >
        MAX_EXPEDITION_ERRORS_FILE_SIZE
    ) {
        throw new Error(
            "O arquivo ultrapassa o limite de 10 MB.",
        );
    }

    if (
        typeof window.XLSX !==
            "object" ||
        typeof window.XLSX.read !==
            "function"
    ) {
        throw new Error(
            "A biblioteca de leitura de planilhas não foi carregada.",
        );
    }

    const fileBuffer =
        await file.arrayBuffer();

    const workbook =
        window.XLSX.read(
            fileBuffer,
            {
                type: "array",
            },
        );

    return parseExpeditionErrorsWorkbook(
        workbook,
    );
}

function showExpeditionErrorsImportError(
    message,
) {
    setReportNotification({
        type: "error",

        message:
            `Falha na importação: ${message}`,
    });

    window.alert(
        message,
    );
}

/* CONTROLA A IMPORTAÇÃO */

async function importExpeditionErrorsFile(
    file,
    importButton,
) {
    const originalLabel =
        importButton.textContent
            .trim();

    const originalTitle =
        importButton.title;

    importButton.disabled =
        true;

    importButton.textContent =
        "Importando...";

    try {
        const result =
            await readExpeditionErrorsFile(
                file,
            );

        replaceExpeditionErrorData(
            result,
            file.name,
        );

        const analysis =
            getExpeditionErrorAnalysis(
                getExpeditionState(),
            );

        const importWarnings = [];

        if (
            result.duplicateRoutes > 0
        ) {
            importWarnings.push(
                `${result.duplicateRoutes} rota(s) repetida(s) no layout usaram a primeira rua encontrada.`,
            );
        }

        const unmappedErrors =
            result.unmappedSortingErrors +
            result.unmappedLabelingErrors;

        if (unmappedErrors > 0) {
            importWarnings.push(
                `${unmappedErrors} erro(s) sem uma rua correspondente foram agrupados em Não identificada.`,
            );
        }

        if (!analysis.hasSpXData) {
            importWarnings.push(
                "Importe também a conferência do SPX para calcular e balancear os totais.",
            );
        } else if (
            analysis.hasDivergence
        ) {
            importWarnings.push(
                `A planilha possui ${analysis.spreadsheetTotal.toLocaleString("pt-BR")} erro(s), mas o SPX possui ${analysis.spxTotal.toLocaleString("pt-BR")}. O total do SPX prevaleceu e a distribuição foi balanceada proporcionalmente.`,
            );
        }

        importButton.textContent =
            "Importação Concluída";

        importButton.title =
            `${(
                result.sortingErrors +
                result.labelingErrors
            ).toLocaleString(
                "pt-BR",
            )} erros importados.`;

        setReportNotification({
            type:
                importWarnings.length > 0
                    ? "warning"
                    : "success",

            message: [
                `Planilha de erros ${file.name} importada.`,
                ...importWarnings,
            ].join(
                " ",
            ),
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Não foi possível importar a planilha de erros.";

        console.error(
            "Não foi possível importar a planilha de erros:",
            error,
        );

        importButton.textContent =
            "Erro na Importação";

        importButton.title =
            errorMessage;

        showExpeditionErrorsImportError(
            errorMessage,
        );
    } finally {
        window.setTimeout(
            function () {
                importButton.textContent =
                    originalLabel;

                importButton.title =
                    originalTitle;

                importButton.disabled =
                    false;
            },
            1800,
        );
    }
}

/* INICIALIZAÇÃO */

function initializeExpeditionErrorsImport() {
    const importButton =
        document.getElementById(
            "expeditionErrorsImportButton",
        );

    const fileInput =
        document.getElementById(
            "expeditionErrorsFileInput",
        );

    if (
        !(
            importButton instanceof
                HTMLButtonElement
        ) ||
        !(
            fileInput instanceof
                HTMLInputElement
        )
    ) {
        console.error(
            "Não foi possível inicializar a importação da planilha de erros: botão ou input de arquivo não encontrado.",
        );

        return false;
    }

    if (
        fileInput.dataset
            .expeditionErrorsImportInitialized ===
        "true"
    ) {
        return true;
    }

    fileInput.dataset
        .expeditionErrorsImportInitialized =
            "true";

    importButton.addEventListener(
        "click",
        function () {
            fileInput.click();
        },
    );

    fileInput.addEventListener(
        "change",
        async function () {
            const file =
                fileInput.files?.[0];

            if (!file) {
                return;
            }

            try {
                await importExpeditionErrorsFile(
                    file,
                    importButton,
                );
            } finally {
                fileInput.value = "";
            }
        },
    );

    return true;
}

export {
    initializeExpeditionErrorsImport,
    parseExpeditionErrorsWorkbook,
    readExpeditionErrorsFile,
};
