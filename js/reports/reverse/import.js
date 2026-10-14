import {
    REVERSE_TYPE_DEFINITIONS,
    createEmptyReverseQuantities,
    createReverseTransfer,
    normalizeReverseSearchText,
    normalizeReverseText,
    normalizeReverseType,
} from "./model.js";

import {
    upsertReverseTransfer,
} from "./state.js";

import {
    setReportNotification,
} from "../report-notifications.js";

import {
    requestReverseImportType,
} from "./import-type.js";

const MAX_REVERSE_FILE_SIZE =
    10 * 1024 * 1024;

const reverseFileExtensions =
    new Set([
        "xlsx",
        "xls",
        "csv",
    ]);

function findReverseDetailHeader(
    rows,
) {
    for (
        let rowIndex = 0;
        rowIndex < rows.length;
        rowIndex += 1
    ) {
        const headers =
            Array.isArray(rows[rowIndex])
                ? rows[rowIndex].map(
                    normalizeReverseSearchText,
                )
                : [];

        const trackingNumber =
            headers.findIndex(
                function (header) {
                    return header ===
                        "spx tracking number" ||
                        header ===
                        "tracking number" ||
                        header ===
                        "codigo br";
                },
            );

        if (trackingNumber >= 0) {
            return {
                rowIndex,
                trackingNumber,
            };
        }
    }

    return null;
}

function createReverseMetadata(
    rows,
    headerRowIndex,
) {
    const metadata =
        new Map();

    for (
        let rowIndex = 0;
        rowIndex < headerRowIndex;
        rowIndex += 1
    ) {
        const row =
            rows[rowIndex];

        const label =
            normalizeReverseSearchText(
                row?.[0],
            );

        if (label) {
            metadata.set(
                label,
                row?.[1] ?? "",
            );
        }
    }

    const firstRowHeaders =
        Array.isArray(rows[0])
            ? rows[0].map(
                normalizeReverseSearchText,
            )
            : [];

    const valuesRow =
        rows[2] || [];

    const scannedOrdersColumn =
        firstRowHeaders.indexOf(
            "total scanned orders",
        );

    const totalOrdersColumn =
        firstRowHeaders.indexOf(
            "total actual orders",
        );

    return {
        destination:
            metadata.get("receiver") ||
            "",
        completedAt:
            metadata.get(
                "to complete time",
            ) ||
            metadata.get(
                "to created time",
            ) ||
            "",
        scannedOrders:
            scannedOrdersColumn >= 0
                ? valuesRow[
                    scannedOrdersColumn
                ]
                : metadata.get(
                    "total orders",
                ),
        totalOrders:
            totalOrdersColumn >= 0
                ? valuesRow[
                    totalOrdersColumn
                ]
                : metadata.get(
                    "total orders",
                ),
    };
}

function createReverseImportRecord(
    rows,
    {
        sourceFileName = "",
        reverseType,
    } = {},
) {
    const typeKey = normalizeReverseType(reverseType);

    if (!typeKey) {
        throw new Error("Escolha o tipo da TO antes de importar a reversa.");
    }

    if (!Array.isArray(rows)) {
        throw new TypeError(
            "O conteúdo do arquivo de reversa é inválido.",
        );
    }

    const to =
        normalizeReverseText(
            rows[1]?.[1],
        ).toUpperCase();

    if (!/^TO[A-Z0-9]+$/.test(to)) {
        throw new Error(
            "Não encontrei uma TO válida na célula B2.",
        );
    }

    const detailHeader =
        findReverseDetailHeader(
            rows,
        );

    if (!detailHeader) {
        throw new Error(
            "Não encontrei a coluna de pacotes da reversa.",
        );
    }

    const quantities =
        createEmptyReverseQuantities();

    const seenTrackingNumbers =
        new Set();

    for (
        let rowIndex =
            detailHeader.rowIndex + 1;
        rowIndex < rows.length;
        rowIndex += 1
    ) {
        const row =
            rows[rowIndex];

        const trackingNumber =
            normalizeReverseText(
                row?.[
                    detailHeader
                        .trackingNumber
                ],
            ).toUpperCase();

        if (
            !trackingNumber ||
            seenTrackingNumbers.has(
                trackingNumber,
            )
        ) {
            continue;
        }

        seenTrackingNumbers.add(
            trackingNumber,
        );

        quantities[typeKey] += 1;
    }

    const metadata =
        createReverseMetadata(
            rows,
            detailHeader.rowIndex,
        );

    const transfer =
        createReverseTransfer({
            to,
            quantities,
            ...metadata,
            sourceFileName,
        });

    if (!transfer) {
        throw new Error(
            "Nenhum pacote de reversa válido foi encontrado no arquivo.",
        );
    }

    return transfer;
}

function parseReverseWorkbook(
    workbook,
    xlsx,
    options = {},
) {
    let lastError = null;

    for (
        const sheetName of
            workbook?.SheetNames || []
    ) {
        const rows =
            xlsx.utils.sheet_to_json(
                workbook.Sheets[
                    sheetName
                ],
                {
                    header: 1,
                    defval: "",
                    raw: true,
                    blankrows: true,
                },
            );

        try {
            return createReverseImportRecord(
                rows,
                options,
            );
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError ||
        new Error(
            "O arquivo não possui uma planilha de reversa válida.",
        );
}

async function readReverseFile(
    file,
    { reverseType } = {},
) {
    const typeKey = normalizeReverseType(reverseType);

    if (!typeKey) {
        throw new Error("Escolha o tipo da TO antes de importar a reversa.");
    }

    if (
        !file ||
        typeof file.arrayBuffer !==
            "function"
    ) {
        throw new TypeError(
            "Selecione um arquivo de reversa.",
        );
    }

    const extension =
        String(file.name ?? "")
            .split(".")
            .pop()
            .toLowerCase();

    if (!reverseFileExtensions.has(extension)) {
        throw new Error(
            "Selecione um arquivo CSV, XLSX ou XLS.",
        );
    }

    if (file.size > MAX_REVERSE_FILE_SIZE) {
        throw new Error(
            "O arquivo ultrapassa o limite de 10 MB.",
        );
    }

    if (
        typeof window.XLSX !== "object" ||
        typeof window.XLSX.read !==
            "function"
    ) {
        throw new Error(
            "A biblioteca de leitura de planilhas não foi carregada.",
        );
    }

    const fileBuffer =
        await file.arrayBuffer();

    let workbookData =
        fileBuffer;

    let workbookType =
        "array";

    if (extension === "csv") {
        try {
            workbookData =
                new TextDecoder(
                    "utf-8",
                    {
                        fatal: true,
                    },
                ).decode(
                    fileBuffer,
                );
            workbookType = "string";
        } catch {
            // A leitura binária continua disponível para codificações antigas.
        }
    }

    const workbook =
        window.XLSX.read(
            workbookData,
            {
                type: workbookType,
            },
        );

    return parseReverseWorkbook(
        workbook,
        window.XLSX,
        {
            reverseType: typeKey,
            sourceFileName:
                file.name,
        },
    );
}

function initializeReverseImport(
    rootElement = document,
) {
    const importButton =
        rootElement.querySelector(
            "#reverseImportActionButton",
        );

    const fileInput =
        rootElement.querySelector(
            "#reverseFileInput",
        );

    if (
        !(importButton instanceof
            HTMLButtonElement) ||
        !(fileInput instanceof
            HTMLInputElement)
    ) {
        return false;
    }

    if (
        importButton.dataset
            .reverseImportInitialized ===
        "true"
    ) {
        return true;
    }

    importButton.dataset
        .reverseImportInitialized =
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

            fileInput.value = "";

            if (!file) {
                return;
            }

            if (importButton.disabled) {
                return;
            }

            importButton.disabled = true;
            importButton.setAttribute(
                "aria-busy",
                "true",
            );

            try {
                const reverseType =
                    await requestReverseImportType();

                if (!reverseType) {
                    return;
                }

                setReportNotification({
                    reportId: "reverse",
                    type: "info",
                    message:
                        `Importando ${file.name}...`,
                });

                const transfer =
                    await readReverseFile(
                        file,
                        { reverseType },
                    );

                const result =
                    upsertReverseTransfer(
                        transfer,
                    );

                const action =
                    result.status ===
                        "updated"
                        ? "atualizada"
                        : "adicionada";
                const typeLabel =
                    REVERSE_TYPE_DEFINITIONS[reverseType].label;

                setReportNotification({
                    reportId: "reverse",
                    type: "success",
                    message:
                        `${transfer.to} - ${typeLabel} ${action}: ` +
                        `${transfer.quantity} pacotes.`,
                });
            } catch (error) {
                console.error(
                    "Não foi possível importar o relatório de reversa.",
                    error,
                );

                const message =
                    error instanceof Error
                        ? error.message
                        : "Não foi possível importar o arquivo de reversa.";

                setReportNotification({
                    reportId: "reverse",
                    type: "error",
                    message,
                });

                window.alert(message);
            } finally {
                importButton.disabled = false;
                importButton.removeAttribute(
                    "aria-busy",
                );
            }
        },
    );

    return true;
}

export {
    createReverseImportRecord,
    findReverseDetailHeader,
    initializeReverseImport,
    parseReverseWorkbook,
    readReverseFile,
};
