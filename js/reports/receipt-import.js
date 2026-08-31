import {
    replaceReceiptOperators,
} from "./receipt-state.js";

/* CONFIGURAÇÕES */

const MAX_RECEIPT_FILE_SIZE =
    10 * 1024 * 1024;

const RECEIPT_TRACKING_COLUMN_INDEX = 0;
const RECEIPT_OPERATOR_COLUMN_INDEX = 3;
const MAX_RECEIPT_HEADER_SEARCH_ROWS = 50;

const RECEIPT_FILE_EXTENSIONS =
    new Set([
        "csv",
        "xlsx",
        "xls",
    ]);

const receiptTrackingColumnAliases =
    new Set([
        "spx tracking number",
        "tracking number",
        "spx tracking no",
        "numero de rastreio",
        "codigo de rastreio",
    ]);

const receiptOperatorColumnAliases =
    new Set([
        "operator",
        "operador",
        "receiver",
        "recebedor",
    ]);

/* NORMALIZAÇÕES */

function normalizeReceiptColumnName(
    value,
) {
    return String(value ?? "")
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

function normalizeReceiptCell(
    value,
) {
    return String(value ?? "")
        .trim()
        .replace(
            /\s+/g,
            " ",
        );
}

function normalizeReceiptTracking(
    value,
) {
    return String(value ?? "")
        .trim()
        .replace(
            /\s+/g,
            "",
        )
        .toUpperCase();
}

function normalizeReceiptOperatorKey(
    value,
) {
    return normalizeReceiptCell(
        value,
    ).toLocaleLowerCase(
        "pt-BR",
    );
}

/* LOCALIZA O CABEÇALHO */

function isReceiptHeaderRow(
    row,
) {
    if (!Array.isArray(row)) {
        return false;
    }

    const trackingHeader =
        normalizeReceiptColumnName(
            row[
                RECEIPT_TRACKING_COLUMN_INDEX
            ],
        );

    const operatorHeader =
        normalizeReceiptColumnName(
            row[
                RECEIPT_OPERATOR_COLUMN_INDEX
            ],
        );

    return (
        receiptTrackingColumnAliases.has(
            trackingHeader,
        ) &&
        receiptOperatorColumnAliases.has(
            operatorHeader,
        )
    );
}

function findReceiptHeaderRowIndex(
    rows,
) {
    const searchLimit =
        Math.min(
            rows.length,
            MAX_RECEIPT_HEADER_SEARCH_ROWS,
        );

    for (
        let rowIndex = 0;
        rowIndex < searchLimit;
        rowIndex += 1
    ) {
        if (
            isReceiptHeaderRow(
                rows[rowIndex],
            )
        ) {
            return rowIndex;
        }
    }

    return -1;
}

/* LOCALIZA A ABA DA BASE */

function readReceiptWorksheetRows(
    worksheet,
) {
    return window.XLSX.utils
        .sheet_to_json(
            worksheet,
            {
                header: 1,
                defval: "",
                raw: false,
                blankrows: false,
            },
        );
}

function findReceiptSource(
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
            readReceiptWorksheetRows(
                worksheet,
            );

        const headerRowIndex =
            findReceiptHeaderRowIndex(
                rows,
            );

        if (
            headerRowIndex !== -1
        ) {
            return {
                sheetName,
                rows,
                headerRowIndex,
            };
        }
    }

    throw new Error(
        "Nenhuma aba possui as colunas SPX Tracking Number e Operator nas posições A e D.",
    );
}

/* AGRUPA OS PACOTES POR RECEBEDOR */

function createReceiptOperators(
    rows,
    headerRowIndex,
) {
    const operatorsByName =
        new Map();

    const importedTrackings =
        new Set();

    let duplicateTrackings = 0;

    for (
        let rowIndex =
            headerRowIndex + 1;
        rowIndex < rows.length;
        rowIndex += 1
    ) {
        const row =
            rows[rowIndex];

        const tracking =
            normalizeReceiptTracking(
                row?.[
                    RECEIPT_TRACKING_COLUMN_INDEX
                ],
            );

        const receiver =
            normalizeReceiptCell(
                row?.[
                    RECEIPT_OPERATOR_COLUMN_INDEX
                ],
            );

        if (
            tracking === "" &&
            receiver === ""
        ) {
            continue;
        }

        if (tracking === "") {
            continue;
        }

        if (receiver === "") {
            throw new Error(
                `A linha ${rowIndex + 1} possui rastreio, mas não possui operador.`,
            );
        }

        if (
            importedTrackings.has(
                tracking,
            )
        ) {
            duplicateTrackings++;
            continue;
        }

        importedTrackings.add(
            tracking,
        );

        const operatorKey =
            normalizeReceiptOperatorKey(
                receiver,
            );

        if (
            !operatorsByName.has(
                operatorKey,
            )
        ) {
            operatorsByName.set(
                operatorKey,
                {
                    receiver,
                    packagesReceived: 0,
                },
            );
        }

        const operator =
            operatorsByName.get(
                operatorKey,
            );

        operator.packagesReceived++;
    }

    if (
        importedTrackings.size === 0
    ) {
        throw new Error(
            "Nenhum rastreio válido foi encontrado na base.",
        );
    }

    return {
        operators:
            Array.from(
                operatorsByName.values(),
            ),

        importedPackages:
            importedTrackings.size,

        duplicateTrackings,
    };
}

/* LÊ O ARQUIVO */

async function readReceiptFile(
    file,
) {
    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    if (
        !RECEIPT_FILE_EXTENSIONS.has(
            extension,
        )
    ) {
        throw new Error(
            "Selecione um arquivo CSV, XLSX ou XLS.",
        );
    }

    if (
        file.size >
        MAX_RECEIPT_FILE_SIZE
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

    const workbook =
        window.XLSX.read(
            fileBuffer,
            {
                type: "array",
            },
        );

    if (
        workbook.SheetNames
            .length === 0
    ) {
        throw new Error(
            "O arquivo não possui nenhuma planilha.",
        );
    }

    const source =
        findReceiptSource(
            workbook,
        );

    return {
        ...createReceiptOperators(
            source.rows,
            source.headerRowIndex,
        ),

        sheetName:
            source.sheetName,
    };
}

/* CONTROLE VISUAL DO BOTÃO */

async function importReceiptFile(
    file,
    importButton,
) {
    const originalLabel =
        importButton.textContent
            .trim();

    const originalTitle =
        importButton.title;

    importButton.disabled =
        true;

    importButton.textContent =
        "Importando...";

    try {
        const result =
            await readReceiptFile(
                file,
            );

        replaceReceiptOperators(
            result.operators,
        );

        importButton.textContent =
            "Importação Concluída";

        importButton.title =
            `${result.importedPackages} pacotes únicos e ` +
            `${result.operators.length} recebedores importados.`;

        if (
            result.duplicateTrackings >
            0
        ) {
            console.warn(
                `${result.duplicateTrackings} rastreios duplicados foram ignorados.`,
            );
        }
    } catch (error) {
        console.error(
            "Não foi possível importar o recebimento:",
            error,
        );

        importButton.textContent =
            "Erro na Importação";

        importButton.title =
            error instanceof Error
                ? error.message
                : "Não foi possível importar o arquivo.";
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
            1800,
        );
    }
}

/* INICIALIZAÇÃO */

function initializeReceiptImport() {
    const importButton =
        document.getElementById(
            "receiptImportButton",
        );

    const fileInput =
        document.getElementById(
            "receiptFileInput",
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
            .receiptImportInitialized ===
        "true"
    ) {
        return true;
    }

    fileInput.dataset
        .receiptImportInitialized =
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
                await importReceiptFile(
                    file,
                    importButton,
                );
            } finally {
                fileInput.value =
                    "";
            }
        },
    );

    return true;
}

export {
    initializeReceiptImport,
};
