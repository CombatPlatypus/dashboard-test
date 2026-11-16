import {
    getPlanningState,
    replacePlanningLhs,
} from "./state.js";

import {
    SPX_LINEHAUL_SCHEDULE_MESSAGE,
    createSpXLinehaulWindowCandidates,
    formatSpXLinehaulOrigin,
    getSpXDetectedWindows as getPlanningSpXDetectedWindows,
    getSpXLinehaulPlainLoadedOrders,
    getSpXLinehaulPlainScheduledDate,
    getSpXLinehaulScheduleColumns,
    getSpXLinehaulScheduledDate,
    getSpXLinehaulWindow,
    hasSpXLinehaulPlainScheduleLayout,
    parseSpXLinehaulQuantity,
    parseSpXLinehaulTextMatrix,
    selectSpXLinehaulRecords,
} from "../core/spx-linehaul-rules.js";

import {
    setReportNotification,
} from "../report-notifications.js";

const PLANNING_IMPORT_BUTTON_ID =
    "planningImportClipboardButton";

const PLANNING_IMPORT_DEFAULT_TEXT =
    "Importar LHs da área de transferência";

const PLANNING_IMPORT_SOURCE =
    "spx-clipboard";

const PLANNING_IMPORT_SUCCESS_DURATION =
    3000;

const PLANNING_SPX_LH_PATTERN =
    /\bLT[A-Z0-9]{8,24}\b/i;

let planningImportFeedbackTimer =
    null;

/* NORMALIZA UM TEXTO PARA COMPARAÇÃO */

function normalizePlanningImportText(
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

/* SEPARA OS VALORES INTERNOS DE UMA CÉLULA */

function splitPlanningImportValues(
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
        .filter(
            Boolean,
        );
}

/* VERIFICA SE A AÇÃO É APENAS VISUALIZAR */

function hasPlanningImportVisualizeAction(
    values,
) {
    const receivedValues =
        Array.isArray(
            values,
        )
            ? values
            : [
                values,
            ];

    return receivedValues
        .flatMap(
            splitPlanningImportValues,
        )
        .some(
            function (value) {
                return (
                    normalizePlanningImportText(
                        value,
                    ) === "visualizar"
                );
            },
        );
}

/* LOCALIZA O CÓDIGO DE UM LH */

function getPlanningImportLhCode(
    value,
) {
    const match =
        String(
            value ?? "",
        )
            .toUpperCase()
            .match(
                PLANNING_SPX_LH_PATTERN,
            );

    return match?.[0] || "";
}

/* CONVERTE UMA QUANTIDADE DO SPX */

function parsePlanningImportQuantity(
    value,
) {
    return parseSpXLinehaulQuantity(
        value,
    );
}

/* IDENTIFICA A JANELA EXPLÍCITA */

function getPlanningImportWindow(
    values,
) {
    return getSpXLinehaulWindow(
        values,
    );
}

/* LÊ O TEXTO DE UMA CÉLULA */

function getPlanningImportElementText(
    element,
) {
    const copy =
        element.cloneNode(
            true,
        );

    copy
        .querySelectorAll(
            "br",
        )
        .forEach(
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

/* EXPANDE ROWSPAN E COLSPAN */

function createPlanningImportTableMatrix(
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
                        getPlanningImportElementText(
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

                        matrix[targetRowIndex] ||=
                            [];

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

/* LOCALIZA AS COLUNAS NECESSÁRIAS */

function getPlanningImportColumns(
    row,
) {
    const normalizedRow =
        Array.from(
            row,
            normalizePlanningImportText,
        );

    function findColumn(
        expectedText,
    ) {
        return normalizedRow.findIndex(
            function (value) {
                return (
                    value === expectedText ||
                    value.includes(
                        expectedText,
                    )
                );
            },
        );
    }

    const columns = {
        code:
            findColumn(
                "numero do lh",
            ),

        origin:
            findColumn(
                "station",
            ),

        punctuality:
            findColumn(
                "indicador de pontualidade",
            ),

        cpt:
            findColumn(
                "cpt",
            ),

        schedule: getSpXLinehaulScheduleColumns(normalizedRow),

        tripName:
            findColumn(
                "nome da viagem",
            ),

        quantity:
            findColumn(
                "pedido carregado",
            ),

        action:
            findColumn(
                "acao",
            ),
    };

    const hasAllColumns =
        Object.entries(
            columns,
        )
            .filter(
                function ([key]) {
                    return ![
                        "quantity",
                        "action",
                        "tripName",
                        "schedule",
                    ].includes(
                        key,
                    );
                },
            )
            .every(
                function ([, index]) {
                    return index >= 0;
                },
            );

    return hasAllColumns
        ? columns
        : null;
}

/* CRIA UM REGISTRO A PARTIR DO HTML */

function createPlanningImportHtmlRecord(
    receivedRecord,
) {
    const origin =
        formatSpXLinehaulOrigin(
            receivedRecord.origin
                .flatMap(
                    splitPlanningImportValues,
                )
                .find(
                    function (value) {
                        return value !== "-";
                    },
                ) || "",
        );

    const punctualityValues =
        receivedRecord.punctuality
            .flatMap(
                splitPlanningImportValues,
            );

    const cptValues =
        receivedRecord.cpt
            .flatMap(
                splitPlanningImportValues,
            );

    const tripNameValues =
        receivedRecord.tripName
            .flatMap(
                splitPlanningImportValues,
            );

    const hideQuantity =
        hasPlanningImportVisualizeAction(
            receivedRecord.action,
        );

    const quantity =
        hideQuantity
            ? null
            : receivedRecord.quantity
                .flatMap(
                    splitPlanningImportValues,
                )
                .map(
                    parsePlanningImportQuantity,
                )
                .find(
                    function (value) {
                        return value !== null;
                    },
                ) ?? null;

    return {
        code:
            receivedRecord.code,

        origin,

        quantity,
        hideQuantity,
        scheduledDate: getSpXLinehaulScheduledDate(receivedRecord.schedule),

        window:
            getPlanningImportWindow(
                [
                    ...cptValues,
                    ...tripNameValues,
                ],
            ),

        waiting:
            punctualityValues.some(
                function (value) {
                    return (
                        normalizePlanningImportText(
                            value,
                        ) === "waiting"
                    );
                },
            ),
    };
}

/* EXTRAI OS REGISTROS DE UMA MATRIZ TABULAR */

function parsePlanningImportMatrix(
    matrix,
) {
    let headerRowIndex =
        -1;

    let columns =
        null;

    for (
        let rowIndex = 0;
        rowIndex < matrix.length;
        rowIndex += 1
    ) {
        const receivedColumns =
            getPlanningImportColumns(
                matrix[rowIndex],
            );

        if (receivedColumns) {
            headerRowIndex =
                rowIndex;

            columns =
                receivedColumns;

            break;
        }
    }

    if (
        headerRowIndex === -1 ||
        !columns
    ) {
        return [];
    }

    const parsedRecords = [];
    let currentRecord = null;

    function finishCurrentRecord() {
        if (!currentRecord) {
            return;
        }

        parsedRecords.push(
            createPlanningImportHtmlRecord(
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
                    getPlanningImportLhCode(
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
                        punctuality: [],
                        cpt: [],
                        schedule: [],
                        tripName: [],
                        quantity: [],
                        action: [],
                    };
                }

                if (!currentRecord) {
                    return;
                }

                currentRecord.origin.push(
                    row[columns.origin] ?? "",
                );

                currentRecord.punctuality.push(
                    row[columns.punctuality] ??
                        "",
                );

                currentRecord.cpt.push(
                    row[columns.cpt] ?? "",
                );
                for (const column of columns.schedule) currentRecord.schedule.push(row[column]);

                currentRecord.tripName.push(
                    columns.tripName >= 0
                        ? row[columns.tripName] ?? ""
                        : "",
                );

                currentRecord.quantity.push(
                    row[columns.quantity] ?? "",
                );

                currentRecord.action.push(
                    columns.action >= 0
                        ? row[columns.action] ?? ""
                        : "",
                );
            },
        );

    finishCurrentRecord();

    return parsedRecords;
}

/* EXTRAI OS REGISTROS DO HTML */

function parsePlanningSpXHtml(
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

    const parsedRecords = [];

    documentCopy
        .querySelectorAll(
            "table",
        )
        .forEach(
            function (table) {
                parsedRecords.push(
                    ...parsePlanningImportMatrix(
                        createPlanningImportTableMatrix(
                            table,
                        ),
                    ),
                );
            },
        );

    return parsedRecords;
}

/* LOCALIZA A QUANTIDADE NO TEXTO PURO */

function getPlanningImportPlainQuantity(
    values,
) {
    if (
        hasPlanningImportVisualizeAction(
            values,
        )
    ) {
        return null;
    }

    return getSpXLinehaulPlainLoadedOrders(
        values,
    );
}

/* EXTRAI OS REGISTROS DO TEXTO PURO */

function parsePlanningSpXPlainText(
    text,
) {
    const source = String(text ?? "").replace(/\r/g, "");
    const tabularRecords = parsePlanningImportMatrix(parseSpXLinehaulTextMatrix(source));

    if (tabularRecords.length > 0) {
        return tabularRecords;
    }

    const lines =
        source.split("\n")
            .map(
                function (line) {
                    return line
                        .replace(
                            /\u00a0/g,
                            " ",
                        )
                        .replace(
                            /\t+/g,
                            " ",
                        )
                        .trim();
                },
            );

    const normalizedText =
        normalizePlanningImportText(
            lines.join(
                " ",
            ),
        );

    const requiredHeadings = [
        "numero do lh",
        "indicador de pontualidade",
        "cpt",
    ];

    const hasRequiredHeadings =
        requiredHeadings.every(
            function (heading) {
                return normalizedText
                    .includes(
                        heading,
                    );
            },
        );

    if (!hasRequiredHeadings) {
        return [];
    }

    const recordStarts = [];

    lines.forEach(
        function (
            line,
            index,
        ) {
            const code =
                getPlanningImportLhCode(
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

    const headings = normalizePlanningImportText(lines.slice(0, recordStarts[0]?.index ?? 0).join(" "));
    const hasScheduleLayout = hasSpXLinehaulPlainScheduleLayout(headings);
    return recordStarts.map(
        function (
            recordStart,
            recordIndex,
        ) {
            const endIndex =
                recordStarts[
                    recordIndex + 1
                ]?.index ??
                lines.length;

            const rawValues = lines.slice(recordStart.index + 1, endIndex);
            const values = rawValues.filter(Boolean);

            const origin =
                formatSpXLinehaulOrigin(
                    values.find(
                        function (value) {
                            return /^\[\d+\]\s*\S+/.test(
                                value,
                            );
                        },
                    ) || "",
                );

            return {
                code:
                    recordStart.code,

                origin,

                quantity:
                    getPlanningImportPlainQuantity(
                        values,
                    ),

                hideQuantity:
                    hasPlanningImportVisualizeAction(
                        values,
                    ),

                scheduledDate: getSpXLinehaulPlainScheduledDate(rawValues, hasScheduleLayout),

                window:
                    getPlanningImportWindow(
                        values,
                    ),

                waiting:
                    values.some(
                        function (value) {
                            return (
                                normalizePlanningImportText(
                                    value,
                                ) ===
                                "waiting"
                            );
                        },
                    ),
            };
        },
    );
}

/* CONVERTE A SELEÇÃO COMPARTILHADA EM DADOS DE PLANEJAMENTO */

function createPlanningSpXSelection({ records, ...selectionDetails }) {
    let includedWaiting = 0;
    let includedWithoutQuantity = 0;
    let includedWithoutWindow = 0;
    const lhs = records.map(record => {
        const quantity = parsePlanningImportQuantity(record.quantity);
        if (record.waiting) includedWaiting += 1;
        if (quantity === null) includedWithoutQuantity += 1;
        if (!record.window) includedWithoutWindow += 1;
        return { code: record.code, origin: formatSpXLinehaulOrigin(record.origin), quantity };
    });
    return { ...selectionDetails, lhs, includedWaiting, includedWithoutQuantity, includedWithoutWindow };
}

function selectPlanningSpXLhs(records, targetWindow, referenceDate) {
    return createPlanningSpXSelection(selectSpXLinehaulRecords(records, targetWindow, referenceDate));
}

function createPlanningSpXWindowCandidates(records, referenceDate) {
    return createSpXLinehaulWindowCandidates(records, referenceDate).map(({ window, selection }) => ({
        window,
        selection: createPlanningSpXSelection(selection),
    }));
}

/* LOCALIZA OS ELEMENTOS DO MODAL */

function getPlanningImportWindowModalElements() {
    return {
        modal:
            document.getElementById(
                "planningImportWindowModal",
            ),

        description:
            document.getElementById(
                "planningImportWindowDescription",
            ),

        options:
            document.getElementById(
                "planningImportWindowOptions",
            ),

        confirmButton:
            document.getElementById(
                "planningImportWindowConfirm",
            ),

        cancelButton:
            document.getElementById(
                "planningImportWindowCancel",
            ),
    };
}

/* ABRE O MODAL FOUNDATION */

function requestPlanningImportWindow(
    windowCandidates,
) {
    const elements =
        getPlanningImportWindowModalElements();

    if (
        !(
            elements.modal instanceof
            HTMLElement
        ) ||
        !(
            elements.description instanceof
            HTMLElement
        ) ||
        !(
            elements.options instanceof
            HTMLElement
        ) ||
        !(
            elements.confirmButton instanceof
            HTMLButtonElement
        ) ||
        !(
            elements.cancelButton instanceof
            HTMLButtonElement
        ) ||
        typeof window.jQuery !==
            "function" ||
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
                return (
                    candidate
                        .selection
                        .lhs
                        .length > 0
                );
            },
        )?.window || "";

    elements.description.textContent =
        "Foram encontradas mais de uma janela. Escolha qual delas será usada no planejamento.";

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
                    `planningImportWindow${candidate.window}`;

                const lhQuantity =
                    candidate
                        .selection
                        .lhs
                        .length;

                input.type =
                    "radio";

                input.name =
                    "planningImportWindow";

                input.id =
                    inputId;

                input.value =
                    candidate.window;

                input.disabled =
                    lhQuantity === 0;

                /*
                 * A primeira janela válida
                 * fica selecionada por padrão.
                 */

                input.checked =
                    candidate.window ===
                    firstAvailableWindow;

                label.htmlFor =
                    inputId;

                label.textContent =
                    lhQuantity === 1
                        ? `${candidate.window} — 1 LH válido`
                        : `${candidate.window} — ${lhQuantity} LHs válidos`;

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

                resolve(
                    windowValue,
                );
            }

            function handleConfirm() {
                const selectedInput =
                    elements.options
                        .querySelector(
                            'input[name="planningImportWindow"]:checked',
                        );

                finish(
                    selectedInput?.value ||
                    "",
                );
            }

            function handleCancel() {
                finish(
                    "",
                );
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

/* LÊ A ÁREA DE TRANSFERÊNCIA */

async function readPlanningClipboard() {
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

            for (
                const item of items
            ) {
                if (
                    !html &&
                    item.types.includes(
                        "text/html",
                    )
                ) {
                    const htmlBlob =
                        await item.getType(
                            "text/html",
                        );

                    html =
                        await htmlBlob.text();
                }

                if (
                    !text &&
                    item.types.includes(
                        "text/plain",
                    )
                ) {
                    const textBlob =
                        await item.getType(
                            "text/plain",
                        );

                    text =
                        await textBlob.text();
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
                "O navegador bloqueou a área de transferência. Permita o acesso e clique em importar novamente.",
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

/* VERIFICA SE JÁ EXISTEM DADOS */

function hasPlanningImportReplacementData() {
    return getPlanningState()
        .lhs
        .some(
            function (lh) {
                return Boolean(
                    lh.code.trim() ||
                    lh.origin.trim() ||
                    lh.quantity !== null,
                );
            },
        );
}

/* RESTAURA O TEXTO DO BOTÃO */

function restorePlanningImportButton(
    button,
) {
    if (
        planningImportFeedbackTimer !==
        null
    ) {
        window.clearTimeout(
            planningImportFeedbackTimer,
        );
    }

    planningImportFeedbackTimer =
        window.setTimeout(
            function () {
                button.title =
                    button.dataset
                        .planningImportDefaultTitle ||
                    PLANNING_IMPORT_DEFAULT_TEXT;

                button.setAttribute(
                    "aria-label",
                    button.dataset
                        .planningImportDefaultAriaLabel ||
                    PLANNING_IMPORT_DEFAULT_TEXT,
                );

                planningImportFeedbackTimer =
                    null;
            },
            PLANNING_IMPORT_SUCCESS_DURATION,
        );
}

/* IMPORTA OS LHS */

async function handlePlanningClipboardImport(
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

    if (
        planningImportFeedbackTimer !==
        null
    ) {
        window.clearTimeout(
            planningImportFeedbackTimer,
        );

        planningImportFeedbackTimer =
            null;
    }

    button.disabled = true;

    button.removeAttribute(
        "title",
    );

    button.title =
        "Lendo área de transferência...";

    button.setAttribute(
        "aria-label",
        "Lendo área de transferência",
    );

    button.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const clipboard =
            await readPlanningClipboard();

        const htmlRecords =
            parsePlanningSpXHtml(
                clipboard.html,
            );

        const plainTextRecords =
            parsePlanningSpXPlainText(
                clipboard.text,
            );

        const quantityByCode =
            new Map();

        [
            ...htmlRecords,
            ...plainTextRecords,
        ].forEach(
            function (record) {
                if (record.hideQuantity) {
                    return;
                }

                const code =
                    getPlanningImportLhCode(
                        record.code,
                    );

                const quantity =
                    parsePlanningImportQuantity(
                        record.quantity,
                    );

                if (
                    code &&
                    quantity !== null
                ) {
                    quantityByCode.set(
                        code,
                        quantity,
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
                            record.hideQuantity ||
                            parsePlanningImportQuantity(
                                record.quantity,
                            ) !== null
                        ) {
                            return;
                        }

                        const code =
                            getPlanningImportLhCode(
                                record.code,
                            );

                        if (
                            quantityByCode.has(
                                code,
                            )
                        ) {
                            record.quantity =
                                quantityByCode.get(
                                    code,
                                );
                        }
                    },
                );
            },
        );

        const referenceDate = new Date();
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
                    return (
                        candidate
                            .records
                            .length > 0
                    );
                },
            )
            .map(
                function (candidate) {
                    const windowCandidates =
                        createPlanningSpXWindowCandidates(
                            candidate.records,
                            referenceDate,
                        );

                    return {
                        ...candidate,

                        windowCandidates,

                        validLhQuantity:
                            windowCandidates.reduce(
                                function (
                                    total,
                                    windowCandidate,
                                ) {
                                    return (
                                        total +
                                        windowCandidate
                                            .selection
                                            .lhs
                                            .length
                                    );
                                },
                                0,
                            ),
                    };
                },
            );

        if (
            importCandidates.length === 0
        ) {
            throw new Error(
                "Não encontrei a tabela de viagens do SPX. Abra a lista, pressione Ctrl+A e Ctrl+C e tente novamente.",
            );
        }

        /*
         * Escolhe o formato que encontrou
         * mais LHs válidos.
         */

        const selectedCandidate =
            importCandidates.reduce(
                function (
                    bestCandidate,
                    candidate,
                ) {
                    if (!bestCandidate) {
                        return candidate;
                    }

                    return (
                        candidate
                            .validLhQuantity >
                        bestCandidate
                            .validLhQuantity
                    )
                        ? candidate
                        : bestCandidate;
                },
                null,
            );

        const importFormat =
            selectedCandidate.format;

        if (
            selectedCandidate
                .windowCandidates
                .length === 0
        ) {
            throw new Error(
                "Não foi possível identificar nenhuma janela CPT nos dados copiados.",
            );
        }

        /*
         * A primeira janela encontrada
         * é usada inicialmente.
         */

        const validWindowCandidates =
            selectedCandidate
                .windowCandidates
                .filter(
                    function (candidate) {
                        return candidate
                            .selection
                            .lhs
                            .length > 0;
                    },
                );

        if (
            validWindowCandidates
                .length === 0
        ) {
            const needsSchedule = selectedCandidate.windowCandidates.some(({ selection }) => selection.skippedScheduleGroups > 0);
            throw new Error(needsSchedule ? SPX_LINEHAUL_SCHEDULE_MESSAGE
                : "Nenhuma das janelas encontradas possui um agrupamento válido de LHs.");
        }

        let selectedWindow =
            validWindowCandidates[0]
                .window;

        /*
        * O Reveal só será aberto quando
        * houver mais de uma janela válida.
        */

        if (
            validWindowCandidates
                .length > 1
        ) {
            button.title =
                "Escolha a janela da importação";

            selectedWindow =
                await requestPlanningImportWindow(
                    validWindowCandidates,
                );

            if (!selectedWindow) {
                restorePlanningImportButton(
                    button,
                );

                return;
            }
        }

        const selection =
            validWindowCandidates
                .find(
                    function (candidate) {
                        return candidate.window ===
                            selectedWindow;
                    },
                )
                ?.selection;

        if (
            !selection ||
            selection.lhs.length === 0
        ) {
            throw new Error(`A janela ${selectedWindow} precisa de um agrupamento válido de LHs.`);
        }

        if (
            hasPlanningImportReplacementData()
        ) {
            const shouldReplace =
                window.confirm(
                    "A importação substituirá os LHs preenchidos atualmente. Deseja continuar?",
                );

            if (!shouldReplace) {
                restorePlanningImportButton(
                    button,
                );

                return;
            }
        }

        replacePlanningLhs(
            selection.lhs,
            PLANNING_IMPORT_SOURCE,
        );

        const ignoredParts = [];
        const includedParts = [];

        if (
            selection.skippedUngrouped > 0
        ) {
            ignoredParts.push(
                `${selection.skippedUngrouped} fora de um agrupamento válido`,
            );
        }

        if (
            selection.skippedDuplicates > 0
        ) {
            ignoredParts.push(
                `${selection.skippedDuplicates} duplicado(s)`,
            );
        }

        if (selection.skippedScheduleGroups > 0) {
            ignoredParts.push(selection.skippedScheduleGroups === 1
                ? "1 bloco com STA/STD ausente ou fora do período"
                : `${selection.skippedScheduleGroups} blocos com STA/STD ausente ou fora do período`);
        }

        if (
            selection
                .includedWithoutQuantity > 0
        ) {
            includedParts.push(
                `${selection.includedWithoutQuantity} sem quantidade`,
            );
        }

        if (
            selection.includedWaiting > 0
        ) {
            includedParts.push(
                `${selection.includedWaiting} com Waiting`,
            );
        }

        if (
            selection
                .includedWithoutWindow > 0
        ) {
            includedParts.push(
                `${selection.includedWithoutWindow} sem CPT`,
            );
        }

        button.title =
            `${selection.lhs.length} LHs importados — ${selection.targetWindow}`;

        button.title = [
            `Importação por ${importFormat}.`,

            ignoredParts.length > 0
                ? `Ignorados: ${ignoredParts.join(", ")}.`
                : "Nenhum registro precisou ser ignorado.",

            includedParts.length > 0
                ? `Incluídos: ${includedParts.join(", ")}.`
                : "",
        ]
            .filter(
                Boolean,
            )
            .join(
                " ",
            );

        restorePlanningImportButton(
            button,
        );

        setReportNotification({
            reportId: "planning",
            type: "success",
            message: `${selection.lhs.length} LHs importados da janela ${selection.targetWindow}.`,
        });
    } catch (error) {
        console.error(
            "Falha ao importar os LHs do SPX.",
            error,
        );

        button.title =
            "Não foi possível importar";

        setReportNotification({
            reportId: "planning",
            type: "error",
            message:
                error instanceof Error
                    ? error.message
                    : "Não foi possível importar os LHs do SPX.",
        });

        window.alert(
            error instanceof Error
                ? error.message
                : "Não foi possível importar os dados copiados do SPX.",
        );

        restorePlanningImportButton(
            button,
        );
    } finally {
        button.disabled = false;

        button.removeAttribute(
            "aria-busy",
        );
    }
}

/* INICIALIZA A IMPORTAÇÃO */

function initializePlanningImport(
    rootElement = document,
) {
    const button =
        rootElement.querySelector(
            `#${PLANNING_IMPORT_BUTTON_ID}`,
        );

    if (
        !(
            button instanceof
            HTMLButtonElement
        )
    ) {
        return false;
    }

    if (
        button
            .dataset
            .planningImportInitialized ===
        "true"
    ) {
        return true;
    }

    button
        .dataset
        .planningImportInitialized =
            "true";

    button.dataset
        .planningImportDefaultTitle =
            button.title ||
            PLANNING_IMPORT_DEFAULT_TEXT;

    button.dataset
        .planningImportDefaultAriaLabel =
            button.getAttribute(
                "aria-label",
            ) ||
            PLANNING_IMPORT_DEFAULT_TEXT;

    button.addEventListener(
        "click",
        handlePlanningClipboardImport,
    );

    return true;
}

export {
    getPlanningSpXDetectedWindows,
    initializePlanningImport,
    parsePlanningSpXHtml,
    parsePlanningSpXPlainText,
    selectPlanningSpXLhs,
};
