/* ELEMENTO DE STATUS */

const fileStatus =
    document.getElementById(
        "statisticsFileStatus",
    );

/* ORDENA TEXTOS E NÚMEROS NATURALMENTE */

const naturalCollator =
    new Intl.Collator(
        "pt-BR",
        {
            numeric: true,
            sensitivity: "base",
        },
    );

/* ESTADO DA TABELA INTERATIVA */

const tableState = {
    sourceFileName: "",

    sheetName: "",

    headers: [],

    rows: [],

    columnProfiles: [],

    visibleColumns: new Set(),

    analysisModes: new Map(),

    selectedAnalysisColumns: new Set(),

    filters: [],

    columnValueCounts: [],

    columnCount: 0,

    sortColumn: null,

    sortDirection: "asc",
};

/* ATUALIZA A MENSAGEM DO IMPORTADOR */

function setStatus(
    message,
    isError = false,) {
    fileStatus.textContent = message;

    fileStatus.classList.toggle(
        "is-error",
        isError,
    );
}

/* PREPARA O VALOR PARA EXIBIÇÃO */

function formatCellValue(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value);
}

/* CRIA UMA CÉLULA */

function createCell(tagName, value) {
    const cell =
        document.createElement(tagName);

    cell.textContent =
        formatCellValue(value);

    return cell;
}

/* NORMALIZA UM VALOR PARA PESQUISA */

function normalizeSearchValue(value) {
    return formatCellValue(value)
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase();
}

/* VERIFICA SE UMA CÉLULA ESTÁ VAZIA */

function isEmptyCell(value) {
    return (
        formatCellValue(
            value,
        ).trim() === ""
    );
}

/* CONVERTE UM VALOR NUMÉRICO */

function parseNumericValue(value) {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    if (
        value instanceof Date ||
        isEmptyCell(value)
    ) {
        return null;
    }

    let normalizedValue =
        formatCellValue(value)
            .trim()
            .replace(
                /\s|\u00a0/g,
                "",
            )
            .replace(
                /^R\$/i,
                "",
            )
            .replace(
                /%$/,
                "",
            );

    if (
        !/^[+-]?\d[\d.,]*$/.test(
            normalizedValue,
        )
    ) {
        return null;
    }

    const lastComma =
        normalizedValue.lastIndexOf(
            ",",
        );

    const lastDot =
        normalizedValue.lastIndexOf(
            ".",
        );

    if (
        lastComma >= 0 &&
        lastDot >= 0
    ) {
        const decimalSeparator =
            lastComma > lastDot
                ? ","
                : ".";

        const thousandsSeparator =
            decimalSeparator === ","
                ? "."
                : ",";

        normalizedValue =
            normalizedValue
                .replaceAll(
                    thousandsSeparator,
                    "",
                )
                .replace(
                    decimalSeparator,
                    ".",
                );
    } else if (lastComma >= 0) {
        normalizedValue =
            normalizedValue
                .replaceAll(".", "")
                .replace(",", ".");
    } else {
        normalizedValue =
            normalizedValue.replaceAll(
                ",",
                "",
            );
    }

    const numericValue =
        Number(normalizedValue);

    return Number.isFinite(
        numericValue,
    )
        ? numericValue
        : null;
}

/* CONVERTE UMA DATA OU DATA/HORA */

function parseDateValue(value) {
    if (
        value instanceof Date &&
        !Number.isNaN(
            value.getTime(),
        )
    ) {
        return value;
    }

    const displayValue =
        formatCellValue(
            value,
        ).trim();

    if (!displayValue) {
        return null;
    }

    const dateMatch =
        displayValue.match(
            /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
        ) ||
        displayValue.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
        );

    if (!dateMatch) {
        return null;
    }

    const startsWithYear =
        dateMatch[1].length === 4;

    let year = Number(
        startsWithYear
            ? dateMatch[1]
            : dateMatch[3],
    );

    if (year < 100) {
        year +=
            year >= 70
                ? 1900
                : 2000;
    }

    const month =
        Number(dateMatch[2]);

    const day = Number(
        startsWithYear
            ? dateMatch[3]
            : dateMatch[1],
    );

    const hour =
        Number(dateMatch[4] ?? 0);

    const minute =
        Number(dateMatch[5] ?? 0);

    const second =
        Number(dateMatch[6] ?? 0);

    const parsedDate = new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
    );

    if (
        parsedDate.getFullYear() !==
            year ||
        parsedDate.getMonth() !==
            month - 1 ||
        parsedDate.getDate() !==
            day ||
        parsedDate.getHours() !==
            hour ||
        parsedDate.getMinutes() !==
            minute ||
        parsedDate.getSeconds() !==
            second
    ) {
        return null;
    }

    return parsedDate;
}

/* DETECTA O TIPO DE UMA COLUNA */

function detectColumnProfile(
    columnIndex,) {
    const filledValues =
        tableState.rows
            .map(function (row) {
                return row[
                    columnIndex
                ];
            })
            .filter(
                function (value) {
                    return !isEmptyCell(
                        value,
                    );
                },
            );

    if (
        filledValues.length === 0
    ) {
        return {
            type: "empty",

            hasTime: false,
        };
    }

    const dateValues =
        filledValues.filter(
            function (value) {
                return (
                    parseDateValue(
                        value,
                    ) !== null
                );
            },
        );

    const numericValues =
        filledValues.filter(
            function (value) {
                return (
                    parseNumericValue(
                        value,
                    ) !== null
                );
            },
        );

    const uniqueValues =
        new Set(
            filledValues.map(
                function (value) {
                    return normalizeSearchValue(
                        value,
                    ).trim();
                },
            ),
        );

    const uniqueRatio =
        uniqueValues.size /
        filledValues.length;

    const headerValue =
        normalizeSearchValue(
            tableState.headers[
                columnIndex
            ],
        ).trim();

    /* VERIFICA SE O NOME INDICA UM IDENTIFICADOR */

    const identifierHeader =
        /(^|[\s_-])(id|codigo|code|uuid|chave|key|referencia|reference|pacotes?|packages?|pedidos?|orders?)([\s_-]|$)/.test(
            headerValue,
        ) ||
        /(^|[\s_-])(tracking|serial)(?:[\s_-]+number)?([\s_-]|$)/.test(
            headerValue,
        ) ||
        headerValue === "at/to";

    /* VERIFICA SE OS VALORES PARECEM CÓDIGOS */

    const identifierLikeValues =
        filledValues.filter(
            function (value) {
                const textValue =
                    formatCellValue(
                        value,
                    ).trim();

                return (
                    textValue.length >=
                        6 &&
                    !/\s/.test(
                        textValue,
                    ) &&
                    /[a-z]/i.test(
                        textValue,
                    ) &&
                    /\d/.test(
                        textValue,
                    )
                );
            },
        );

    const identifierValueRatio =
        identifierLikeValues.length /
        filledValues.length;

    const isLikelyIdentifier =
        identifierHeader ||
        identifierValueRatio >= 0.8;

    if (
        dateValues.length /
            filledValues.length >=
        0.8
    ) {
        return {
            type: "datetime",

            hasTime:
                filledValues.some(
                    function (value) {
                        return /\d{1,2}:\d{2}/.test(
                            formatCellValue(
                                value,
                            ),
                        );
                    },
                ),
        };
    }

    if (
        numericValues.length /
            filledValues.length >=
        0.8
    ) {
        return {
            type:
                isLikelyIdentifier &&
                uniqueRatio >= 0.8
                    ? "identifier"
                    : "number",

            hasTime: false,
        };
    }

    return {
        type:
            uniqueRatio >= 0.8 &&
            isLikelyIdentifier
                ? "identifier"
                : "category",

        hasTime: false,
    };
}

/* FORMATA UM NÚMERO DA ANÁLISE */

function formatAnalysisNumber(value) {
    if (
        !Number.isFinite(value)
    ) {
        return "—";
    }

    return new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 2,
        },
    ).format(value);
}

/* LIMPA O ESTADO DA TABELA */

function resetTableState() {
    tableState.sourceFileName =
        "";

    tableState.sourceExtension =
        "";

    tableState.sheetName = "";

    tableState.headers = [];

    tableState.rows = [];

    tableState.columnProfiles =
        [];

    tableState.visibleColumns.clear();

    tableState.analysisModes.clear();

    tableState.selectedAnalysisColumns.clear();

    tableState.filters = [];

    tableState.columnValueCounts =
        [];

    tableState.columnCount = 0;

    tableState.sortColumn =
        null;

    tableState.sortDirection =
        "asc";
}

/* CRIA UM NOME SEGURO PARA O ARQUIVO */

function createSafeFileBaseName(
    fileName,) {
    const lastDotPosition =
        fileName.lastIndexOf(".");

    const baseName =
        lastDotPosition > 0
            ? fileName.slice(
                  0,
                  lastDotPosition,
              )
            : fileName;

    const safeName =
        baseName
            .replace(
                /[<>:"/\\|?*\u0000-\u001F]/g,
                "_",
            )
            .trim();

    return (
        safeName ||
        "planilha"
    );
}

/* CRIA UM NOME VÁLIDO PARA A PÁGINA */

function createSafeSheetName(
    sheetName,) {
    const safeName =
        formatCellValue(
            sheetName,
        )
            .replace(
                /[\\/:?*\[\]]/g,
                " ",
            )
            .trim()
            .slice(0, 31);

    return (
        safeName ||
        "Dados"
    );
}

/* BAIXA UM ARQUIVO CRIADO COM BLOB */

function downloadBlob(
    blob,
    fileName,) {
    const downloadUrl =
        URL.createObjectURL(
            blob,
        );

    const downloadLink =
        document.createElement("a");

    downloadLink.href =
        downloadUrl;

    downloadLink.download =
        fileName;

    document.body.appendChild(
        downloadLink,
    );

    downloadLink.click();

    downloadLink.remove();

    window.setTimeout(
        function () {
            URL.revokeObjectURL(
                downloadUrl,
            );
        },
        0,
    );
}

/* CALCULA A LARGURA DAS COLUNAS EXPORTADAS */

function createExportColumnWidths(
    headers,
    rows,) {
    return headers.map(
        function (
            header,
            columnIndex,
        ) {
            let largestLength =
                formatCellValue(
                    header,
                ).length;

            rows.forEach(
                function (row) {
                    const cellLength =
                        formatCellValue(
                            row[
                                columnIndex
                            ],
                        ).length;

                    largestLength =
                        Math.max(
                            largestLength,
                            cellLength,
                        );
                },
            );

            return {
                wch: Math.min(
                    Math.max(
                        largestLength +
                            2,
                        10,
                    ),
                    45,
                ),
            };
        },
    );
}

/* EXECUTA UM DOWNLOAD E TRATA POSSÍVEIS ERROS */

function executeTableDownload(
    downloadFunction,
) {
    try {
        downloadFunction();
    } catch (error) {
        setStatus(
            error instanceof Error
                ? error.message
                : "Não foi possível gerar a nova versão.",
            true,
        );
    }
}
