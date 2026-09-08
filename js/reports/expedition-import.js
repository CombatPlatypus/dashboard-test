import {
    getExpeditionOperatorRanking,
    getExpeditionState,
    replaceExpeditionRoutes,
} from "./expedition-state.js";

import {
    setReportNotification,
} from "./report-notifications.js";

/* CONFIGURAÇÕES */

const MAX_EXPEDITION_FILE_SIZE =
    10 * 1024 * 1024;

const MAX_EXPEDITION_HEADER_SEARCH_ROWS =
    50;

const expeditionFileExtensions =
    new Set([
        "csv",
        "xlsx",
        "xls",
    ]);

const expeditionColumnAliases = {
    code: [
        "at to",
    ],

    corridor: [
        "corridor cage",
    ],

    initialOrders: [
        "total initial orders inside at to",
    ],

    finalOrders: [
        "total final orders inside at to",
    ],

    scannedOrders: [
        "total scanned orders",
    ],

    missortedOrders: [
        "missorted orders",
    ],

    missingOrders: [
        "missing orders",
    ],

    validationStartTime: [
        "validation start time",
    ],

    validationEndTime: [
        "validation end time",
    ],

    validationOperator: [
        "validation operator",
    ],

    revalidationOperator: [
        "revalidation operator",
    ],

    revalidatedCount: [
        "revalidated count",
    ],

    status: [
        "at to validation status",
    ],

    remark: [
        "remark",
    ],
};

/* NORMALIZAÇÕES */

function normalizeExpeditionColumnName(
    value,
) {
    return String(
        value ?? "",
    )
        .trim()
        .toLowerCase()
        .normalize(
            "NFD",
        )
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .replace(
            /[^a-z0-9]+/g,
            " ",
        )
        .trim();
}

function normalizeExpeditionCell(
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

function parseExpeditionQuantity(
    value,
) {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value === "number"
    ) {
        return (
            Number.isSafeInteger(value) &&
            value >= 0
        )
            ? value
            : null;
    }

    const receivedValue =
        String(value)
            .replace(
                /\s+/g,
                "",
            )
            .trim();

    let normalizedValue =
        receivedValue;

    if (
        /^\d{1,3}(?:[.,]\d{3})+$/.test(
            receivedValue,
        )
    ) {
        normalizedValue =
            receivedValue.replace(
                /[.,]/g,
                "",
            );
    }

    if (
        !/^\d+$/.test(
            normalizedValue,
        )
    ) {
        return null;
    }

    const numericValue =
        Number(
            normalizedValue,
        );

    return (
        Number.isSafeInteger(
            numericValue,
        ) &&
        numericValue >= 0
    )
        ? numericValue
        : null;
}

/* CALCULA O TEMPO DE CONFERÊNCIA */

function calculateExpeditionDuration(
    startValue,
    endValue,
) {
    const startText =
        normalizeExpeditionCell(
            startValue,
        );

    const endText =
        normalizeExpeditionCell(
            endValue,
        );

    if (
        !startText ||
        !endText
    ) {
        return null;
    }

    const startTime =
        Date.parse(
            startText.replace(
                " ",
                "T",
            ),
        );

    const endTime =
        Date.parse(
            endText.replace(
                " ",
                "T",
            ),
        );

    if (
        !Number.isFinite(
            startTime,
        ) ||
        !Number.isFinite(
            endTime,
        ) ||
        endTime < startTime
    ) {
        return null;
    }

    return Math.round(
        (
            endTime -
            startTime
        ) /
        1000,
    );
}

/* LOCALIZA AS COLUNAS DO SPX */

function findExpeditionColumns(
    row,
) {
    if (
        !Array.isArray(
            row,
        )
    ) {
        return null;
    }

    const normalizedHeaders =
        row.map(
            normalizeExpeditionColumnName,
        );

    const columns = {};

    for (
        const [
            field,
            aliases,
        ] of Object.entries(
            expeditionColumnAliases,
        )
    ) {
        const columnIndex =
            normalizedHeaders.findIndex(
                function (header) {
                    return aliases.includes(
                        header,
                    );
                },
            );

        if (
            columnIndex === -1
        ) {
            return null;
        }

        columns[field] =
            columnIndex;
    }

    return columns;
}

function findExpeditionSource(
    workbook,
) {
    for (
        const sheetName of
            workbook.SheetNames
    ) {
        const worksheet =
            workbook.Sheets[
                sheetName
            ];

        const rows =
            window.XLSX.utils
                .sheet_to_json(
                    worksheet,
                    {
                        header: 1,
                        defval: "",
                        raw: false,
                        blankrows: false,
                    },
                );

        const searchLimit =
            Math.min(
                rows.length,
                MAX_EXPEDITION_HEADER_SEARCH_ROWS,
            );

        for (
            let rowIndex = 0;
            rowIndex < searchLimit;
            rowIndex += 1
        ) {
            const columns =
                findExpeditionColumns(
                    rows[rowIndex],
                );

            if (columns) {
                return {
                    sheetName,
                    rows,

                    headerRowIndex:
                        rowIndex,

                    columns,
                };
            }
        }
    }

    throw new Error(
        "Não encontrei as colunas do relatório Gestão de Audit do SPX.",
    );
}

/* CONVERTE AS LINHAS EM ROTAS */

function createExpeditionRoutes(
    source,
) {
    const routes = [];

    const receivedCodes =
        new Set();

    let duplicateRoutes = 0;

    for (
        let rowIndex =
            source.headerRowIndex + 1;
        rowIndex <
            source.rows.length;
        rowIndex += 1
    ) {
        const row =
            source.rows[rowIndex];

        const code =
            normalizeExpeditionCell(
                row?.[
                    source.columns.code
                ],
            ).toUpperCase();

        if (!code) {
            continue;
        }

        if (
            receivedCodes.has(
                code,
            )
        ) {
            duplicateRoutes += 1;
            continue;
        }

        const initialOrders =
            parseExpeditionQuantity(
                row[
                    source.columns
                        .initialOrders
                ],
            );

        const finalOrders =
            parseExpeditionQuantity(
                row[
                    source.columns
                        .finalOrders
                ],
            );

        const scannedOrders =
            parseExpeditionQuantity(
                row[
                    source.columns
                        .scannedOrders
                ],
            );

        const missortedOrders =
            parseExpeditionQuantity(
                row[
                    source.columns
                        .missortedOrders
                ],
            );

        const missingOrders =
            parseExpeditionQuantity(
                row[
                    source.columns
                        .missingOrders
                ],
            );

        if (
            initialOrders === null ||
            finalOrders === null ||
            scannedOrders === null ||
            missortedOrders === null ||
            missingOrders === null
        ) {
            throw new Error(
                `A linha ${rowIndex + 1} possui uma quantidade inválida.`,
            );
        }

        const validationStartTime =
            normalizeExpeditionCell(
                row[
                    source.columns
                        .validationStartTime
                ],
            );

        const validationEndTime =
            normalizeExpeditionCell(
                row[
                    source.columns
                        .validationEndTime
                ],
            );

        receivedCodes.add(
            code,
        );

        routes.push({
            code,

            corridor:
                normalizeExpeditionCell(
                    row[
                        source.columns
                            .corridor
                    ],
                ),

            initialOrders,
            finalOrders,
            scannedOrders,
            missortedOrders,
            missingOrders,

            validationStartTime,
            validationEndTime,

            validationDurationSeconds:
                calculateExpeditionDuration(
                    validationStartTime,
                    validationEndTime,
                ),

            validationOperator:
                normalizeExpeditionCell(
                    row[
                        source.columns
                            .validationOperator
                    ],
                ),

            revalidationOperator:
                normalizeExpeditionCell(
                    row[
                        source.columns
                            .revalidationOperator
                    ],
                ),

            revalidatedCount:
                parseExpeditionQuantity(
                    row[
                        source.columns
                            .revalidatedCount
                    ],
                ) ?? 0,

            status:
                normalizeExpeditionCell(
                    row[
                        source.columns
                            .status
                    ],
                ),

            remark:
                normalizeExpeditionCell(
                    row[
                        source.columns
                            .remark
                    ],
                ),
        });
    }

    if (
        routes.length === 0
    ) {
        throw new Error(
            "Nenhuma rota válida foi encontrada no arquivo.",
        );
    }

    return {
        routes,
        duplicateRoutes,
    };
}

/* LÊ O ARQUIVO */

async function readExpeditionFile(
    file,
) {
    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    if (
        !expeditionFileExtensions.has(
            extension,
        )
    ) {
        throw new Error(
            "Selecione um arquivo CSV, XLSX ou XLS.",
        );
    }

    if (
        file.size >
        MAX_EXPEDITION_FILE_SIZE
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

    if (
        workbook.SheetNames
            .length === 0
    ) {
        throw new Error(
            "O arquivo não possui nenhuma planilha.",
        );
    }

    const source =
        findExpeditionSource(
            workbook,
        );

    return {
        ...createExpeditionRoutes(
            source,
        ),

        sheetName:
            source.sheetName,
    };
}

function showExpeditionImportError(
    message,
) {
    setReportNotification({
        reportId: "expedition",

        type: "error",

        message:
            `Falha na importação: ${message}`,
    });

    window.alert(
        message,
    );
}

/* CONTROLA A IMPORTAÇÃO */

async function importExpeditionFile(
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
            await readExpeditionFile(
                file,
            );

        replaceExpeditionRoutes(
            result.routes,
            file.name,
        );

        const operators =
            getExpeditionOperatorRanking(
                getExpeditionState(),
            );

        importButton.textContent =
            "Importação Concluída";

        importButton.title =
            `${result.routes.length} rotas e ` +
            `${operators.length} conferentes importados.`;

        const importWarnings = [];

        if (
            result.duplicateRoutes > 0
        ) {
            const duplicateMessage =
                `${result.duplicateRoutes} rota(s) duplicada(s) foram ignoradas.`;

            console.warn(
                duplicateMessage,
            );

            importWarnings.push(
                duplicateMessage,
            );
        }

        setReportNotification({
            reportId: "expedition",

            type:
                importWarnings.length > 0
                    ? "warning"
                    : "success",

            message: [
                `${result.routes.length.toLocaleString(
                    "pt-BR",
                )} rotas importadas de ${file.name}.`,

                ...importWarnings,
            ].join(
                " ",
            ),
        });
            
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Não foi possível importar o arquivo.";

        console.error(
            "Não foi possível importar a conferência:",
            error,
        );

        importButton.textContent =
            "Erro na Importação";

        importButton.title =
            errorMessage;

        showExpeditionImportError(
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

function initializeExpeditionImport() {
    const importButton =
        document.getElementById(
            "expeditionImportButton",
        );

    const fileInput =
        document.getElementById(
            "expeditionFileInput",
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
            "Não foi possível inicializar a importação da expedição: botão ou input de arquivo não encontrado.",
        );

        return false;
    }

    if (
        fileInput.dataset
            .expeditionImportInitialized ===
        "true"
    ) {
        return true;
    }

    fileInput.dataset
        .expeditionImportInitialized =
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
                await importExpeditionFile(
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
    initializeExpeditionImport,
    readExpeditionFile,
};
