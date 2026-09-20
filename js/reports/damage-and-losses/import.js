import {
    DAMAGE_MONTH_NAMES,
    replaceDamageAndLossesData,
} from "./state.js";

import {
    setReportNotification,
} from "../report-notifications.js";

const MAX_DAMAGE_FILE_SIZE =
    10 * 1024 * 1024;

const MAX_DAMAGE_HEADER_SEARCH_ROWS =
    50;

const DAMAGE_HUB_STATION =
    "LM Hub_SP_Santos_PraiaGrande_02";

const damageFileExtensions =
    new Set([
        "xlsx",
        "xls",
    ]);

const damageColumnAliases =
    Object.freeze({
        date: [
            "data",
            "date",
        ],

        currentStation: [
            "current station",
            "estacao atual",
            "estacao corrente",
        ],
    });

function normalizeDamageText(
    value,
) {
    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeDamageSearchText(
    value,
) {
    return normalizeDamageText(
        value,
    )
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

const damageMonthIndexes =
    new Map(
        DAMAGE_MONTH_NAMES.map(
            function (monthName, index) {
                return [
                    normalizeDamageSearchText(
                        monthName,
                    ),
                    index,
                ];
            },
        ),
    );

function findDamageColumns(
    row,
) {
    if (!Array.isArray(row)) {
        return null;
    }

    const headers =
        row.map(
            normalizeDamageSearchText,
        );

    const columns = {};

    for (
        const [
            field,
            aliases,
        ] of Object.entries(
            damageColumnAliases,
        )
    ) {
        const columnIndex =
            headers.findIndex(
                function (header) {
                    return aliases.includes(
                        header,
                    );
                },
            );

        if (columnIndex === -1) {
            return null;
        }

        columns[field] =
            columnIndex;
    }

    return columns;
}

function findDamageMonthSource(
    workbook,
    date = new Date(),
) {
    const currentMonthIndex =
        date.getMonth();

    const currentMonthName =
        DAMAGE_MONTH_NAMES[
            currentMonthIndex
        ];

    const sheetName =
        workbook.SheetNames.find(
            function (receivedSheetName) {
                const normalizedSheetName =
                    normalizeDamageSearchText(
                        receivedSheetName,
                    );

                return damageMonthIndexes.get(
                    normalizedSheetName,
                ) === currentMonthIndex;
            },
        );

    if (!sheetName) {
        throw new Error(
            `O arquivo não possui a aba ${currentMonthName.toUpperCase()} do mês atual.`,
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
            MAX_DAMAGE_HEADER_SEARCH_ROWS,
        );

    for (
        let rowIndex = 0;
        rowIndex < searchLimit;
        rowIndex += 1
    ) {
        const columns =
            findDamageColumns(
                rows[rowIndex],
            );

        if (columns) {
            return {
                sheetName,
                rows,
                columns,
                headerRowIndex:
                    rowIndex,
            };
        }
    }

    throw new Error(
        `A aba ${sheetName} não possui as colunas DATA e Current station.`,
    );
}

function createDamageDateParts(
    year,
    month,
    day,
) {
    const normalizedYear =
        Number(year);
    const normalizedMonth =
        Number(month);
    const normalizedDay =
        Number(day);

    const date =
        new Date(
            normalizedYear,
            normalizedMonth - 1,
            normalizedDay,
            12,
        );

    if (
        date.getFullYear() !==
            normalizedYear ||
        date.getMonth() !==
            normalizedMonth - 1 ||
        date.getDate() !==
            normalizedDay
    ) {
        return null;
    }

    return {
        year: normalizedYear,
        month: normalizedMonth,
        day: normalizedDay,

        key: [
            normalizedYear,
            String(
                normalizedMonth,
            ).padStart(2, "0"),
            String(
                normalizedDay,
            ).padStart(2, "0"),
        ].join("-"),
    };
}

function parseDamageDate(
    value,
) {
    if (
        value instanceof Date &&
        !Number.isNaN(
            value.getTime(),
        )
    ) {
        return createDamageDateParts(
            value.getFullYear(),
            value.getMonth() + 1,
            value.getDate(),
        );
    }

    if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        window.XLSX?.SSF
            ?.parse_date_code
    ) {
        const parsed =
            window.XLSX.SSF
                .parse_date_code(
                    value,
                );

        if (parsed) {
            return createDamageDateParts(
                parsed.y,
                parsed.m,
                parsed.d,
            );
        }
    }

    const receivedValue =
        normalizeDamageText(
            value,
        );

    const brazilianDateMatch =
        receivedValue.match(
            /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})(?:\D.*)?$/,
        );

    if (brazilianDateMatch) {
        const receivedYear =
            Number(
                brazilianDateMatch[3],
            );

        return createDamageDateParts(
            receivedYear < 100
                ? 2000 + receivedYear
                : receivedYear,
            brazilianDateMatch[2],
            brazilianDateMatch[1],
        );
    }

    const isoDateMatch =
        receivedValue.match(
            /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\D.*)?$/,
        );

    return isoDateMatch
        ? createDamageDateParts(
            isoDateMatch[1],
            isoDateMatch[2],
            isoDateMatch[3],
        )
        : null;
}

function createDamageMonthData(
    source,
    date = new Date(),
) {
    const monthIndex =
        date.getMonth();

    const year =
        date.getFullYear();

    const daysByDate =
        new Map();

    let ignoredRows = 0;

    for (
        let rowIndex =
            source.headerRowIndex + 1;
        rowIndex < source.rows.length;
        rowIndex += 1
    ) {
        const row =
            source.rows[rowIndex];

        const receivedDate =
            row?.[
                source.columns.date
            ];

        if (
            normalizeDamageText(
                receivedDate,
            ) === ""
        ) {
            continue;
        }

        const parsedDate =
            parseDamageDate(
                receivedDate,
            );

        if (
            !parsedDate ||
            parsedDate.month - 1 !==
                monthIndex ||
            parsedDate.year !== year
        ) {
            ignoredRows += 1;
            continue;
        }

        const day =
            daysByDate.get(
                parsedDate.key,
            ) || {
                date: parsedDate.key,
                hub: 0,
                soc: 0,
            };

        const currentStation =
            normalizeDamageText(
                row?.[
                    source.columns
                        .currentStation
                ],
            );

        if (
            currentStation ===
            DAMAGE_HUB_STATION
        ) {
            day.hub += 1;
        } else {
            day.soc += 1;
        }

        daysByDate.set(
            parsedDate.key,
            day,
        );
    }

    const days =
        Array.from(
            daysByDate.values(),
        ).sort(
            function (first, second) {
                return first.date.localeCompare(
                    second.date,
                );
            },
        );

    const importedRows =
        days.reduce(
            function (total, day) {
                return total +
                    day.hub +
                    day.soc;
            },
            0,
        );

    if (importedRows === 0) {
        throw new Error(
            `Nenhuma avaria de ${DAMAGE_MONTH_NAMES[monthIndex]} de ${year} foi encontrada.`,
        );
    }

    return {
        monthIndex,
        year,
        days,
        importedRows,
        ignoredRows,
    };
}

async function readDamageAndLossesFile(
    file,
    date = new Date(),
) {
    const extension =
        file.name
            .split(".")
            .pop()
            .toLocaleLowerCase(
                "pt-BR",
            );

    if (
        !damageFileExtensions.has(
            extension,
        )
    ) {
        throw new Error(
            "Selecione um arquivo XLSX ou XLS.",
        );
    }

    if (
        file.size >
        MAX_DAMAGE_FILE_SIZE
    ) {
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

    const workbook =
        window.XLSX.read(
            fileBuffer,
            {
                type: "array",
                cellDates: true,
            },
        );

    if (
        workbook.SheetNames.length === 0
    ) {
        throw new Error(
            "O arquivo não possui nenhuma planilha.",
        );
    }

    const source =
        findDamageMonthSource(
            workbook,
            date,
        );

    return {
        ...createDamageMonthData(
            source,
            date,
        ),

        sourceFileName:
            file.name,

        sourceSheetName:
            source.sheetName,
    };
}

async function importDamageAndLossesFile(
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
        "Importando avarias...";
    importButton.setAttribute(
        "aria-label",
        "Importando avarias",
    );
    importButton.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const result =
            await readDamageAndLossesFile(
                file,
            );

        replaceDamageAndLossesData(
            result,
        );

        const hub =
            result.days.reduce(
                function (total, day) {
                    return total +
                        day.hub;
                },
                0,
            );

        const soc =
            result.importedRows - hub;

        setReportNotification({
            reportId:
                "damage-and-losses",

            type:
                result.ignoredRows > 0
                    ? "warning"
                    : "success",

            message:
                `${result.importedRows.toLocaleString("pt-BR")} avarias importadas da aba ${result.sourceSheetName}: ` +
                `${hub.toLocaleString("pt-BR")} do Hub e ${soc.toLocaleString("pt-BR")} do Soc.` +
                (
                    result.ignoredRows > 0
                        ? ` ${result.ignoredRows.toLocaleString("pt-BR")} linha(s) fora do mês atual ou sem data válida foram ignoradas.`
                        : ""
                ),
        });
    } catch (error) {
        console.error(
            "Não foi possível importar as avarias:",
            error,
        );

        setReportNotification({
            reportId:
                "damage-and-losses",

            type: "error",

            message:
                error instanceof Error
                    ? error.message
                    : "Não foi possível importar a planilha de avarias.",
        });
    } finally {
        importButton.title =
            originalTitle;

        if (originalAriaLabel) {
            importButton.setAttribute(
                "aria-label",
                originalAriaLabel,
            );
        }

        importButton.removeAttribute(
            "aria-busy",
        );
        importButton.disabled = false;
    }
}

function initializeDamageAndLossesImport(
    rootElement =
        document.getElementById(
            "damage-and-losses",
        ),
) {
    const panel =
        rootElement instanceof HTMLElement
            ? rootElement
            : null;

    const importButton =
        panel?.querySelector(
            "#damageAndLossesImportButton",
        );

    const fileInput =
        panel?.querySelector(
            "#damageAndLossesFileInput",
        );

    if (
        !(panel instanceof HTMLElement) ||
        !(importButton instanceof HTMLButtonElement) ||
        !(fileInput instanceof HTMLInputElement)
    ) {
        return false;
    }

    if (
        fileInput.dataset
            .damageImportInitialized ===
        "true"
    ) {
        return true;
    }

    fileInput.dataset
        .damageImportInitialized =
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
                await importDamageAndLossesFile(
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
    DAMAGE_HUB_STATION,
    createDamageMonthData,
    findDamageMonthSource,
    initializeDamageAndLossesImport,
    parseDamageDate,
    readDamageAndLossesFile,
};
