import {
    createColumnProfiles,
    formatCellValue,
} from "../core/value-utils.js";

const SUPPORTED_EXTENSIONS =
    new Set([
        "xlsx",
        "xls",
        "csv",
    ]);

function getFileExtension(fileName) {
    return String(fileName)
        .split(".")
        .pop()
        ?.toLocaleLowerCase(
            "pt-BR",
        ) ?? "";
}

function validateSpreadsheetFile(file) {
    if (!(file instanceof File)) {
        throw new TypeError(
            "Selecione um arquivo para importar.",
        );
    }

    if (
        !SUPPORTED_EXTENSIONS.has(
            getFileExtension(
                file.name,
            ),
        )
    ) {
        throw new Error(
            "Formato não suportado. Selecione um arquivo XLSX, XLS ou CSV.",
        );
    }

    if (file.size === 0) {
        throw new Error(
            "O arquivo selecionado está vazio.",
        );
    }
}

async function readFileData(
    file,
    extension,
) {
    const fileData =
        await file.arrayBuffer();

    if (extension !== "csv") {
        return {
            data: fileData,
            type: "array",
        };
    }

    try {
        return {
            data: new TextDecoder(
                "utf-8",
                {
                    fatal: true,
                },
            ).decode(fileData),
            type: "string",
        };
    } catch {
        return {
            data: new TextDecoder(
                "windows-1252",
            ).decode(fileData),
            type: "string",
        };
    }
}

function getXlsxLibrary() {
    if (
        !window.XLSX ||
        typeof window.XLSX.read !==
            "function"
    ) {
        throw new Error(
            "A biblioteca de leitura de planilhas não foi carregada.",
        );
    }

    return window.XLSX;
}

function createHeaders(
    headerRow,
    columnCount,
) {
    return Array.from(
        {
            length: columnCount,
        },
        function (
            unusedValue,
            columnIndex,
        ) {
            return (
                formatCellValue(
                    headerRow[
                        columnIndex
                    ],
                ).trim() ||
                `Coluna ${columnIndex + 1}`
            );
        },
    );
}

function normalizeRows(
    rows,
    columnCount,
) {
    return rows.map(
        function (row) {
            return Array.from(
                {
                    length:
                        columnCount,
                },
                function (
                    unusedValue,
                    columnIndex,
                ) {
                    return (
                        row[
                            columnIndex
                        ] ?? ""
                    );
                },
            );
        },
    );
}

async function readSpreadsheetFile(
    file,
) {
    validateSpreadsheetFile(file);

    const xlsx =
        getXlsxLibrary();

    const extension =
        getFileExtension(
            file.name,
        );

    const fileData =
        await readFileData(
            file,
            extension,
        );

    const workbook =
        xlsx.read(
            fileData.data,
            {
                type: fileData.type,
                cellDates: true,
                cellFormula: false,
            },
        );

    const sheetName =
        workbook.SheetNames?.[0];

    if (!sheetName) {
        throw new Error(
            "O arquivo não possui nenhuma aba legível.",
        );
    }

    const worksheet =
        workbook.Sheets[
            sheetName
        ];

    const matrix =
        xlsx.utils.sheet_to_json(
            worksheet,
            {
                header: 1,
                defval: "",
                raw: false,
                blankrows: false,
            },
        );

    if (matrix.length === 0) {
        throw new Error(
            "A primeira aba do arquivo está vazia.",
        );
    }

    const columnCount =
        matrix.reduce(
            function (
                largestColumnCount,
                row,
            ) {
                return Math.max(
                    largestColumnCount,
                    row.length,
                );
            },
            0,
        );

    if (columnCount === 0) {
        throw new Error(
            "A primeira aba do arquivo não possui colunas.",
        );
    }

    const headers =
        createHeaders(
            matrix[0] ?? [],
            columnCount,
        );

    const rows = normalizeRows(
        matrix.slice(1),
        columnCount,
    );

    const columnProfiles =
        createColumnProfiles(
            headers,
            rows,
        );

    return Object.freeze({
        columnCount,
        columnProfiles:
            Object.freeze(
                columnProfiles,
            ),
        headers:
            Object.freeze(headers),
        rows:
            Object.freeze(rows),
        sheetName,
        sourceFileName: file.name,
    });
}

export {
    SUPPORTED_EXTENSIONS,
    readSpreadsheetFile,
};
