import {
    LOSSES_RATE_MONTHS,
    getLossesRateState,
    replaceLossesRateHistory,
} from "./losses-rate-state.js";

import {
    setReportNotification,
} from "./report-notifications.js";

const LOSSES_RATE_IMPORT_FEEDBACK_DURATION =
    1800;

/* NOMES ACEITOS PARA AS COLUNAS */

const lossesRateColumnAliases = {
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
                    return index === -1;
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
) {
    return row.every(
        function (value) {
            return String(
                value ?? "",
            ).trim() === "";
        },
    );
}

/* CONVERTE AS LINHAS EM HISTÓRICO */

function createLossesRateHistory(
    rows,
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
        );

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
        importedRows,
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

    return createLossesRateHistory(
        rows,
    );
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
    const originalLabel =
        importButton.textContent.trim();

    const originalTitle =
        importButton.title;

    importButton.disabled =
        true;

    importButton.textContent =
        "Importando...";

    try {
        const clipboardText =
            await readLossesRateClipboardText();

        const result =
            parseLossesRateClipboardText(
                clipboardText,
            );

        replaceLossesRateHistory(
            result.history,
        );

        const monthLabel =
            result.importedRows === 1
                ? "mês importado"
                : "meses importados";

        const successMessage =
            `${result.importedRows} ${monthLabel} da Taxa de Perdas.`;

        importButton.textContent =
            "Importação Concluída";

        importButton.title =
            successMessage;

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

        importButton.textContent =
            "Erro na Importação";

        importButton.title =
            errorMessage;

        setReportNotification({
            reportId: "losses-rate",

            type: "error",
            message:
                `Falha na importação: ${errorMessage}`,
        });
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
            LOSSES_RATE_IMPORT_FEEDBACK_DURATION,
        );
    }
}

function initializeLossesRateImport() {
    const importButton =
        document.getElementById(
            "lossesRateImportHistoryButton",
        );

    const copyBaseButton =
        document.getElementById(
            "lossesRateCopyBaseButton",
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
    initializeLossesRateImport,
};
