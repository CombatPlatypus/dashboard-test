import {
    enableReceiptLinehaulManualEntry,
    getReceiptLinehaulState,
    replaceReceiptLinehauls,
} from "./linehaul-state.js";

import {
    createSpXLinehaulWindowCandidates,
    formatSpXLinehaulOrigin,
    getSpXLinehaulPlainLoadedOrders,
    parseSpXLinehaulQuantity,
} from "../core/spx-linehaul-rules.js";

const RECEIPT_LINEHAUL_IMPORT_BUTTON_ID =
    "receiptLinehaulImportButton";

const RECEIPT_LINEHAUL_IMPORT_DEFAULT_TEXT =
    "Importar Viagens de Carga";

const RECEIPT_LINEHAUL_IMPORT_FEEDBACK_DURATION =
    3000;

const RECEIPT_LINEHAUL_IMPORT_EXPECTED_MAXIMUM =
    8;

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
    return parseSpXLinehaulQuantity(
        value,
    );
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

        origin:
            findReceiptLinehaulColumn(
                normalizedRow,
                ["station"],
            ),

        cpt:
            findReceiptLinehaulColumn(
                normalizedRow,
                ["cpt"],
            ),

        punctuality:
            findReceiptLinehaulColumn(
                normalizedRow,
                ["indicador de pontualidade"],
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

    return Object.entries(
        columns,
    )
        .filter(
            function ([key]) {
                return key !==
                    "loadedOrders";
            },
        )
        .every(
            function ([, index]) {
                return index >= 0;
            },
        )
        ? columns
        : null;
}

function createReceiptLinehaulRecord(
    receivedRecord,
) {
    const origin =
        formatSpXLinehaulOrigin(
            receivedRecord.origin
                .flatMap(
                    splitReceiptLinehaulImportValues,
                )
                .find(
                    function (value) {
                        return value !== "-";
                    },
                ) || "",
        );

    const cpt =
        getReceiptLinehaulCpt(
            receivedRecord.cpt,
        );

    const punctualityValues =
        receivedRecord.punctuality
            .flatMap(
                splitReceiptLinehaulImportValues,
            );

    return {
        code:
            receivedRecord.code,

        origin,

        cpt,

        window: cpt,

        waiting:
            punctualityValues.some(
                function (value) {
                    return (
                        normalizeReceiptLinehaulImportText(
                            value,
                        ) === "waiting"
                    );
                },
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
                        origin: [],
                        cpt: [],
                        punctuality: [],
                        loadedOrders: [],
                        vehiclePlate: [],
                    };
                }

                if (!currentRecord) {
                    return;
                }

                currentRecord.origin.push(
                    row[columns.origin] ?? "",
                );

                currentRecord.cpt.push(
                    row[columns.cpt] ?? "",
                );

                currentRecord.punctuality.push(
                    row[columns.punctuality] ??
                        "",
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

    return records;
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
        return tabularRecords;
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
            "station",
        ) &&
        normalizedText.includes(
            "cpt",
        ) &&
        normalizedText.includes(
            "indicador de pontualidade",
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

                const cpt =
                    getReceiptLinehaulCpt(
                        values,
                    );

                const origin =
                    formatSpXLinehaulOrigin(
                        values.find(
                            function (value) {
                                return /^\[[^\]]+\]\s*\S+/.test(
                                    value,
                                );
                            },
                        ) || "",
                    );

                return {
                    code:
                        recordStart.code,

                    origin,

                    cpt,

                    window: cpt,

                    waiting:
                        values.some(
                            function (value) {
                                return (
                                    normalizeReceiptLinehaulImportText(
                                        value,
                                    ) ===
                                    "waiting"
                                );
                            },
                        ),

                    loadedOrders:
                        getSpXLinehaulPlainLoadedOrders(
                            values,
                        ),

                    vehiclePlate:
                        getReceiptLinehaulVehiclePlate(
                            values,
                        ),
                };
            },
        );

    return records;
}

function getReceiptLinehaulImportWindowModalElements() {
    return {
        modal:
            document.getElementById(
                "receiptLinehaulImportWindowModal",
            ),

        description:
            document.getElementById(
                "receiptLinehaulImportWindowDescription",
            ),

        options:
            document.getElementById(
                "receiptLinehaulImportWindowOptions",
            ),

        confirmButton:
            document.getElementById(
                "receiptLinehaulImportWindowConfirm",
            ),

        cancelButton:
            document.getElementById(
                "receiptLinehaulImportWindowCancel",
            ),
    };
}

function requestReceiptLinehaulImportWindow(
    windowCandidates,
) {
    const elements =
        getReceiptLinehaulImportWindowModalElements();

    if (
        !(elements.modal instanceof HTMLElement) ||
        !(elements.description instanceof HTMLElement) ||
        !(elements.options instanceof HTMLElement) ||
        !(
            elements.confirmButton instanceof
            HTMLButtonElement
        ) ||
        !(
            elements.cancelButton instanceof
            HTMLButtonElement
        ) ||
        typeof window.jQuery !== "function" ||
        typeof window.Foundation?.Reveal !==
            "function"
    ) {
        throw new Error(
            "O modal de seleção de janela não pôde ser inicializado.",
        );
    }

    const firstAvailableWindow =
        windowCandidates.find(
            function (candidate) {
                return candidate
                    .selection
                    .records
                    .length > 0;
            },
        )?.window || "";

    elements.description.textContent =
        "Foram encontradas mais de uma janela. Escolha qual delas será usada nos descarregamentos.";

    const optionElements =
        windowCandidates.map(
            function (candidate) {
                const wrapper =
                    document.createElement(
                        "div",
                    );

                const input =
                    document.createElement(
                        "input",
                    );

                const label =
                    document.createElement(
                        "label",
                    );

                const inputId =
                    `receiptLinehaulImportWindow${candidate.window}`;

                const linehaulQuantity =
                    candidate
                        .selection
                        .records
                        .length;

                input.type = "radio";
                input.name =
                    "receiptLinehaulImportWindow";
                input.id = inputId;
                input.value = candidate.window;
                input.disabled =
                    linehaulQuantity === 0;
                input.checked =
                    candidate.window ===
                    firstAvailableWindow;

                label.htmlFor = inputId;
                label.textContent =
                    linehaulQuantity === 1
                        ? `${candidate.window} — 1 LH válido`
                        : `${candidate.window} — ${linehaulQuantity} LHs válidos`;

                wrapper.append(
                    input,
                    label,
                );

                return wrapper;
            },
        );

    elements.options.replaceChildren(
        ...optionElements,
    );

    elements.confirmButton.disabled =
        !firstAvailableWindow;

    const modalQuery =
        window.jQuery(
            elements.modal,
        );

    const modalInstance =
        modalQuery.data(
            "zfPlugin",
        ) ||
        new window.Foundation.Reveal(
            modalQuery,
        );

    return new Promise(
        function (resolve) {
            let finished = false;

            function cleanup() {
                elements.confirmButton
                    .removeEventListener(
                        "click",
                        handleConfirm,
                    );

                elements.cancelButton
                    .removeEventListener(
                        "click",
                        handleCancel,
                    );

                modalQuery.off(
                    "closed.zf.reveal",
                    handleClosed,
                );
            }

            function finish(
                windowValue,
                closeModal = true,
            ) {
                if (finished) {
                    return;
                }

                finished = true;
                cleanup();

                if (closeModal) {
                    modalInstance.close();
                }

                resolve(windowValue);
            }

            function handleConfirm() {
                const selectedInput =
                    elements.options
                        .querySelector(
                            'input[name="receiptLinehaulImportWindow"]:checked',
                        );

                finish(
                    selectedInput?.value ||
                        "",
                );
            }

            function handleCancel() {
                finish("");
            }

            function handleClosed() {
                finish(
                    "",
                    false,
                );
            }

            elements.confirmButton
                .addEventListener(
                    "click",
                    handleConfirm,
                );

            elements.cancelButton
                .addEventListener(
                    "click",
                    handleCancel,
                );

            modalQuery.on(
                "closed.zf.reveal",
                handleClosed,
            );

            modalInstance.open();
        },
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
        const clipboard =
            await readReceiptLinehaulClipboard();

        const htmlRecords =
            parseReceiptLinehaulSpXHtml(
                clipboard.html,
            );

        const plainTextRecords =
            parseReceiptLinehaulSpXPlainText(
                clipboard.text,
            );

        const loadedOrdersByCode =
            new Map();

        [
            ...htmlRecords,
            ...plainTextRecords,
        ].forEach(
            function (record) {
                const code =
                    getReceiptLinehaulImportCode(
                        record.code,
                    );

                const loadedOrders =
                    parseReceiptLinehaulImportQuantity(
                        record.loadedOrders,
                    );

                if (
                    code &&
                    loadedOrders !== null
                ) {
                    loadedOrdersByCode.set(
                        code,
                        loadedOrders,
                    );
                }
            },
        );

        [
            htmlRecords,
            plainTextRecords,
        ].forEach(
            function (records) {
                records.forEach(
                    function (record) {
                        if (
                            parseReceiptLinehaulImportQuantity(
                                record.loadedOrders,
                            ) !== null
                        ) {
                            return;
                        }

                        const code =
                            getReceiptLinehaulImportCode(
                                record.code,
                            );

                        if (
                            loadedOrdersByCode.has(
                                code,
                            )
                        ) {
                            record.loadedOrders =
                                loadedOrdersByCode.get(
                                    code,
                                );
                        }
                    },
                );
            },
        );

        const importCandidates = [
            {
                format: "HTML",
                records: htmlRecords,
            },
            {
                format: "texto",
                records: plainTextRecords,
            },
        ]
            .filter(
                function (candidate) {
                    return candidate
                        .records
                        .length > 0;
                },
            )
            .map(
                function (candidate) {
                    const windowCandidates =
                        createSpXLinehaulWindowCandidates(
                            candidate.records,
                        );

                    return {
                        ...candidate,
                        windowCandidates,
                        validLinehaulQuantity:
                            windowCandidates.reduce(
                                function (
                                    total,
                                    windowCandidate,
                                ) {
                                    return total +
                                        windowCandidate
                                            .selection
                                            .records
                                            .length;
                                },
                                0,
                            ),
                    };
                },
            );

        if (importCandidates.length === 0) {
            throw new Error(
                "Não encontrei uma tabela com Número do LH, Station, Indicador de Pontualidade, CPT e Placa do Veículo.",
            );
        }

        const selectedCandidate =
            importCandidates.reduce(
                function (
                    bestCandidate,
                    candidate,
                ) {
                    return (
                        candidate
                            .validLinehaulQuantity >
                        bestCandidate
                            .validLinehaulQuantity
                    )
                        ? candidate
                        : bestCandidate;
                },
                importCandidates[0],
            );

        if (
            selectedCandidate
                .windowCandidates
                .length === 0
        ) {
            throw new Error(
                "Não foi possível identificar nenhuma janela CPT nos dados copiados.",
            );
        }

        const validWindowCandidates =
            selectedCandidate
                .windowCandidates
                .filter(
                    function (candidate) {
                        return candidate
                            .selection
                            .records
                            .length > 0;
                    },
                );

        if (validWindowCandidates.length === 0) {
            throw new Error(
                "Nenhuma das janelas encontradas possui um agrupamento válido de LHs.",
            );
        }

        let selectedWindow =
            validWindowCandidates[0]
                .window;

        if (validWindowCandidates.length > 1) {
            button.textContent =
                "Escolha a janela...";

            selectedWindow =
                await requestReceiptLinehaulImportWindow(
                    validWindowCandidates,
                );

            if (!selectedWindow) {
                button.textContent =
                    RECEIPT_LINEHAUL_IMPORT_DEFAULT_TEXT;

                return;
            }
        }

        const selection =
            validWindowCandidates.find(
                function (candidate) {
                    return candidate.window ===
                        selectedWindow;
                },
            )?.selection;

        if (
            !selection ||
            selection.records.length === 0
        ) {
            throw new Error(
                `A janela ${selectedWindow} não possui pelo menos dois LHs consecutivos com o mesmo CPT.`,
            );
        }

        if (
            selection.records.length >
            RECEIPT_LINEHAUL_IMPORT_EXPECTED_MAXIMUM
        ) {
            const shouldContinue =
                window.confirm(
                    `Foram encontrados ${selection.records.length} LHs no bloco da janela ${selection.targetWindow}. Normalmente a lista possui até ${RECEIPT_LINEHAUL_IMPORT_EXPECTED_MAXIMUM}. Deseja importar todos mesmo assim?`,
                );

            if (!shouldContinue) {
                button.textContent =
                    RECEIPT_LINEHAUL_IMPORT_DEFAULT_TEXT;

                return;
            }
        }

        const currentState =
            getReceiptLinehaulState();

        if (
            currentState.linehauls.some(
                function (linehaul) {
                    return Boolean(
                        linehaul.code,
                    );
                },
            ) &&
            !window.confirm(
                "A importação substituirá as viagens carregadas atualmente. Deseja continuar?",
            )
        ) {
            button.textContent =
                RECEIPT_LINEHAUL_IMPORT_DEFAULT_TEXT;

            return;
        }

        replaceReceiptLinehauls(
            selection.records,
        );

        button.textContent =
            `${selection.records.length} LHs importados — ${selection.targetWindow}`;

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

        enableReceiptLinehaulManualEntry();

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
