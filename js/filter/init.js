const SUPPORTED_EXTENSIONS =
    new Set([
        "xlsx",
        "xls",
        "csv",
    ]);

const FILTER_INITIAL_MESSAGE =
    "Importe o relatório final do seu respectivo hub ou o rastreio de pedidos para montar a base de dados filtrada.";

const NOTIFICATION_ICONS =
    Object.freeze({
        idle:
            "images/geral-icons/bell-icon.svg",

        info:
            "images/geral-icons/bell-icon.svg",

        success:
            "images/geral-icons/success-icon.svg",

        warning:
            "images/geral-icons/alert-icon.svg",

        error:
            "images/geral-icons/error-icon.svg",
    });

/*
 * Cada finalidade concentra as regras de leitura,
 * filtragem, projeção de colunas e nome do arquivo.
 */

const FILTER_PURPOSES =
    Object.freeze({
        "export-analysis":
            Object.freeze({
                label:
                    "Export Análises",

                filterColumn:
                    "Shipment_id",

                outputSuffix:
                    "export-analises",

                columns:
                    Object.freeze([
                        "Shipment_id",
                        "binding_entity",
                        "AT_Number",
                        "driver_id",
                        "motorista",
                        "item_names",
                    ]),

                exportIgnoredColumns:
                    Object.freeze([
                        "Shipment_id",
                    ]),

                includeCsvHeaders:
                    false,

                preserveUnmatchedRows:
                    true,

                keepFirstOccurrence:
                    true,

                previewColumnLabels:
                    Object.freeze({
                        Shipment_id:
                            "Código BR",

                        binding_entity:
                            "Rota",

                        AT_Number:
                            "AT",

                        driver_id:
                            "ID do Motorista",

                        motorista:
                            "Motorista",
                    }),

                previewHiddenColumns:
                    Object.freeze([
                        "item_names",
                    ]),
            }),

        "export-damage":
            Object.freeze({
                label:
                    "Export Avaria",

                filterColumn:
                    "Order ID",

                outputSuffix:
                    "export-avaria",

                columns:
                    Object.freeze([
                        "Order ID",
                        "Status",
                        "Current Station",
                    ]),

                exportIgnoredColumns:
                    Object.freeze([
                        "Order ID",
                    ]),

                requiredColumns:
                    Object.freeze([
                        "Order ID",
                        "Status",
                        "Current Station",
                        "Current Station Received Time",
                    ]),

                oldestByColumn:
                    "Current Station Received Time",

                previewColumnLabels:
                    Object.freeze({
                        "Order ID":
                            "Código BR",

                        Status:
                            "Status Inicial",

                        "Current Station":
                            "Estação Inicial",
                    }),
            }),
    });

const elements = {
    notification:
        document.getElementById(
            "filterNotification",
        ),

    notificationIcon:
        document.getElementById(
            "filterNotificationIcon",
        ),

    notificationText:
        document.getElementById(
            "filterNotificationText",
        ),

    copyButton:
        document.getElementById(
            "filterCopyButton",
        ),

    saveButton:
        document.getElementById(
            "filterSaveButton",
        ),

    importButton:
        document.getElementById(
            "filterImportButton",
        ),

    fileInput:
        document.getElementById(
            "filterFileInput",
        ),

    clearButton:
        document.getElementById(
            "filterClearButton",
        ),

    purpose:
        document.getElementById(
            "filterPurpose",
        ),

    values:
        document.getElementById(
            "filterValues",
        ),

    lineCount:
        document.getElementById(
            "filterLineCount",
        ),

    applyButton:
        document.getElementById(
            "filterApplyButton",
        ),

    previewEmpty:
        document.getElementById(
            "filterPreviewEmpty",
        ),

    previewResult:
        document.getElementById(
            "filterPreviewResult",
        ),

    previewSummary:
        document.getElementById(
            "filterPreviewSummary",
        ),

    previewTable:
        document.getElementById(
            "filterPreviewTable",
        ),
};

const filterState = {
    sourceFileName: "",

    workbook: null,

    sourceSheetName: "",

    sourceRows: [],

    headerIndexes: new Map(),

    resultRows: [],

    unmatchedValues: [],
};

function normalizeText(value) {
    return String(
        value ?? "",
    )
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR");
}

function formatCellValue(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value);
}

function formatPurposeColumnValue(
    purpose,
    column,
    value,
) {
    const formatter =
        purpose.columnFormatters?.[
            column
        ];

    if (
        typeof formatter ===
        "function"
    ) {
        return formatter(value);
    }

    return value ?? "";
}

function createUtcTimestamp(
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
) {
    const timestamp =
        Date.UTC(
            year,
            month - 1,
            day,
            hour,
            minute,
            second,
            millisecond,
        );

    const parsedDate =
        new Date(timestamp);

    if (
        parsedDate.getUTCFullYear() !== year ||
        parsedDate.getUTCMonth() !== month - 1 ||
        parsedDate.getUTCDate() !== day ||
        parsedDate.getUTCHours() !== hour ||
        parsedDate.getUTCMinutes() !== minute ||
        parsedDate.getUTCSeconds() !== second
    ) {
        return Number.NaN;
    }

    return timestamp;
}

function parseComparableDateTime(value) {
    if (value instanceof Date) {
        return value.getTime();
    }

    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return Date.UTC(
            1899,
            11,
            30,
        ) + value * 86400000;
    }

    const formattedValue =
        formatCellValue(value)
            .trim();

    if (!formattedValue) {
        return Number.NaN;
    }

    const excelSerialMatch =
        formattedValue.match(
            /^\d+(?:\.\d+)?$/,
        );

    if (excelSerialMatch) {
        const excelSerial =
            Number(formattedValue);

        if (
            excelSerial > 0 &&
            excelSerial < 2958466
        ) {
            return Date.UTC(
                1899,
                11,
                30,
            ) + excelSerial * 86400000;
        }
    }

    const isoMatch =
        formattedValue.match(
            /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:[.,](\d{1,3}))?)?)?$/,
        );

    if (isoMatch) {
        return createUtcTimestamp(
            Number(isoMatch[1]),
            Number(isoMatch[2]),
            Number(isoMatch[3]),
            Number(isoMatch[4] ?? 0),
            Number(isoMatch[5] ?? 0),
            Number(isoMatch[6] ?? 0),
            Number(
                (isoMatch[7] ?? "0")
                    .padEnd(3, "0"),
            ),
        );
    }

    const dayFirstMatch =
        formattedValue.match(
            /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:[.,](\d{1,3}))?)?)?$/,
        );

    if (dayFirstMatch) {
        return createUtcTimestamp(
            Number(dayFirstMatch[3]),
            Number(dayFirstMatch[2]),
            Number(dayFirstMatch[1]),
            Number(dayFirstMatch[4] ?? 0),
            Number(dayFirstMatch[5] ?? 0),
            Number(dayFirstMatch[6] ?? 0),
            Number(
                (dayFirstMatch[7] ?? "0")
                    .padEnd(3, "0"),
            ),
        );
    }

    const parsedTimestamp =
        Date.parse(formattedValue);

    return Number.isNaN(
        parsedTimestamp,
    )
        ? Number.NaN
        : parsedTimestamp;
}

function setNotification(
    message,
    type = "info",
) {
    const normalizedType =
        Object.prototype.hasOwnProperty.call(
            NOTIFICATION_ICONS,
            type,
        )
            ? type
            : "info";

    elements.notification.dataset
        .notificationType =
            normalizedType;

    elements.notificationIcon.src =
        NOTIFICATION_ICONS[
            normalizedType
        ];

    elements.notificationText.textContent =
        message;
}

function syncPurposeSelect() {
    if (
        window.jQuery &&
        typeof window.jQuery.fn
            .select2 === "function"
    ) {
        window
            .jQuery(
                elements.purpose,
            )
            .trigger(
                "change.select2",
            );
    }
}

function parseFilterValues() {
    const values =
        elements.values.value
            .split(/\r?\n/)
            .map(function (value) {
                return value.trim();
            })
            .filter(Boolean);

    const uniqueValues = [];
    const normalizedValues =
        new Set();

    values.forEach(
        function (value) {
            const normalizedValue =
                normalizeText(value);

            if (
                !normalizedValue ||
                normalizedValues.has(
                    normalizedValue,
                )
            ) {
                return;
            }

            normalizedValues.add(
                normalizedValue,
            );

            uniqueValues.push(value);
        },
    );

    return {
        values,
        uniqueValues,
        normalizedValues,
    };
}

function updateLineCount() {
    const {
        values,
        uniqueValues,
    } = parseFilterValues();

    const lineLabel =
        values.length === 1
            ? "linha"
            : "linhas";

    elements.lineCount.textContent =
        `${values.length} ${lineLabel}`;

    elements.applyButton.disabled =
        elements.values.disabled ||
        uniqueValues.length === 0;
}

function getFileExtension(fileName) {
    return String(fileName)
        .split(".")
        .pop()
        ?.toLocaleLowerCase("pt-BR") ?? "";
}

function isSupportedFile(file) {
    return Boolean(file) &&
        SUPPORTED_EXTENSIONS.has(
            getFileExtension(
                file.name,
            ),
        );
}

function createHeaderIndex(headers) {
    const headerIndexes =
        new Map();

    headers.forEach(
        function (
            header,
            columnIndex,
        ) {
            const normalizedHeader =
                normalizeText(header);

            if (
                normalizedHeader &&
                !headerIndexes.has(
                    normalizedHeader,
                )
            ) {
                headerIndexes.set(
                    normalizedHeader,
                    columnIndex,
                );
            }
        },
    );

    return headerIndexes;
}

function findCompatibleSheet(
    workbook,
    purpose,
) {
    let closestSheet = null;

    for (
        const sheetName
        of workbook.SheetNames
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

        if (rows.length === 0) {
            continue;
        }

        const headerIndexes =
            createHeaderIndex(
                rows[0],
            );

        const requiredColumns =
            purpose.requiredColumns ??
            purpose.columns;

        const missingColumns =
            requiredColumns.filter(
                function (column) {
                    return !headerIndexes.has(
                        normalizeText(
                            column,
                        ),
                    );
                },
            );

        const sheetCandidate = {
            sheetName,
            rows,
            headerIndexes,
            missingColumns,
        };

        if (missingColumns.length === 0) {
            return sheetCandidate;
        }

        if (
            !closestSheet ||
            missingColumns.length <
                closestSheet
                    .missingColumns
                    .length
        ) {
            closestSheet =
                sheetCandidate;
        }
    }

    return closestSheet;
}

function clearPreview() {
    const tableHead =
        elements.previewTable
            .querySelector("thead");

    const tableBody =
        elements.previewTable
            .querySelector("tbody");

    tableHead.replaceChildren();
    tableBody.replaceChildren();

    elements.previewSummary.textContent =
        "";

    elements.previewResult.hidden =
        true;

    elements.previewEmpty.hidden =
        false;

    filterState.resultRows = [];
    filterState.unmatchedValues = [];

    elements.copyButton.disabled =
        true;

    elements.saveButton.disabled =
        true;
}

function resetSelectedPurpose() {
    filterState.sourceSheetName = "";
    filterState.sourceRows = [];
    filterState.headerIndexes =
        new Map();

    elements.values.value = "";
    elements.values.disabled = true;
    elements.applyButton.disabled =
        true;

    updateLineCount();
    clearPreview();
}

function resetPanel({
    notification = true,
} = {}) {
    filterState.sourceFileName = "";
    filterState.workbook = null;

    elements.fileInput.value = "";
    elements.purpose.value = "";
    elements.purpose.disabled = true;
    elements.clearButton.disabled = true;

    resetSelectedPurpose();
    syncPurposeSelect();

    if (notification) {
        setNotification(
            FILTER_INITIAL_MESSAGE,
            "idle",
        );
    }
}

async function readWorkbook(file) {
    if (!isSupportedFile(file)) {
        throw new Error(
            "Formato não suportado. Selecione um arquivo XLSX, XLS ou CSV.",
        );
    }

    if (
        !window.XLSX ||
        typeof window.XLSX.read !==
            "function"
    ) {
        throw new Error(
            "A biblioteca de leitura de planilhas não foi carregada.",
        );
    }

    const fileData =
        await file.arrayBuffer();

    const workbook =
        window.XLSX.read(
            fileData,
            {
                cellDates: true,
                cellFormula: false,
            },
        );

    if (
        !Array.isArray(
            workbook.SheetNames,
        ) ||
        workbook.SheetNames.length === 0
    ) {
        throw new Error(
            "O arquivo não possui nenhuma aba legível.",
        );
    }

    return workbook;
}

async function importFile(file) {
    if (!file) {
        return;
    }

    setNotification(
        `Lendo "${file.name}"...`,
        "info",
    );

    elements.importButton.disabled =
        true;

    try {
        const workbook =
            await readWorkbook(file);

        resetPanel({
            notification: false,
        });

        filterState.sourceFileName =
            file.name;

        filterState.workbook =
            workbook;

        elements.purpose.disabled =
            false;

        elements.clearButton.disabled =
            false;

        syncPurposeSelect();

        setNotification(
            `Arquivo "${file.name}" importado, agora selecione a finalidade da filtragem.`,
            "success",
        );
    } catch (error) {
        resetPanel({
            notification: false,
        });

        setNotification(
            error instanceof Error
                ? error.message
                : "Não foi possível ler o arquivo selecionado.",
            "error",
        );
    } finally {
        elements.importButton.disabled =
            false;
    }
}

function handlePurposeChange() {
    resetSelectedPurpose();

    if (!filterState.workbook) {
        return;
    }

    const purpose =
        FILTER_PURPOSES[
            elements.purpose.value
        ];

    if (!purpose) {
        setNotification(
            "Selecione uma finalidade para continuar.",
            "info",
        );

        return;
    }

    const compatibleSheet =
        findCompatibleSheet(
            filterState.workbook,
            purpose,
        );

    if (!compatibleSheet) {
        setNotification(
            `O arquivo não possui uma aba com cabeçalhos legíveis para ${purpose.label}. A filtragem permanece bloqueada.`,
            "error",
        );

        return;
    }

    if (
        compatibleSheet
            .missingColumns
            .length > 0
    ) {
        setNotification(
            "Colunas obrigatórias ausentes.",
            "error",
        );

        return;
    }

    filterState.sourceSheetName =
        compatibleSheet.sheetName;

    filterState.sourceRows =
        compatibleSheet.rows.slice(1);

    filterState.headerIndexes =
        compatibleSheet.headerIndexes;

    elements.values.disabled = false;
    elements.values.focus();

    setNotification(
        `Finalidade "${purpose.label}" escolhida, agora cole um valor por linha para filtrar a aba "${compatibleSheet.sheetName}".`,
        "success",
    );
}

function createTableCell(
    tagName,
    value,
) {
    const cell =
        document.createElement(
            tagName,
        );

    cell.textContent =
        formatCellValue(value);

    return cell;
}

function renderPreview(
    purpose,
    previewRows,
    matchedRowCount,
    unmatchedValues,
) {
    const tableHead =
        elements.previewTable
            .querySelector("thead");

    const tableBody =
        elements.previewTable
            .querySelector("tbody");

    const headerRow =
        document.createElement("tr");

    const hiddenPreviewColumns =
        new Set(
            (
                purpose.previewHiddenColumns ??
                []
            ).map(
                normalizeText,
            ),
        );

    const previewColumnIndexes =
        purpose.columns.reduce(
            function (
                columnIndexes,
                column,
                columnIndex,
            ) {
                if (
                    !hiddenPreviewColumns.has(
                        normalizeText(
                            column,
                        ),
                    )
                ) {
                    columnIndexes.push(
                        columnIndex,
                    );
                }

                return columnIndexes;
            },
            [],
        );

    previewColumnIndexes.forEach(
        function (columnIndex) {
            headerRow.appendChild(
                createTableCell(
                    "th",
                    purpose.previewColumnLabels?.[
                        purpose.columns[
                            columnIndex
                        ]
                    ] ?? purpose.columns[
                        columnIndex
                    ],
                ),
            );
        },
    );

    tableHead.replaceChildren(
        headerRow,
    );

    const bodyFragment =
        document.createDocumentFragment();

    if (previewRows.length === 0) {
        const emptyRow =
            document.createElement("tr");

        const emptyCell =
            createTableCell(
                "td",
                "Nenhuma linha corresponde aos valores informados.",
            );

        emptyCell.colSpan =
            previewColumnIndexes.length;

        emptyCell.classList.add(
            "filter-empty-row",
        );

        emptyRow.appendChild(
            emptyCell,
        );

        bodyFragment.appendChild(
            emptyRow,
        );
    } else {
        previewRows.forEach(
            function (row) {
                const tableRow =
                    document.createElement(
                        "tr",
                    );

                previewColumnIndexes.forEach(
                    function (
                        columnIndex,
                    ) {
                        tableRow.appendChild(
                            createTableCell(
                                "td",
                                row[
                                    columnIndex
                                ],
                            ),
                        );
                    },
                );

                bodyFragment.appendChild(
                    tableRow,
                );
            },
        );
    }

    tableBody.replaceChildren(
        bodyFragment,
    );

    const rowLabel =
        matchedRowCount === 1
            ? "linha encontrada"
            : "linhas encontradas";

    const unmatchedLabel =
        unmatchedValues.length === 1
            ? "valor não encontrado"
            : "valores não encontrados";

    const unmatchedMessage =
        unmatchedValues.length > 0
            ? ` ${unmatchedValues.length} ${unmatchedLabel}.`
            : "";

    elements.previewSummary.textContent =
        `${matchedRowCount} ${rowLabel} na aba "${filterState.sourceSheetName}".${unmatchedMessage}`;

    elements.previewEmpty.hidden = true;
    elements.previewResult.hidden =
        false;
}

function filterRows() {
    const purpose =
        FILTER_PURPOSES[
            elements.purpose.value
        ];

    if (
        !purpose ||
        filterState.sourceRows.length === 0
    ) {
        setNotification(
            "Selecione uma finalidade válida antes de filtrar.",
            "error",
        );

        return;
    }

    const {
        values,
        uniqueValues,
        normalizedValues,
    } = parseFilterValues();

    if (uniqueValues.length === 0) {
        setNotification(
            `Informe ao menos um ${purpose.filterColumn} para filtrar.`,
            "warning",
        );

        return;
    }

    const filterColumnIndex =
        filterState.headerIndexes.get(
            normalizeText(
                purpose.filterColumn,
            ),
        );

    const outputColumnIndexes =
        purpose.columns.map(
            function (column) {
                return filterState
                    .headerIndexes
                    .get(
                        normalizeText(
                            column,
                        ),
                    );
            },
        );

    const oldestColumnIndex =
        purpose.oldestByColumn
            ? filterState
                .headerIndexes
                .get(
                    normalizeText(
                        purpose.oldestByColumn,
                    ),
                )
            : undefined;

    const selectedResultByValue =
        new Map();

    filterState.sourceRows.forEach(
        function (sourceRow) {
            const filterValue =
                normalizeText(
                    sourceRow[
                        filterColumnIndex
                    ],
                );

            if (
                !normalizedValues.has(
                    filterValue,
                )
            ) {
                return;
            }

            const resultRow =
                outputColumnIndexes.map(
                    function (
                        columnIndex,
                        outputColumnIndex,
                    ) {
                        return formatPurposeColumnValue(
                            purpose,
                            purpose.columns[
                                outputColumnIndex
                            ],
                            sourceRow[
                                columnIndex
                            ],
                        );
                    },
                );

            const priorityTimestamp =
                oldestColumnIndex ===
                    undefined
                    ? Number.NaN
                    : parseComparableDateTime(
                        sourceRow[
                            oldestColumnIndex
                        ],
                    );

            const selectedResult =
                selectedResultByValue.get(
                    filterValue,
                );

            const shouldReplace =
                !selectedResult ||
                (
                    purpose.keepFirstOccurrence !==
                        true &&
                    (
                        oldestColumnIndex ===
                            undefined ||
                        (
                            Number.isFinite(
                                priorityTimestamp,
                            ) &&
                            (
                                !Number.isFinite(
                                    selectedResult
                                        .priorityTimestamp,
                                ) ||
                                priorityTimestamp <
                                    selectedResult
                                        .priorityTimestamp
                            )
                        )
                    )
                );

            if (shouldReplace) {
                selectedResultByValue.set(
                    filterValue,
                    {
                        resultRow,
                        priorityTimestamp,
                    },
                );
            }
        },
    );

    /*
     * Mantém uma única linha para cada valor colado.
     * Finalidades com oldestByColumn usam a data mais
     * antiga; keepFirstOccurrence mantém a primeira
     * linha da planilha; as demais mantêm a última.
     * A montagem abaixo preserva a ordem da textarea.
     */

    const orderedResultRows =
        uniqueValues
            .map(
                function (value) {
                    return selectedResultByValue
                        .get(
                            normalizeText(
                                value,
                            ),
                        )
                        ?.resultRow;
                },
            );

    const matchedRows =
        orderedResultRows.filter(
            Boolean,
        );

    const previewRows =
        purpose.preserveUnmatchedRows
            ? orderedResultRows.map(
                function (
                    resultRow,
                    valueIndex,
                ) {
                    if (resultRow) {
                        return resultRow;
                    }

                    return purpose.columns.map(
                        function (column) {
                            return normalizeText(
                                column,
                            ) === normalizeText(
                                purpose.filterColumn,
                            )
                                ? uniqueValues[
                                    valueIndex
                                ]
                                : "-";
                        },
                    );
                },
            )
            : matchedRows;

    const matchedValues =
        new Set(
            selectedResultByValue.keys(),
        );

    const unmatchedValues =
        uniqueValues.filter(
            function (value) {
                return !matchedValues.has(
                    normalizeText(value),
                );
            },
        );

    filterState.resultRows =
        purpose.preserveUnmatchedRows
            ? previewRows
            : matchedRows;

    filterState.unmatchedValues =
        unmatchedValues;

    renderPreview(
        purpose,
        previewRows,
        matchedRows.length,
        unmatchedValues,
    );

    const hasResults =
        filterState.resultRows.length > 0;

    elements.copyButton.disabled =
        !hasResults;

    elements.saveButton.disabled =
        !hasResults;

    const duplicateCount =
        values.length -
        uniqueValues.length;

    const duplicateMessage =
        duplicateCount > 0
            ? ` ${duplicateCount} valor(es) repetido(s) foram considerados uma única vez.`
            : "";

    if (matchedRows.length === 0) {
        setNotification(
            "Nenhum valor informado foi encontrado no arquivo.",
            "warning",
        );

        return;
    }

    const unmatchedMessage =
        unmatchedValues.length > 0
            ? ` ${unmatchedValues.length} valor(es) não foram encontrados.`
            : "";

    setNotification(
        `Filtragem concluída com ${matchedRows.length} linha(s).${unmatchedMessage}${duplicateMessage}`,
        unmatchedValues.length > 0
            ? "warning"
            : "success",
    );
}

function createSafeFileBaseName(
    fileName,
) {
    return String(fileName)
        .replace(/\.[^.]+$/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
        "arquivo-filtrado";
}

function downloadBlob(
    blob,
    fileName,
) {
    const downloadUrl =
        URL.createObjectURL(blob);

    const downloadLink =
        document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;

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

function createFilteredWorksheet(
    purpose,
    includeHeaders = true,
) {
    const ignoredExportColumns =
        new Set(
            (
                purpose.exportIgnoredColumns ??
                []
            ).map(
                normalizeText,
            ),
        );

    const exportColumnIndexes =
        purpose.columns.reduce(
            function (
                columnIndexes,
                column,
                columnIndex,
            ) {
                if (
                    !ignoredExportColumns.has(
                        normalizeText(
                            column,
                        ),
                    )
                ) {
                    columnIndexes.push(
                        columnIndex,
                    );
                }

                return columnIndexes;
            },
            [],
        );

    const exportRows =
        filterState.resultRows.map(
            function (row) {
                return exportColumnIndexes.map(
                    function (columnIndex) {
                        return row[columnIndex];
                    },
                );
            },
        );

    const matrix =
        includeHeaders
            ? [
                exportColumnIndexes.map(
                    function (columnIndex) {
                        return purpose.columns[
                            columnIndex
                        ];
                    },
                ),
                ...exportRows,
            ]
            : exportRows;

    return window.XLSX.utils
        .aoa_to_sheet(
            matrix,
        );
}

async function copyFilteredData() {
    const purpose =
        FILTER_PURPOSES[
            elements.purpose.value
        ];

    if (
        !purpose ||
        filterState.resultRows.length === 0
    ) {
        setNotification(
            "Aplique uma filtragem com resultados antes de copiar.",
            "warning",
        );

        return;
    }

    if (
        !window.XLSX ||
        !navigator.clipboard ||
        typeof navigator.clipboard
            .writeText !== "function"
    ) {
        setNotification(
            "O navegador não permitiu copiar os dados filtrados.",
            "error",
        );

        return;
    }

    const worksheet =
        createFilteredWorksheet(
            purpose,
            false,
        );

    const clipboardContent =
        window.XLSX.utils
            .sheet_to_csv(
                worksheet,
                {
                    FS: "\t",
                    RS: "\n",
                },
            );

    try {
        await navigator.clipboard
            .writeText(
                clipboardContent,
            );

        setNotification(
            `${filterState.resultRows.length} linha(s) filtrada(s) copiada(s) para a área de transferência.`,
            "success",
        );
    } catch (error) {
        console.error(
            "Não foi possível copiar os dados filtrados:",
            error,
        );

        setNotification(
            "Não foi possível copiar os dados filtrados.",
            "error",
        );
    }
}

function saveFilteredFile() {
    const purpose =
        FILTER_PURPOSES[
            elements.purpose.value
        ];

    if (
        !purpose ||
        filterState.resultRows.length === 0
    ) {
        setNotification(
            "Aplique uma filtragem com resultados antes de salvar.",
            "warning",
        );

        return;
    }

    if (!window.XLSX) {
        setNotification(
            "A biblioteca de exportação não foi carregada.",
            "error",
        );

        return;
    }

    const worksheet =
        createFilteredWorksheet(
            purpose,
            purpose.includeCsvHeaders !==
                false,
        );

    const csvContent =
        window.XLSX.utils
            .sheet_to_csv(
                worksheet,
            );

    const csvBlob =
        new Blob(
            [
                "\uFEFF",
                csvContent,
            ],
            {
                type:
                    "text/csv;charset=utf-8",
            },
        );

    const fileName =
        `${createSafeFileBaseName(filterState.sourceFileName)}_${purpose.outputSuffix}.csv`;

    downloadBlob(
        csvBlob,
        fileName,
    );

    setNotification(
        `Arquivo "${fileName}" salvo com ${filterState.resultRows.length} linha(s) filtrada(s).`,
        "success",
    );
}

function handleValuesInput() {
    updateLineCount();

    if (
        filterState.resultRows.length > 0 ||
        !elements.previewResult.hidden
    ) {
        clearPreview();

        setNotification(
            "Os valores foram alterados. Aplique a filtragem novamente para atualizar a prévia.",
            "info",
        );
    }
}

elements.importButton.addEventListener(
    "click",
    function () {
        elements.fileInput.click();
    },
);

elements.fileInput.addEventListener(
    "change",
    async function () {
        const [file] =
            elements.fileInput.files;

        await importFile(file);
    },
);

elements.clearButton.addEventListener(
    "click",
    function () {
        resetPanel();

        setNotification(
            "O arquivo importado e a filtragem foram descartados.",
            "success",
        );
    },
);

if (window.jQuery) {
    window
        .jQuery(
            elements.purpose,
        )
        .on(
            "change.filterPanel",
            handlePurposeChange,
        );
} else {
    elements.purpose.addEventListener(
        "change",
        handlePurposeChange,
    );
}

elements.values.addEventListener(
    "input",
    handleValuesInput,
);

elements.applyButton.addEventListener(
    "click",
    filterRows,
);

elements.copyButton.addEventListener(
    "click",
    copyFilteredData,
);

elements.saveButton.addEventListener(
    "click",
    saveFilteredFile,
);

resetPanel();
