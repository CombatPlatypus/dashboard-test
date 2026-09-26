import {
    LOSSES_RATE_MONTHS,
    getLossesRateState,
    replaceLossesRateHistory,
} from "./state.js";

import {
    setReportNotification,
} from "../report-notifications.js";

/* NOMES ACEITOS PARA AS COLUNAS */

const lossesRateColumnAliases = {
    description: [
        "descricao",
    ],

    hubCode: [
        "codigo do hub",
        "codigo hub",
    ],

    subRegional: [
        "sub regional",
        "subregional",
    ],

    month: [
        "mes",
        "month",
    ],

    possibleLosses: [
        "possiveis perdas",
        "possivel perda",
        "qtd possiveis perdas",
        "qtd possivel perda",
    ],

    lost: [
        "qtd lost",
        "quantidade lost",
        "quantidade de lost",
        "lost",
    ],

    damage: [
        "qtd avaria",
        "quantidade avaria",
        "quantidade de avaria",
        "avaria",
    ],

    moved: [
        "movimentado",
        "volume movimentado",
        "qtd movimentado",
    ],
};

const LOSSES_RATE_WORKBOOK_SHEET_NAME =
    "taxa de perdas";

const LOSSES_RATE_IDENTIFICATION_FIELDS =
    new Set([
        "description",
        "hubCode",
        "subRegional",
    ]);

/* NORMALIZA O NOME DE UMA COLUNA */

function normalizeLossesRateColumnName(
    value,
) {
    return String(
        value ?? "",
    )
        .trim()
        .toLowerCase()
        .normalize("NFD")
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

/* LOCALIZA UMA COLUNA */

function findLossesRateColumnIndex(
    headers,
    aliases,
) {
    return headers.findIndex(
        function (header) {
            return aliases.includes(
                header,
            );
        },
    );
}

/* LOCALIZA TODAS AS COLUNAS */

function getLossesRateColumnIndexes(
    headerRow,
    {
        requireIdentification = true,
    } = {},
) {
    const headers =
        headerRow.map(
            normalizeLossesRateColumnName,
        );

    const indexes = {};

    Object.entries(
        lossesRateColumnAliases,
    ).forEach(
        function (
            [
                field,
                aliases,
            ],
        ) {
            indexes[field] =
                findLossesRateColumnIndex(
                    headers,
                    aliases,
                );
        },
    );

    const missingFields =
        Object.entries(
            indexes,
        )
            .filter(
                function (
                    [
                        field,
                        index,
                    ],
                ) {
                    return index === -1 &&
                        (
                            requireIdentification ||
                            !LOSSES_RATE_IDENTIFICATION_FIELDS
                                .has(field)
                        );
                },
            )
            .map(
                function (
                    [
                        field,
                    ],
                ) {
                    return field;
                },
            );

    if (
        missingFields.length > 0
    ) {
        throw new Error(
            "A base não possui todas as colunas necessárias.",
        );
    }

    return indexes;
}

/* LÊ OS DADOS DE IDENTIFICAÇÃO */

function getLossesRateIdentification(
    rows,
    columnIndexes,
    {
        required = true,
    } = {},
) {
    const fields = [
        {
            key: "description",
            label: "Descrição",
        },
        {
            key: "hubCode",
            label: "Código do Hub",
        },
        {
            key: "subRegional",
            label: "Sub Regional",
        },
    ];

    return fields.reduce(
        function (
            identification,
            field,
        ) {
            if (
                columnIndexes[
                    field.key
                ] === -1
            ) {
                identification[
                    field.key
                ] = "";

                return identification;
            }

            const receivedValues =
                new Set();

            rows
                .slice(1)
                .forEach(
                    function (row) {
                        const value =
                            String(
                                row[
                                    columnIndexes[
                                        field.key
                                    ]
                                ] ?? "",
                            ).trim();

                        if (
                            value &&
                            value !== "-" &&
                            value !== "—"
                        ) {
                            receivedValues.add(
                                value,
                            );
                        }
                    },
                );

            if (
                receivedValues.size === 0
            ) {
                if (required) {
                    throw new Error(
                        `O campo ${field.label} não foi informado na base.`,
                    );
                }

                identification[
                    field.key
                ] = "";

                return identification;
            }

            if (
                receivedValues.size > 1
            ) {
                throw new Error(
                    `O campo ${field.label} possui valores diferentes na base.`,
                );
            }

            identification[
                field.key
            ] = [
                ...receivedValues,
            ][0];

            return identification;
        },
        {},
    );
}

/* MAPA DOS MESES */

const lossesRateMonthIndexes =
    new Map();

LOSSES_RATE_MONTHS.forEach(
    function (
        monthName,
        monthIndex,
    ) {
        const normalizedName =
            normalizeLossesRateColumnName(
                monthName,
            );

        lossesRateMonthIndexes.set(
            normalizedName,
            monthIndex,
        );

        lossesRateMonthIndexes.set(
            normalizedName.slice(
                0,
                3,
            ),
            monthIndex,
        );
    },
);

/* CONVERTE O MÊS */
/* CONVERTE O MÊS */

function parseLossesRateMonth(
    value,
    rowNumber,
) {
    const normalizedValue =
        normalizeLossesRateColumnName(
            value,
        );

    if (
        /^\d{1,2}$/.test(
            normalizedValue,
        )
    ) {
        const numericMonth =
            Number(
                normalizedValue,
            );

        if (
            numericMonth >= 1 &&
            numericMonth <= 12
        ) {
            return numericMonth - 1;
        }
    }

    if (
        lossesRateMonthIndexes.has(
            normalizedValue,
        )
    ) {
        return lossesRateMonthIndexes.get(
            normalizedValue,
        );
    }

    const abbreviatedValue =
        normalizedValue.slice(
            0,
            3,
        );

    if (
        lossesRateMonthIndexes.has(
            abbreviatedValue,
        )
    ) {
        return lossesRateMonthIndexes.get(
            abbreviatedValue,
        );
    }

    throw new Error(
        `Mês inválido na linha ${rowNumber}: ${String(value)}.`,
    );
}

/* CONVERTE UMA QUANTIDADE */

function parseLossesRateQuantity(
    value,
    fieldName,
    rowNumber,
) {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const receivedValue =
        String(value)
            .trim()
            .replace(
                /\s/g,
                "",
            );

    if (
        receivedValue === "-" ||
        receivedValue === "—"
    ) {
        return null;
    }

    if (
        /^\d+$/.test(
            receivedValue,
        )
    ) {
        return Number(
            receivedValue,
        );
    }

    if (
        /^\d{1,3}(?:[.,]\d{3})+$/.test(
            receivedValue,
        )
    ) {
        return Number(
            receivedValue.replace(
                /[.,]/g,
                "",
            ),
        );
    }

    throw new Error(
        `${fieldName} inválido na linha ${rowNumber}.`,
    );
}

/* VERIFICA SE UMA LINHA ESTÁ VAZIA */

function isLossesRateRowEmpty(
    row,
    columnIndexes,
) {
    const historyFields = [
        "month",
        "possibleLosses",
        "lost",
        "damage",
        "moved",
    ];

    return historyFields.every(
        function (field) {
            return String(
                row[
                    columnIndexes[field]
                ] ?? "",
            ).trim() === "";
        },
    );
}

/* CONVERTE AS LINHAS EM HISTÓRICO */

function createLossesRateHistory(
    rows,
    {
        requireIdentification = true,
        parseIdentification = true,
    } = {},
) {
    if (
        rows.length === 0
    ) {
        throw new Error(
            "A tabela copiada está vazia.",
        );
    }

    const columnIndexes =
        getLossesRateColumnIndexes(
            rows[0],
            {
                requireIdentification,
            },
        );

    const identification =
        parseIdentification
            ? getLossesRateIdentification(
                rows,
                columnIndexes,
                {
                    required:
                        requireIdentification,
                },
            )
            : {
                description: "",
                hubCode: "",
                subRegional: "",
            };

    const history =
        new Array(
            LOSSES_RATE_MONTHS.length,
        );

    const receivedMonths =
        new Set();

    let importedRows = 0;

    rows
        .slice(1)
        .forEach(
            function (
                row,
                rowIndex,
            ) {
                if (
                    isLossesRateRowEmpty(
                        row,
                        columnIndexes,
                    )
                ) {
                    return;
                }

                const rowNumber =
                    rowIndex + 2;

                const monthIndex =
                    parseLossesRateMonth(
                        row[
                            columnIndexes.month
                        ],
                        rowNumber,
                    );

                if (
                    receivedMonths.has(
                        monthIndex,
                    )
                ) {
                    throw new Error(
                        `${LOSSES_RATE_MONTHS[monthIndex]} aparece mais de uma vez na base.`,
                    );
                }

                receivedMonths.add(
                    monthIndex,
                );

                history[monthIndex] = {
                    possibleLosses:
                        parseLossesRateQuantity(
                            row[
                                columnIndexes
                                    .possibleLosses
                            ],
                            "Possíveis perdas",
                            rowNumber,
                        ),

                    lost:
                        parseLossesRateQuantity(
                            row[
                                columnIndexes.lost
                            ],
                            "Quantidade de LOST",
                            rowNumber,
                        ),

                    damage:
                        parseLossesRateQuantity(
                            row[
                                columnIndexes.damage
                            ],
                            "Quantidade de AVARIA",
                            rowNumber,
                        ),

                    moved:
                        parseLossesRateQuantity(
                            row[
                                columnIndexes.moved
                            ],
                            "Volume movimentado",
                            rowNumber,
                        ),
                };

                importedRows++;
            },
        );

    if (
        importedRows === 0
    ) {
        throw new Error(
            "Nenhum mês foi encontrado na base.",
        );
    }

    return {
        history,
        identification,
        importedRows,
    };
}

function getLossesRateBlockIdentification(
    rows,
) {
    const identificationAliases =
        new Map(
            [
                "description",
                "hubCode",
                "subRegional",
            ].flatMap(
                function (field) {
                    return lossesRateColumnAliases[
                        field
                    ].map(
                        function (alias) {
                            return [
                                alias,
                                field,
                            ];
                        },
                    );
                },
            ),
        );
    const identification = {
        description: "",
        hubCode: "",
        subRegional: "",
    };
    const searchLimit =
        Math.min(
            rows.length,
            50,
        );

    for (
        let rowIndex = 0;
        rowIndex < searchLimit;
        rowIndex += 1
    ) {
        rows[rowIndex].forEach(
            function (
                value,
                columnIndex,
            ) {
                const normalizedValue =
                    normalizeLossesRateColumnName(
                        value,
                    );
                const field =
                    identificationAliases.get(
                        normalizedValue,
                    );

                if (
                    !field ||
                    identification[field]
                ) {
                    return;
                }

                for (
                    let valueRowIndex =
                        rowIndex + 1;
                    valueRowIndex <
                        searchLimit;
                    valueRowIndex += 1
                ) {
                    const receivedValue =
                        String(
                            rows[valueRowIndex]?.[
                                columnIndex
                            ] ?? "",
                        ).trim();

                    if (!receivedValue) {
                        continue;
                    }

                    const normalizedReceivedValue =
                        normalizeLossesRateColumnName(
                            receivedValue,
                        );

                    if (
                        identificationAliases.has(
                            normalizedReceivedValue,
                        )
                    ) {
                        break;
                    }

                    if (
                        receivedValue !== "-" &&
                        receivedValue !== "—"
                    ) {
                        identification[field] =
                            receivedValue;
                    }

                    break;
                }
            },
        );
    }

    return identification;
}

function findLossesRateWorkbookHistory(
    workbook,
) {
    const sheetName =
        workbook?.SheetNames?.find(
            function (receivedSheetName) {
                return normalizeLossesRateColumnName(
                    receivedSheetName,
                ) ===
                    LOSSES_RATE_WORKBOOK_SHEET_NAME;
            },
        );

    if (!sheetName) {
        return null;
    }

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
                    raw: true,
                    blankrows: false,
                },
            );

    const searchLimit =
        Math.min(
            rows.length,
            50,
        );

    let headerRowIndex = -1;

    for (
        let rowIndex = 0;
        rowIndex < searchLimit;
        rowIndex += 1
    ) {
        try {
            getLossesRateColumnIndexes(
                rows[rowIndex],
                {
                    requireIdentification:
                        false,
                },
            );

            headerRowIndex = rowIndex;
            break;
        } catch (error) {
            // Continua procurando o cabeçalho dentro da aba.
        }
    }

    if (headerRowIndex === -1) {
        throw new Error(
            `A aba ${sheetName} não possui as colunas necessárias para a Taxa de Perdas.`,
        );
    }

    const result =
        createLossesRateHistory(
            rows.slice(
                headerRowIndex,
            ),
            {
                requireIdentification:
                    false,
                parseIdentification:
                    false,
            },
        );

    return {
        ...result,
        identification:
            getLossesRateBlockIdentification(
                rows,
            ),
        sourceSheetName:
            sheetName,
    };
}

/* LÊ E CONVERTE A ÁREA DE TRANSFERÊNCIA */

async function readLossesRateClipboardText() {
    if (!navigator.clipboard) {
        throw new Error(
            "A leitura da área de transferência não está disponível neste navegador.",
        );
    }

    let readError = null;

    if (
        typeof navigator.clipboard.readText ===
        "function"
    ) {
        try {
            const text =
                await navigator.clipboard.readText();

            if (text.trim()) {
                return text;
            }
        } catch (error) {
            readError = error;
        }
    }

    if (
        typeof navigator.clipboard.read ===
        "function"
    ) {
        try {
            const items =
                await navigator.clipboard.read();

            for (const item of items) {
                if (
                    !item.types.includes(
                        "text/plain",
                    )
                ) {
                    continue;
                }

                const blob =
                    await item.getType(
                        "text/plain",
                    );

                const text =
                    await blob.text();

                if (text.trim()) {
                    return text;
                }
            }
        } catch (error) {
            readError = error;
        }
    }

    if (
        readError?.name ===
        "NotAllowedError"
    ) {
        throw new Error(
            "O navegador bloqueou a área de transferência. Permita o acesso e clique novamente.",
        );
    }

    throw new Error(
        "A área de transferência está vazia ou não pôde ser lida.",
    );
}

function parseLossesRateClipboardText(
    clipboardText,
) {
    const normalizedText =
        String(
            clipboardText ?? "",
        )
            .replace(/\r\n?/g, "\n")
            .trim();

    if (!normalizedText) {
        throw new Error(
            "A tabela copiada está vazia.",
        );
    }

    const rows =
        normalizedText
            .split("\n")
            .map(
                function (row) {
                    return row.split("\t");
                },
            );

    try {
        return createLossesRateHistory(
            rows,
        );
    } catch (error) {
        let headerRowIndex = -1;

        for (
            let rowIndex = 0;
            rowIndex <
                Math.min(rows.length, 50);
            rowIndex += 1
        ) {
            try {
                getLossesRateColumnIndexes(
                    rows[rowIndex],
                    {
                        requireIdentification:
                            false,
                    },
                );

                headerRowIndex = rowIndex;
                break;
            } catch (headerError) {
                // Continua procurando o cabeçalho copiado.
            }
        }

        if (headerRowIndex === -1) {
            throw error;
        }

        const identification =
            getLossesRateBlockIdentification(
                rows,
            );

        for (
            const {
                key,
                label,
            } of [
                {
                    key: "description",
                    label: "Descrição",
                },
                {
                    key: "hubCode",
                    label: "Código do Hub",
                },
                {
                    key: "subRegional",
                    label: "Sub Regional",
                },
            ]
        ) {
            if (!identification[key]) {
                throw new Error(
                    `O campo ${label} não foi informado na base.`,
                );
            }
        }

        return {
            ...createLossesRateHistory(
                rows.slice(
                    headerRowIndex,
                ),
                {
                    requireIdentification:
                        false,
                    parseIdentification:
                        false,
                },
            ),
            identification,
        };
    }
}

/* FORMATA UMA CÉLULA DA BASE */

function formatLossesRateBaseCell(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(
        value,
    );
}

/* MONTA A BASE ATUALIZADA EM FORMATO TSV */

function createLossesRateUpdatedBaseText() {
    const state =
        getLossesRateState();

    const rows = [
        [
            "Possíveis Perdas",
            "Qtd LOST",
            "Qtd AVARIA",
            "Volume Movimentado",
            "Mês",
            "",
            "Descrição",
            "",
            "",
            "Código do Hub",
            "Sub Regional",
        ],
    ];

    state.months.forEach(
        function (
            month,
            monthIndex,
        ) {
            rows.push([
                formatLossesRateBaseCell(
                    month.possibleLosses,
                ),

                formatLossesRateBaseCell(
                    month.lost,
                ),

                formatLossesRateBaseCell(
                    month.damage,
                ),

                formatLossesRateBaseCell(
                    month.moved,
                ),

                LOSSES_RATE_MONTHS[
                    monthIndex
                ],

                "",

                monthIndex === 0
                    ? state.identification
                        .description
                    : "",

                "",
                "",

                monthIndex === 0
                    ? state.identification
                        .hubCode
                    : "",

                monthIndex === 0
                    ? state.identification
                        .subRegional
                    : "",
            ]);
        },
    );

    return rows
        .map(
            function (row) {
                return row.join(
                    "\t",
                );
            },
        )
        .join(
            "\n",
        );
}

/* COPIA UM TEXTO PARA A ÁREA DE TRANSFERÊNCIA */

async function copyLossesRateText(
    text,
) {
    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {
        await navigator.clipboard.writeText(
            text,
        );

        return;
    }

    const temporaryTextarea =
        document.createElement(
            "textarea",
        );

    temporaryTextarea.value =
        text;

    temporaryTextarea.setAttribute(
        "readonly",
        "",
    );

    temporaryTextarea.style.position =
        "fixed";

    temporaryTextarea.style.opacity =
        "0";

    temporaryTextarea.style.pointerEvents =
        "none";

    document.body.appendChild(
        temporaryTextarea,
    );

    let copied = false;

    try {
        temporaryTextarea.select();

        temporaryTextarea.setSelectionRange(
            0,
            temporaryTextarea.value.length,
        );

        copied =
            document.execCommand(
                "copy",
            );
    } finally {
        temporaryTextarea.remove();
    }

    if (!copied) {
        throw new Error(
            "O navegador não permitiu copiar a base.",
        );
    }
}

/* COPIA A BASE ATUALIZADA */

async function copyLossesRateUpdatedBase(
    button,
) {
    const originalLabel =
        button.textContent.trim();

    button.disabled =
        true;

    try {
        const baseText =
            createLossesRateUpdatedBaseText();

        await copyLossesRateText(
            baseText,
        );

        button.textContent =
            "Base Copiada";
    } catch (error) {
        console.error(
            "Não foi possível copiar a base:",
            error,
        );

        button.textContent =
            "Erro ao Copiar";
    } finally {
        window.setTimeout(
            function () {
                button.textContent =
                    originalLabel;

                button.disabled =
                    false;
            },
            1600,
        );
    }
}

/* INICIALIZA A IMPORTAÇÃO */

async function importLossesRateFromClipboard(
    importButton,
) {
    const originalTitle =
        importButton.title;

    const originalAriaLabel =
        importButton.getAttribute(
            "aria-label",
        );

    importButton.disabled =
        true;

    importButton.title =
        "Importando histórico da área de transferência...";

    importButton.setAttribute(
        "aria-label",
        "Importando histórico da taxa de perdas",
    );

    importButton.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const clipboardText =
            await readLossesRateClipboardText();

        const result =
            parseLossesRateClipboardText(
                clipboardText,
            );

        replaceLossesRateHistory(
            result.history,
            result.identification,
        );

        const monthLabel =
            result.importedRows === 1
                ? "mês importado"
                : "meses importados";

        const successMessage =
            `${result.importedRows} ${monthLabel} da Taxa de Perdas.`;

        setReportNotification({
            reportId: "losses-rate",

            type: "success",
            message: successMessage,
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Não foi possível importar a tabela copiada.";

        console.error(
            "Não foi possível importar o histórico copiado:",
            error,
        );

        setReportNotification({
            reportId: "losses-rate",

            type: "error",
            message:
                `Falha na importação: ${errorMessage}`,
        });
    } finally {
        importButton.title =
            originalTitle;

        if (originalAriaLabel) {
            importButton.setAttribute(
                "aria-label",
                originalAriaLabel,
            );
        }

        importButton.removeAttribute(
            "aria-busy",
        );

        importButton.disabled =
            false;
    }
}

function initializeLossesRateImport(
    rootElement = document,
) {
    const importButton =
        rootElement.querySelector(
            "#lossesRateImportActionButton",
        );

    const copyBaseButton =
        rootElement.querySelector(
            "#lossesRateCopyBaseButton",
        );  

    if (
        !(importButton instanceof HTMLButtonElement)
    ) {
        return false;
    }

    if (
        importButton.dataset
            .lossesRateInitialized ===
        "true"
    ) {
        return true;
    }

    importButton.dataset
        .lossesRateInitialized =
            "true";

    importButton.addEventListener(
        "click",
        function () {
            importLossesRateFromClipboard(
                importButton,
            );
        },
    );

    if (
    copyBaseButton instanceof
        HTMLButtonElement
    ) {
        copyBaseButton.addEventListener(
            "click",
            function () {
                copyLossesRateUpdatedBase(
                    copyBaseButton,
                );
            },
        );
    }

    return true;
}

export {
    createLossesRateHistory,
    findLossesRateWorkbookHistory,
    initializeLossesRateImport,
};
