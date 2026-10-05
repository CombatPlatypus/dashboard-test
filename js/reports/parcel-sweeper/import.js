import {
    createParcelRow,
    createParcelSummary,
    normalizeParcelColumnName,
    normalizeParcelText,
} from "./model.js";

import {
    replaceParcelRows,
} from "./state.js";

import {
    setReportNotification,
} from "../report-notifications.js";

const MAX_PARCEL_FILE_SIZE =
    10 * 1024 * 1024;

const MAX_PARCEL_HEADER_SEARCH_ROWS =
    50;

const parcelFileExtensions =
    new Set([
        "csv",
        "xlsx",
        "xls",
    ]);

const parcelColumnAliases = {
    trackingNumber: [
        "spx tracking number",
        "tracking number",
        "codigo br",
    ],
    scannedStatus: [
        "scanned status",
    ],
    expediteTag: [
        "expedite tag",
    ],
    finalStatus: [
        "final status",
    ],
    sortCode: [
        "sort code",
    ],
    nextStepAction: [
        "next step action",
    ],
    onHoldTimes: [
        "onhold times",
        "on hold times",
    ],
    countType: [
        "count type",
        "content type",
    ],
    expected: [
        "expected",
    ],
    operator: [
        "operator",
    ],
    agingTime: [
        "aging time",
    ],
    scannedTime: [
        "scanned time",
    ],
};

const requiredParcelColumns =
    Object.freeze([
        "trackingNumber",
        "scannedStatus",
        "countType",
        "operator",
        "agingTime",
        "scannedTime",
    ]);

function findParcelColumns(
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
            normalizeParcelColumnName,
        );

    const columns = {};

    Object.entries(
        parcelColumnAliases,
    ).forEach(
        function ([
            field,
            aliases,
        ]) {
            columns[field] =
                normalizedHeaders
                    .findIndex(
                        function (header) {
                            return aliases.includes(
                                header,
                            );
                        },
                    );
        },
    );

    const hasRequiredColumns =
        requiredParcelColumns
            .every(
                function (field) {
                    return columns[field] !==
                        -1;
                },
            );

    return hasRequiredColumns
        ? columns
        : null;
}

function findParcelSource(
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
                MAX_PARCEL_HEADER_SEARCH_ROWS,
            );

        for (
            let rowIndex = 0;
            rowIndex < searchLimit;
            rowIndex += 1
        ) {
            const columns =
                findParcelColumns(
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
        "Não encontrei as colunas do Parcel Sweeper no arquivo.",
    );
}

function createParcelRows(
    source,
) {
    const rows = [];

    for (
        let rowIndex =
            source.headerRowIndex + 1;
        rowIndex <
            source.rows.length;
        rowIndex += 1
    ) {
        const sourceRow =
            source.rows[rowIndex];

        const getValue =
            function (field) {
                const columnIndex =
                    source.columns[field];

                return columnIndex >= 0
                    ? sourceRow?.[
                        columnIndex
                    ]
                    : "";
            };

        const trackingNumber =
            normalizeParcelText(
                getValue(
                    "trackingNumber",
                ),
            );

        if (!trackingNumber) {
            continue;
        }

        rows.push(
            createParcelRow({
                trackingNumber,
                scannedStatus:
                    getValue(
                        "scannedStatus",
                    ),
                expediteTag:
                    getValue(
                        "expediteTag",
                    ),
                finalStatus:
                    getValue(
                        "finalStatus",
                    ),
                sortCode:
                    getValue(
                        "sortCode",
                    ),
                nextStepAction:
                    getValue(
                        "nextStepAction",
                    ),
                onHoldTimes:
                    getValue(
                        "onHoldTimes",
                    ),
                countType:
                    getValue(
                        "countType",
                    ),
                expected:
                    getValue(
                        "expected",
                    ),
                operator:
                    getValue(
                        "operator",
                    ),
                agingTime:
                    getValue(
                        "agingTime",
                    ),
                scannedTime:
                    getValue(
                        "scannedTime",
                    ),
            }),
        );
    }

    if (
        rows.length === 0
    ) {
        throw new Error(
            "Nenhum pacote válido foi encontrado no arquivo.",
        );
    }

    return rows;
}

async function readParcelFile(
    file,
) {
    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    if (
        !parcelFileExtensions.has(
            extension,
        )
    ) {
        throw new Error(
            "Selecione um arquivo CSV, XLSX ou XLS.",
        );
    }

    if (
        file.size >
        MAX_PARCEL_FILE_SIZE
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

    let workbookData = fileBuffer;
    let workbookType = "array";

    if (extension === "csv") {
        try {
            // A leitura binária da biblioteca altera acentos em CSV UTF-8.
            workbookData = new TextDecoder("utf-8", { fatal: true })
                .decode(fileBuffer);
            workbookType = "string";
        } catch {
            // Mantém a leitura original para CSV em codificações antigas.
        }
    }

    const workbook =
        window.XLSX.read(
            workbookData,
            {
                type: workbookType,
            },
        );

    const source =
        findParcelSource(
            workbook,
        );

    return {
        rows:
            createParcelRows(
                source,
            ),
        sheetName:
            source.sheetName,
    };
}

async function importParcelFile(
    file,
    importButton,
) {
    const originalTitle =
        importButton.title;

    const originalAriaLabel =
        importButton.getAttribute(
            "aria-label",
        );

    importButton.disabled = true;
    importButton.title =
        "Importando arquivo do Parcel Sweeper...";
    importButton.setAttribute(
        "aria-label",
        "Importando arquivo do Parcel Sweeper",
    );
    importButton.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const result =
            await readParcelFile(
                file,
            );

        replaceParcelRows(
            result.rows,
            file.name,
        );

        const summary =
            createParcelSummary(
                result.rows,
            );

        setReportNotification({
            reportId: "parcel",
            type: "success",
            message:
                `${summary.totalRows.toLocaleString("pt-BR")} pacotes importados de ${file.name}.`,
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Não foi possível importar o arquivo.";

        console.error(
            "Não foi possível importar o Parcel Sweeper:",
            error,
        );

        setReportNotification({
            reportId: "parcel",
            type: "error",
            message:
                `Falha na importação: ${message}`,
        });

        window.alert(
            message,
        );
    } finally {
        importButton.disabled = false;
        importButton.title =
            originalTitle;
        importButton.removeAttribute(
            "aria-busy",
        );

        if (originalAriaLabel) {
            importButton.setAttribute(
                "aria-label",
                originalAriaLabel,
            );
        }
    }
}

function initializeParcelImport(
    rootElement = document,
) {
    const importButton =
        rootElement.querySelector(
            "#parcelImportActionButton",
        );

    const fileInput =
        rootElement.querySelector(
            "#parcelFileInput",
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
        return false;
    }

    if (
        fileInput.dataset
            .parcelImportInitialized ===
        "true"
    ) {
        return true;
    }

    fileInput.dataset
        .parcelImportInitialized =
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
                await importParcelFile(
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
    createParcelRows,
    findParcelColumns,
    findParcelSource,
    initializeParcelImport,
    readParcelFile,
};
