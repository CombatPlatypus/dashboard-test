import {
    LOSSES_RATE_MONTHS,
} from "./state.js";

const LOSSES_RATE_WORKBOOK_SHEET_NAME =
    "taxa de perdas";

const lossesRateColumnAliases =
    Object.freeze({
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

        month: [
            "mes",
            "month",
        ],
    });

const lossesRateIdentificationAliases =
    Object.freeze({
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
    });

function normalizeLossesRateColumnName(
    value,
) {
    return String(
        value ?? "",
    )
        .trim()
        .toLocaleLowerCase(
            "pt-BR",
        )
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

function getLossesRateColumnIndexes(
    headerRow,
) {
    if (!Array.isArray(headerRow)) {
        return null;
    }

    const headers =
        headerRow.map(
            normalizeLossesRateColumnName,
        );

    const indexes = {};

    for (
        const [
            field,
            aliases,
        ] of Object.entries(
            lossesRateColumnAliases,
        )
    ) {
        const columnIndex =
            findLossesRateColumnIndex(
                headers,
                aliases,
            );

        if (columnIndex === -1) {
            return null;
        }

        indexes[field] =
            columnIndex;
    }

    return indexes;
}

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

    let numericValue = null;

    if (
        /^\d+$/.test(
            receivedValue,
        )
    ) {
        numericValue =
            Number(
                receivedValue,
            );
    } else if (
        /^\d{1,3}(?:[.,]\d{3})+$/.test(
            receivedValue,
        )
    ) {
        numericValue =
            Number(
                receivedValue.replace(
                    /[.,]/g,
                    "",
                ),
            );
    }

    if (
        numericValue !== null &&
        Number.isSafeInteger(
            numericValue,
        ) &&
        numericValue >= 0
    ) {
        return numericValue;
    }

    throw new Error(
        `${fieldName} inválido na linha ${rowNumber}.`,
    );
}

function isLossesRateRowEmpty(
    row,
    columnIndexes,
) {
    return Object.keys(
        lossesRateColumnAliases,
    ).every(
        function (field) {
            return String(
                row?.[
                    columnIndexes[field]
                ] ?? "",
            ).trim() === "";
        },
    );
}

function createLossesRateHistory(
    rows,
    headerRowIndex,
    columnIndexes,
) {
    const history =
        new Array(
            LOSSES_RATE_MONTHS.length,
        );

    const receivedMonths =
        new Set();

    let importedRows = 0;

    for (
        let rowIndex =
            headerRowIndex + 1;
        rowIndex < rows.length;
        rowIndex += 1
    ) {
        const row =
            rows[rowIndex];

        if (
            isLossesRateRowEmpty(
                row,
                columnIndexes,
            )
        ) {
            continue;
        }

        const rowNumber =
            rowIndex + 1;

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
                `${LOSSES_RATE_MONTHS[monthIndex]} aparece mais de uma vez na aba Taxa de Perdas.`,
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

        importedRows += 1;
    }

    if (importedRows === 0) {
        throw new Error(
            "Nenhum mês foi encontrado na aba Taxa de Perdas.",
        );
    }

    return {
        history,
        importedRows,
    };
}

function getLossesRateIdentification(
    rows,
) {
    const aliasesByName =
        new Map(
            Object.entries(
                lossesRateIdentificationAliases,
            ).flatMap(
                function (
                    [
                        field,
                        aliases,
                    ],
                ) {
                    return aliases.map(
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
                const field =
                    aliasesByName.get(
                        normalizeLossesRateColumnName(
                            value,
                        ),
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
                            rows[
                                valueRowIndex
                            ]?.[
                                columnIndex
                            ] ?? "",
                        ).trim();

                    if (!receivedValue) {
                        continue;
                    }

                    if (
                        aliasesByName.has(
                            normalizeLossesRateColumnName(
                                receivedValue,
                            ),
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
                `O campo ${label} não foi informado na aba Taxa de Perdas.`,
            );
        }
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
        throw new Error(
            "O arquivo não possui a aba Taxa de Perdas.",
        );
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
    let columnIndexes = null;

    for (
        let rowIndex = 0;
        rowIndex < searchLimit;
        rowIndex += 1
    ) {
        const receivedIndexes =
            getLossesRateColumnIndexes(
                rows[rowIndex],
            );

        if (receivedIndexes) {
            headerRowIndex =
                rowIndex;

            columnIndexes =
                receivedIndexes;

            break;
        }
    }

    if (
        headerRowIndex === -1 ||
        !columnIndexes
    ) {
        throw new Error(
            `A aba ${sheetName} não possui as colunas necessárias para a Taxa de Perdas.`,
        );
    }

    return {
        ...createLossesRateHistory(
            rows,
            headerRowIndex,
            columnIndexes,
        ),

        identification:
            getLossesRateIdentification(
                rows,
            ),

        sourceSheetName:
            sheetName,
    };
}

export {
    findLossesRateWorkbookHistory,
};
