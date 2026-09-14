import {
    getReceiptLinehaulState,
    replaceReceiptLinehauls,
} from "./linehaul-state.js";

const RECEIPT_LINEHAUL_IMPORT_BUTTON_ID =
    "receiptLinehaulImportButton";

const RECEIPT_LINEHAUL_IMPORT_DEFAULT_TEXT =
    "Importar Viagens de Carga";

const RECEIPT_LINEHAUL_IMPORT_FEEDBACK_DURATION =
    3000;

const RECEIPT_LINEHAUL_CODE_PATTERN =
    /\bLT[A-Z0-9]{8,24}\b/i;

const RECEIPT_LINEHAUL_WINDOW_PATTERN =
    /^(AM|PM1|PM2)$/i;

const RECEIPT_LINEHAUL_PLATE_PATTERN =
    /\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b/i;

let receiptLinehaulImportFeedbackTimer =
    null;

function normalizeReceiptLinehaulImportText(
    value,
) {
    return String(
        value ?? "",
    )
        .normalize(
            "NFD",
        )
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .replace(
            /\u00a0/g,
            " ",
        )
        .replace(
            /\s+/g,
            " ",
        )
        .trim()
        .toLowerCase();
}

function splitReceiptLinehaulImportValues(
    value,
) {
    return String(
        value ?? "",
    )
        .replace(
            /\r/g,
            "",
        )
        .split(
            /\n+/,
        )
        .map(
            function (item) {
                return item
                    .replace(
                        /\u00a0/g,
                        " ",
                    )
                    .replace(
                        /[\t ]+/g,
                        " ",
                    )
                    .trim();
            },
        )
        .filter(Boolean);
}

function getReceiptLinehaulImportCode(
    value,
) {
    const match =
        String(
            value ?? "",
        )
            .toUpperCase()
            .match(
                RECEIPT_LINEHAUL_CODE_PATTERN,
            );

    return match?.[0] || "";
}

function parseReceiptLinehaulImportQuantity(
    value,
) {
    const receivedValue =
        String(
            value ?? "",
        )
            .replace(
                /\u00a0/g,
                " ",
            )
            .trim();

    if (
        !/^\d{1,3}(?:[.\s]\d{3})*$/.test(
            receivedValue,
        ) &&
        !/^\d+$/.test(
            receivedValue,
        )
    ) {
        return null;
    }

    const quantity =
        Number(
            receivedValue.replace(
                /[.\s]/g,
                "",
            ),
        );

    return Number.isSafeInteger(
        quantity,
    )
        ? quantity
        : null;
}

function getReceiptLinehaulLoadedOrders(
    values,
) {
    for (const value of values) {
        const quantity =
            parseReceiptLinehaulImportQuantity(
                value,
            );

        if (quantity !== null) {
            return quantity;
        }
    }

    return null;
}

function getReceiptLinehaulPlainLoadedOrders(
    values,
) {
    const dateTimePattern =
        /^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2}$/;

    let lastDateTimeIndex = -1;

    values.forEach(
        function (
            value,
            index,
        ) {
            if (
                dateTimePattern.test(
                    value,
                )
            ) {
                lastDateTimeIndex =
                    index;
            }
        },
    );

    if (lastDateTimeIndex !== -1) {
        const quantities =
            values
                .slice(
                    lastDateTimeIndex + 1,
                )
                .map(
                    parseReceiptLinehaulImportQuantity,
                )
                .filter(
                    function (value) {
                        return value !== null;
                    },
                );

        if (quantities.length >= 2) {
            return quantities[1];
        }
    }

    const numericValues =
        values.map(
            parseReceiptLinehaulImportQuantity,
        );

    for (
        let firstIndex = 0;
        firstIndex <
            numericValues.length - 1;
        firstIndex += 1
    ) {
        const firstValue =
            numericValues[
                firstIndex
            ];

        const secondValue =
            numericValues[
                firstIndex + 1
            ];

        if (
            firstValue === null ||
            secondValue === null
        ) {
            continue;
        }

        for (
            let repeatedIndex =
                firstIndex + 2;
            repeatedIndex <
                numericValues.length - 1;
            repeatedIndex += 1
        ) {
            if (
                numericValues[
                    repeatedIndex
                ] === firstValue &&
                numericValues[
                    repeatedIndex + 1
                ] === secondValue
            ) {
                return secondValue;
            }
        }
    }

    return null;
}

function getReceiptLinehaulCpt(
    values,
) {
    const receivedValues =
        values
            .flatMap(
                splitReceiptLinehaulImportValues,
            )
            .filter(
                function (value) {
                    return value !== "-";
                },
            );

    const windowValue =
        receivedValues.find(
            function (value) {
                return RECEIPT_LINEHAUL_WINDOW_PATTERN
                    .test(
                        value,
                    );
            },
        );

    return (
        windowValue ||
        receivedValues[0] ||
        ""
    ).toUpperCase();
}

function getReceiptLinehaulVehiclePlate(
    values,
) {
    for (
        const value of values.flatMap(
            splitReceiptLinehaulImportValues,
        )
    ) {
        const match =
            value
                .toUpperCase()
                .match(
                    RECEIPT_LINEHAUL_PLATE_PATTERN,
                );

        if (match) {
            return match[0];
        }
    }

    return values
        .flatMap(
            splitReceiptLinehaulImportValues,
        )
        .find(
            function (value) {
                return value !== "-";
            },
        )
        ?.toUpperCase() || "";
}

function getReceiptLinehaulElementText(
    element,
) {
    const copy =
        element.cloneNode(
            true,
        );

    copy.querySelectorAll(
        "br",
    ).forEach(
        function (breakElement) {
            breakElement.replaceWith(
                "\n",
            );
        },
    );

    return String(
        copy.textContent ?? "",
    )
        .replace(
            /\r/g,
            "",
        )
        .replace(
            /\n[\t ]+/g,
            "\n",
        )
        .trim();
}

function createReceiptLinehaulTableMatrix(
    table,
) {
    const matrix = [];

    Array.from(
        table.rows,
    ).forEach(
        function (
            row,
            rowIndex,
        ) {
            matrix[rowIndex] ||= [];

            let columnIndex = 0;

            Array.from(
                row.cells,
            ).forEach(
                function (cell) {
                    while (
                        matrix[rowIndex][
                            columnIndex
                        ] !== undefined
                    ) {
                        columnIndex += 1;
                    }

                    const rowSpan =
                        Math.max(
                            Number(
                                cell.rowSpan,
                            ) || 1,
                            1,
                        );

                    const columnSpan =
                        Math.max(
                            Number(
                                cell.colSpan,
                            ) || 1,
                            1,
                        );

                    const text =
                        getReceiptLinehaulElementText(
                            cell,
                        );

                    for (
                        let rowOffset = 0;
                        rowOffset < rowSpan;
                        rowOffset += 1
                    ) {
                        const targetRowIndex =
                            rowIndex +
                            rowOffset;

                        matrix[targetRowIndex] ||= [];

                        for (
                            let columnOffset = 0;
                            columnOffset < columnSpan;
                            columnOffset += 1
                        ) {
                            matrix[targetRowIndex][
                                columnIndex +
                                columnOffset
                            ] = text;
                        }
                    }

                    columnIndex +=
                        columnSpan;
                },
            );
        },
    );

    return matrix;
}

function findReceiptLinehaulColumn(
    normalizedRow,
    aliases,
) {
    return normalizedRow.findIndex(
        function (value) {
            return aliases.some(
                function (alias) {
                    return (
                        value === alias ||
                        value.includes(
                            alias,
                        )
                    );
                },
            );
        },
    );
}

function getReceiptLinehaulColumns(
    row,
) {
    const normalizedRow =
        Array.from(
            row,
            normalizeReceiptLinehaulImportText,
        );

    const columns = {
        code:
            findReceiptLinehaulColumn(
                normalizedRow,
                ["numero do lh"],
            ),

        cpt:
            findReceiptLinehaulColumn(
                normalizedRow,
                ["cpt"],
            ),

        loadedOrders:
            findReceiptLinehaulColumn(
                normalizedRow,
                [
                    "pedido carregado",
                    "pedidos carregados",
                ],
            ),

        vehiclePlate:
            findReceiptLinehaulColumn(
                normalizedRow,
                ["placa do veiculo"],
            ),
    };

    return Object.values(
        columns,
    ).every(
        function (index) {
            return index >= 0;
        },
    )
        ? columns
        : null;
}

function createReceiptLinehaulRecord(
    receivedRecord,
) {
    return {
        code:
            receivedRecord.code,

        cpt:
            getReceiptLinehaulCpt(
                receivedRecord.cpt,
            ),

        loadedOrders:
            getReceiptLinehaulLoadedOrders(
                receivedRecord
                    .loadedOrders
                    .flatMap(
                        splitReceiptLinehaulImportValues,
                    ),
            ),

        vehiclePlate:
            getReceiptLinehaulVehiclePlate(
                receivedRecord.vehiclePlate,
            ),
    };
}

function parseReceiptLinehaulMatrix(
    matrix,
) {
    let headerRowIndex = -1;
    let columns = null;

    for (
        let rowIndex = 0;
        rowIndex < matrix.length;
        rowIndex += 1
    ) {
        const receivedColumns =
            getReceiptLinehaulColumns(
                matrix[rowIndex],
            );

        if (receivedColumns) {
            headerRowIndex = rowIndex;
            columns = receivedColumns;
            break;
        }
    }

    if (
        headerRowIndex === -1 ||
        !columns
    ) {
        return [];
    }

    const records = [];
    let currentRecord = null;

    function finishCurrentRecord() {
        if (!currentRecord) {
            return;
        }

        records.push(
            createReceiptLinehaulRecord(
                currentRecord,
            ),
        );

        currentRecord = null;
    }

    matrix
        .slice(
            headerRowIndex + 1,
        )
        .forEach(
            function (row) {
                const code =
                    getReceiptLinehaulImportCode(
                        row[columns.code],
                    );

                if (
                    code &&
                    currentRecord?.code !==
                        code
                ) {
                    finishCurrentRecord();

                    currentRecord = {
                        code,
                        cpt: [],
                        loadedOrders: [],
                        vehiclePlate: [],
                    };
                }

                if (!currentRecord) {
                    return;
                }

                currentRecord.cpt.push(
                    row[columns.cpt] ?? "",
                );

                currentRecord.loadedOrders.push(
                    row[columns.loadedOrders] ?? "",
                );

                currentRecord.vehiclePlate.push(
                    row[columns.vehiclePlate] ?? "",
                );
            },
        );

    finishCurrentRecord();

    return records;
}

function deduplicateReceiptLinehauls(
    records,
) {
    const recordsByCode =
        new Map();

    records.forEach(
        function (record) {
            if (
                record.code &&
                !recordsByCode.has(
                    record.code,
                )
            ) {
                recordsByCode.set(
                    record.code,
                    record,
                );
            }
        },
    );

    return Array.from(
        recordsByCode.values(),
    );
}

function parseReceiptLinehaulSpXHtml(
    html,
) {
    if (
        !html ||
        typeof DOMParser !==
            "function"
    ) {
        return [];
    }

    const documentCopy =
        new DOMParser()
            .parseFromString(
                html,
                "text/html",
            );

    const records = [];

    documentCopy.querySelectorAll(
        "table",
    ).forEach(
        function (table) {
            records.push(
                ...parseReceiptLinehaulMatrix(
                    createReceiptLinehaulTableMatrix(
                        table,
                    ),
                ),
            );
        },
    );

    return deduplicateReceiptLinehauls(
        records,
    );
}

function parseReceiptLinehaulSpXPlainText(
    text,
) {
    const lines =
        String(
            text ?? "",
        )
            .replace(
                /\r/g,
                "",
            )
            .split(
                "\n",
            );

    const tabularMatrix =
        lines.map(
            function (line) {
                return line.split(
                    "\t",
                );
            },
        );

    const tabularRecords =
        parseReceiptLinehaulMatrix(
            tabularMatrix,
        );

    if (tabularRecords.length > 0) {
        return deduplicateReceiptLinehauls(
            tabularRecords,
        );
    }

    const normalizedLines =
        lines.map(
            function (line) {
                return line
                    .replace(
                        /\u00a0/g,
                        " ",
                    )
                    .trim();
            },
        );

    const normalizedText =
        normalizeReceiptLinehaulImportText(
            normalizedLines.join(
                " ",
            ),
        );

    const hasRequiredHeadings =
        normalizedText.includes(
            "numero do lh",
        ) &&
        normalizedText.includes(
            "cpt",
        ) &&
        normalizedText.includes(
            "pedido carregado",
        ) &&
        normalizedText.includes(
            "placa do veiculo",
        );

    if (!hasRequiredHeadings) {
        return [];
    }

    const recordStarts = [];

    normalizedLines.forEach(
        function (
            line,
            index,
        ) {
            const code =
                getReceiptLinehaulImportCode(
                    line,
                );

            if (
                code &&
                line.toUpperCase() ===
                    code
            ) {
                recordStarts.push({
                    code,
                    index,
                });
            }
        },
    );

    const records =
        recordStarts.map(
            function (
                recordStart,
                recordIndex,
            ) {
                const endIndex =
                    recordStarts[
                        recordIndex + 1
                    ]?.index ??
                    normalizedLines.length;

                const values =
                    normalizedLines
                        .slice(
                            recordStart.index + 1,
                            endIndex,
                        )
                        .filter(Boolean);

                return {
                    code:
                        recordStart.code,

                    cpt:
                        getReceiptLinehaulCpt(
                            values,
                        ),

                    loadedOrders:
                        getReceiptLinehaulPlainLoadedOrders(
                            values,
                        ),

                    vehiclePlate:
                        getReceiptLinehaulVehiclePlate(
                            values,
                        ),
                };
            },
        );

    return deduplicateReceiptLinehauls(
        records,
    );
}

async function readReceiptLinehaulClipboard() {
    if (!navigator.clipboard) {
        throw new Error(
            "A leitura da área de transferência não está disponível neste navegador.",
        );
    }

    let html = "";
    let text = "";
    let readError = null;

    if (
        typeof navigator.clipboard.read ===
        "function"
    ) {
        try {
            const items =
                await navigator.clipboard.read();

            for (const item of items) {
                if (
                    !html &&
                    item.types.includes(
                        "text/html",
                    )
                ) {
                    html =
                        await (
                            await item.getType(
                                "text/html",
                            )
                        ).text();
                }

                if (
                    !text &&
                    item.types.includes(
                        "text/plain",
                    )
                ) {
                    text =
                        await (
                            await item.getType(
                                "text/plain",
                            )
                        ).text();
                }
            }
        } catch (error) {
            readError = error;
        }
    }

    if (
        !text &&
        typeof navigator.clipboard.readText ===
            "function"
    ) {
        try {
            text =
                await navigator.clipboard
                    .readText();
        } catch (error) {
            readError = error;
        }
    }

    if (
        !html &&
        !text
    ) {
        if (
            readError?.name ===
            "NotAllowedError"
        ) {
            throw new Error(
                "O navegador bloqueou a área de transferência. Permita o acesso e tente novamente.",
            );
        }

        throw new Error(
            "A área de transferência está vazia ou não pôde ser lida.",
        );
    }

    return {
        html,
        text,
    };
}

function restoreReceiptLinehaulImportButton(
    button,
) {
    if (
        receiptLinehaulImportFeedbackTimer !==
        null
    ) {
        window.clearTimeout(
            receiptLinehaulImportFeedbackTimer,
        );
    }

    receiptLinehaulImportFeedbackTimer =
        window.setTimeout(
            function () {
                button.textContent =
                    RECEIPT_LINEHAUL_IMPORT_DEFAULT_TEXT;

                receiptLinehaulImportFeedbackTimer =
                    null;
            },
            RECEIPT_LINEHAUL_IMPORT_FEEDBACK_DURATION,
        );
}

async function handleReceiptLinehaulClipboardImport(
    event,
) {
    const button =
        event.currentTarget instanceof
            HTMLButtonElement
            ? event.currentTarget
            : null;

    if (!button) {
        return;
    }

    button.disabled = true;
    button.textContent =
        "Lendo área de transferência...";

    try {
        const currentState =
            getReceiptLinehaulState();

        if (
            currentState.linehauls.length > 0 &&
            !window.confirm(
                "A importação substituirá as viagens carregadas atualmente. Deseja continuar?",
            )
        ) {
            button.textContent =
                RECEIPT_LINEHAUL_IMPORT_DEFAULT_TEXT;

            return;
        }

        const clipboard =
            await readReceiptLinehaulClipboard();

        const candidates = [
            {
                format: "HTML",
                records:
                    parseReceiptLinehaulSpXHtml(
                        clipboard.html,
                    ),
            },
            {
                format: "texto",
                records:
                    parseReceiptLinehaulSpXPlainText(
                        clipboard.text,
                    ),
            },
        ];

        const selectedCandidate =
            candidates.reduce(
                function (
                    bestCandidate,
                    candidate,
                ) {
                    return (
                        candidate.records.length >
                        bestCandidate.records.length
                    )
                        ? candidate
                        : bestCandidate;
                },
                candidates[0],
            );

        if (
            selectedCandidate.records.length ===
            0
        ) {
            throw new Error(
                "Não encontrei uma tabela com Número do LH, CPT, Pedido Carregado e Placa do Veículo.",
            );
        }

        replaceReceiptLinehauls(
            selectedCandidate.records,
        );

        button.textContent =
            `${selectedCandidate.records.length} LHs importados`;

        button.title =
            `Importação realizada por ${selectedCandidate.format}.`;

        restoreReceiptLinehaulImportButton(
            button,
        );
    } catch (error) {
        console.error(
            "Falha ao importar os LHs do processamento.",
            error,
        );

        button.textContent =
            "Não foi possível importar";

        window.alert(
            error instanceof Error
                ? error.message
                : "Não foi possível importar as viagens copiadas do SPX.",
        );

        restoreReceiptLinehaulImportButton(
            button,
        );
    } finally {
        button.disabled = false;
    }
}

function initializeReceiptLinehaulImport(
    rootElement = document,
) {
    const button =
        rootElement.querySelector(
            `#${RECEIPT_LINEHAUL_IMPORT_BUTTON_ID}`,
        );

    if (
        !(button instanceof HTMLButtonElement)
    ) {
        return false;
    }

    if (
        button.dataset
            .receiptLinehaulImportInitialized ===
        "true"
    ) {
        return true;
    }

    button.dataset
        .receiptLinehaulImportInitialized =
            "true";

    button.addEventListener(
        "click",
        handleReceiptLinehaulClipboardImport,
    );

    return true;
}

export {
    initializeReceiptLinehaulImport,
    parseReceiptLinehaulSpXHtml,
    parseReceiptLinehaulSpXPlainText,
};
