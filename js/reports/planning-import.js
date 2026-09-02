import {
    getPlanningState,
    replacePlanningLhs,
} from "./state.js";

const PLANNING_IMPORT_BUTTON_ID =
    "planningImportClipboardButton";

const PLANNING_IMPORT_DEFAULT_TEXT =
    "Importar do SPX";

const PLANNING_IMPORT_SOURCE =
    "spx-clipboard";

const PLANNING_IMPORT_EXPECTED_MAXIMUM =
    8;

const PLANNING_IMPORT_SUCCESS_DURATION =
    3000;

const PLANNING_SPX_WINDOW_PATTERN =
    /^(AM|PM1|PM2)$/i;

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

/* IDENTIFICA A JANELA EXPLÍCITA */

function getPlanningImportWindow(
    values,
) {
    for (
        const value of values
    ) {
        const match =
            value
                .trim()
                .match(
                    PLANNING_SPX_WINDOW_PATTERN,
                );

        if (match) {
            return match[1]
                .toUpperCase();
        }
    }

    return "";
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

        quantity:
            findColumn(
                "pedido de entrada pendente",
            ),
    };

    const hasAllColumns =
        Object.values(
            columns,
        )
            .every(
                function (index) {
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
        receivedRecord.origin
            .flatMap(
                splitPlanningImportValues,
            )
            .find(
                function (value) {
                    return value !== "-";
                },
            ) || "";

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

    const quantity =
        receivedRecord.quantity
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

        window:
            getPlanningImportWindow(
                cptValues,
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
                const matrix =
                    createPlanningImportTableMatrix(
                        table,
                    );

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
                    return;
                }

                let currentRecord =
                    null;

                function finishCurrentRecord() {
                    if (!currentRecord) {
                        return;
                    }

                    parsedRecords.push(
                        createPlanningImportHtmlRecord(
                            currentRecord,
                        ),
                    );

                    currentRecord =
                        null;
                }

                matrix
                    .slice(
                        headerRowIndex + 1,
                    )
                    .forEach(
                        function (row) {
                            const code =
                                getPlanningImportLhCode(
                                    row[
                                        columns.code
                                    ],
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
                                    quantity: [],
                                };
                            }

                            if (!currentRecord) {
                                return;
                            }

                            currentRecord
                                .origin
                                .push(
                                    row[
                                        columns.origin
                                    ] ?? "",
                                );

                            currentRecord
                                .punctuality
                                .push(
                                    row[
                                        columns.punctuality
                                    ] ?? "",
                                );

                            currentRecord
                                .cpt
                                .push(
                                    row[
                                        columns.cpt
                                    ] ?? "",
                                );

                            currentRecord
                                .quantity
                                .push(
                                    row[
                                        columns.quantity
                                    ] ?? "",
                                );
                        },
                    );

                finishCurrentRecord();
            },
        );

    return parsedRecords;
}

/* LOCALIZA A QUANTIDADE NO TEXTO PURO */

function getPlanningImportPlainQuantity(
    values,
) {
    const dateTimePattern =
        /^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2}$/;

    let lastDateTimeIndex =
        -1;

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

    if (
        lastDateTimeIndex !==
        -1
    ) {
        const quantities =
            values
                .slice(
                    lastDateTimeIndex + 1,
                )
                .map(
                    parsePlanningImportQuantity,
                )
                .filter(
                    function (value) {
                        return value !== null;
                    },
                );

        if (
            quantities.length >= 2
        ) {
            return quantities[1];
        }
    }

    const numericValues =
        values.map(
            parsePlanningImportQuantity,
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

/* EXTRAI OS REGISTROS DO TEXTO PURO */

function parsePlanningSpXPlainText(
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
            )
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
        "pedido de entrada pendente",
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

            const values =
                lines
                    .slice(
                        recordStart.index + 1,
                        endIndex,
                    )
                    .filter(
                        Boolean,
                    );

            const origin =
                values.find(
                    function (value) {
                        return /^\[\d+\]\s*\S+/.test(
                            value,
                        );
                    },
                ) || "";

            return {
                code:
                    recordStart.code,

                origin,

                quantity:
                    getPlanningImportPlainQuantity(
                        values,
                    ),

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

/* RETORNA AS JANELAS NA ORDEM ENCONTRADA */

function getPlanningSpXDetectedWindows(
    receivedRecords,
) {
    const records =
        Array.isArray(
            receivedRecords,
        )
            ? receivedRecords
            : [];

    const receivedWindows =
        new Set();

    records.forEach(
        function (record) {
            const windowValue =
                String(
                    record.window ?? "",
                )
                    .trim()
                    .toUpperCase();

            if (
                PLANNING_SPX_WINDOW_PATTERN.test(
                    windowValue,
                )
            ) {
                receivedWindows.add(
                    windowValue,
                );
            }
        },
    );

    return Array.from(
        receivedWindows,
    );
}

/* VERIFICA SE EXISTE UM VIZINHO COM O MESMO CPT */

function hasPlanningSpXMatchingWindowNeighbor(
    records,
    index,
    targetWindow,
) {
    return (
        records[index - 1]
            ?.window ===
            targetWindow ||

        records[index + 1]
            ?.window ===
            targetWindow
    );
}

/* SELECIONA O PRIMEIRO BLOCO VÁLIDO DA JANELA */

/* SELECIONA O PRIMEIRO BLOCO VÁLIDO DA JANELA */

function selectPlanningSpXLhs(
    receivedRecords,
    receivedTargetWindow = "",
) {
    const records =
        Array.isArray(
            receivedRecords,
        )
            ? receivedRecords
            : [];

    const detectedWindows =
        getPlanningSpXDetectedWindows(
            records,
        );

    const targetWindow =
        String(
            receivedTargetWindow ||
            detectedWindows[0] ||
            "",
        )
            .trim()
            .toUpperCase();

    const validWindowIndexes = [];

    records.forEach(
        function (
            record,
            index,
        ) {
            if (
                record.window ===
                    targetWindow &&

                hasPlanningSpXMatchingWindowNeighbor(
                    records,
                    index,
                    targetWindow,
                )
            ) {
                validWindowIndexes.push(
                    index,
                );
            }
        },
    );

    if (
        !targetWindow ||
        validWindowIndexes.length === 0
    ) {
        return {
            lhs: [],
            targetWindow,
            includedWaiting: 0,
            includedWithoutQuantity: 0,
            includedWithoutWindow: 0,
            skippedWaitingWithoutWindow: 0,
            skippedAllWaitingGroups: 0,
            skippedUngrouped: records.filter(
                function (record) {
                    return record.window ===
                        targetWindow;
                },
            ).length,
            skippedDuplicates: 0,
        };
    }

    let blockStart = -1;
    let blockEnd = -1;
    let blockWindowIndexes = [];
    let skippedAllWaitingGroups = 0;

    const checkedBlocks =
        new Set();

    /*
     * Percorre os agrupamentos da janela
     * até encontrar um que possua pelo
     * menos um LH que não esteja Waiting.
     */

    for (
        const validIndex of
            validWindowIndexes
    ) {
        let candidateStart =
            validIndex;

        let candidateEnd =
            validIndex;

        /*
         * Expande o início do bloco até
         * encontrar uma janela diferente.
         */

        while (
            candidateStart > 0
        ) {
            const previousWindow =
                records[
                    candidateStart - 1
                ].window;

            if (
                previousWindow &&
                previousWindow !==
                    targetWindow
            ) {
                break;
            }

            candidateStart -= 1;
        }

        /*
         * Expande o final do bloco até
         * encontrar uma janela diferente.
         */

        while (
            candidateEnd <
                records.length - 1
        ) {
            const nextWindow =
                records[
                    candidateEnd + 1
                ].window;

            if (
                nextWindow &&
                nextWindow !==
                    targetWindow
            ) {
                break;
            }

            candidateEnd += 1;
        }

        const blockKey =
            `${candidateStart}:${candidateEnd}`;

        /*
         * Evita verificar o mesmo bloco
         * mais de uma vez.
         */

        if (
            checkedBlocks.has(
                blockKey,
            )
        ) {
            continue;
        }

        checkedBlocks.add(
            blockKey,
        );

        const candidateWindowIndexes =
            validWindowIndexes.filter(
                function (index) {
                    return (
                        index >=
                            candidateStart &&
                        index <=
                            candidateEnd
                    );
                },
            );

        /*
         * Um agrupamento composto somente
         * por LHs Waiting não é válido.
         *
         * Um grupo misto continua válido,
         * incluindo também seus LHs Waiting.
         */

        const hasNonWaitingLh =
            candidateWindowIndexes.some(
                function (index) {
                    return !records[index]
                        .waiting;
                },
            );

        if (!hasNonWaitingLh) {
            skippedAllWaitingGroups += 1;
            continue;
        }

        blockStart =
            candidateStart;

        blockEnd =
            candidateEnd;

        blockWindowIndexes =
            candidateWindowIndexes;

        break;
    }

    /*
     * Nenhum agrupamento válido foi
     * encontrado para a janela escolhida.
     */

    if (
        blockStart === -1 ||
        blockWindowIndexes.length === 0
    ) {
        return {
            lhs: [],
            targetWindow,
            includedWaiting: 0,
            includedWithoutQuantity: 0,
            includedWithoutWindow: 0,
            skippedWaitingWithoutWindow: 0,
            skippedAllWaitingGroups,

            skippedUngrouped:
                records.filter(
                    function (record) {
                        return record.window ===
                            targetWindow;
                    },
                ).length,

            skippedDuplicates: 0,
        };
    }

    const firstGroupedIndex =
        blockWindowIndexes[0];

    const lastGroupedIndex =
        blockWindowIndexes[
            blockWindowIndexes.length - 1
        ];

    const selectedIndexes =
        new Set(
            blockWindowIndexes,
        );

    /*
     * Inclui os LHs sem CPT que estiverem
     * dentro ou imediatamente ao lado do
     * agrupamento escolhido.
     *
     * LHs sem CPT marcados como Waiting
     * continuam sendo ignorados.
     */

    for (
        let index = blockStart;
        index <= blockEnd;
        index += 1
    ) {
        const record =
            records[index];

        if (
            record.window ||
            record.waiting
        ) {
            continue;
        }

        const insideBlock =
            index >= firstGroupedIndex &&
            index <= lastGroupedIndex;

        const immediatelyBefore =
            index ===
            firstGroupedIndex - 1;

        const immediatelyAfter =
            index ===
            lastGroupedIndex + 1;

        if (
            insideBlock ||
            immediatelyBefore ||
            immediatelyAfter
        ) {
            selectedIndexes.add(
                index,
            );
        }
    }

    const orderedIndexes =
        Array.from(
            selectedIndexes,
        )
            .sort(
                function (
                    firstIndex,
                    secondIndex,
                ) {
                    return (
                        firstIndex -
                        secondIndex
                    );
                },
            );

    const lhs = [];

    const receivedCodes =
        new Set();

    let includedWaiting = 0;
    let includedWithoutQuantity = 0;
    let includedWithoutWindow = 0;
    let skippedDuplicates = 0;

    orderedIndexes.forEach(
        function (index) {
            const record =
                records[index];

            const code =
                getPlanningImportLhCode(
                    record.code,
                );

            if (!code) {
                return;
            }

            if (
                receivedCodes.has(
                    code,
                )
            ) {
                skippedDuplicates += 1;
                return;
            }

            const quantity =
                parsePlanningImportQuantity(
                    record.quantity,
                );

            if (record.waiting) {
                includedWaiting += 1;
            }

            if (quantity === null) {
                includedWithoutQuantity += 1;
            }

            if (!record.window) {
                includedWithoutWindow += 1;
            }

            receivedCodes.add(
                code,
            );

            lhs.push({
                code,

                origin:
                    String(
                        record.origin ?? "",
                    ).trim(),

                quantity,
            });
        },
    );

    const selectedCodes =
        new Set(
            lhs.map(
                function (lh) {
                    return lh.code;
                },
            ),
        );

    const skippedWaitingWithoutWindow =
        records
            .slice(
                blockStart,
                blockEnd + 1,
            )
            .filter(
                function (record) {
                    return (
                        !record.window &&
                        record.waiting
                    );
                },
            )
            .length;

    const skippedUngrouped =
        records.filter(
            function (record) {
                return (
                    record.window ===
                        targetWindow &&

                    !selectedCodes.has(
                        getPlanningImportLhCode(
                            record.code,
                        ),
                    )
                );
            },
        ).length;

    return {
        lhs,
        targetWindow,
        includedWaiting,
        includedWithoutQuantity,
        includedWithoutWindow,
        skippedWaitingWithoutWindow,
        skippedAllWaitingGroups,
        skippedUngrouped,
        skippedDuplicates,
    };
}

/* CRIA AS OPÇÕES DE JANELA */

function createPlanningSpXWindowCandidates(
    records,
) {
    return getPlanningSpXDetectedWindows(
        records,
    ).map(
        function (windowValue) {
            return {
                window:
                    windowValue,

                selection:
                    selectPlanningSpXLhs(
                        records,
                        windowValue,
                    ),
            };
        },
    );
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
                button.textContent =
                    PLANNING_IMPORT_DEFAULT_TEXT;

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

    button.textContent =
        "Lendo área de transferência...";

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
            throw new Error(
                "Nenhuma das janelas encontradas possui um agrupamento válido de LHs.",
            );
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
            button.textContent =
                "Escolha a janela...";

            selectedWindow =
                await requestPlanningImportWindow(
                    validWindowCandidates,
                );

            if (!selectedWindow) {
                button.textContent =
                    PLANNING_IMPORT_DEFAULT_TEXT;

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

        /*
         * Mais de uma janela:
         * abre o modal Foundation.
         */

        if (
            selectedCandidate
                .windowCandidates
                .length > 1
        ) {
            button.textContent =
                "Escolha a janela...";

            selectedWindow =
                await requestPlanningImportWindow(
                    selectedCandidate
                        .windowCandidates,
                );

            if (!selectedWindow) {
                button.textContent =
                    PLANNING_IMPORT_DEFAULT_TEXT;

                return;
            }
        }

        const selection =
            selectedCandidate
                .windowCandidates
                .find(
                    function (candidate) {
                        return (
                            candidate.window ===
                            selectedWindow
                        );
                    },
                )
                ?.selection;

        if (
            !selection ||
            selection.lhs.length === 0
        ) {
            if (
                selection
                    ?.skippedAllWaitingGroups > 0
            ) {
                throw new Error(
                    `Todos os grupos da janela ${selectedWindow} estão integralmente como Waiting.`,
                );
            }

            throw new Error(
                `A janela ${selectedWindow} não possui pelo menos dois LHs consecutivos com o mesmo CPT.`,
            );
        }

        if (
            selection.lhs.length >
            PLANNING_IMPORT_EXPECTED_MAXIMUM
        ) {
            const shouldContinue =
                window.confirm(
                    `Foram encontrados ${selection.lhs.length} LHs no bloco da janela ${selection.targetWindow}. Normalmente a lista possui até ${PLANNING_IMPORT_EXPECTED_MAXIMUM}. Deseja importar todos mesmo assim?`,
                );

            if (!shouldContinue) {
                button.textContent =
                    PLANNING_IMPORT_DEFAULT_TEXT;

                return;
            }
        }

        if (
            hasPlanningImportReplacementData()
        ) {
            const shouldReplace =
                window.confirm(
                    "A importação substituirá os LHs preenchidos atualmente. Deseja continuar?",
                );

            if (!shouldReplace) {
                button.textContent =
                    PLANNING_IMPORT_DEFAULT_TEXT;

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

        if (
            selection
                .skippedAllWaitingGroups > 0
        ) {
            ignoredParts.push(
                selection
                    .skippedAllWaitingGroups === 1
                    ? "1 grupo composto somente por Waiting"
                    : `${selection.skippedAllWaitingGroups} grupos compostos somente por Waiting`,
            );
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

        button.textContent =
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
    } catch (error) {
        console.error(
            "Falha ao importar os LHs do SPX.",
            error,
        );

        button.textContent =
            "Não foi possível importar";

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
    }
}

/* INICIALIZA A IMPORTAÇÃO */

function initializePlanningImport() {
    const button =
        document.getElementById(
            PLANNING_IMPORT_BUTTON_ID,
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
