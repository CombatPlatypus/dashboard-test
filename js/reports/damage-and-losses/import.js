import {
    DAMAGE_MONTH_NAMES,
    replaceDamageAndLossesData,
} from "./state.js";

import {
    replaceLossesData,
} from "./losses-state.js";

import {
    setReportNotification,
} from "../report-notifications.js";

import {
    replaceLossesRateHistory,
} from "../losses-rate/state.js";

import {
    findLossesRateWorkbookHistory,
} from "../losses-rate/workbook.js";

const MAX_DAMAGE_HEADER_SEARCH_ROWS =
    50;

const DAMAGE_HUB_STATION =
    "LM Hub_SP_Santos_PraiaGrande_02";

const DAMAGE_HISTORY_SHEET_NAME =
    "historico de avarias";

const DAMAGE_PRODUCT_SHEET_NAME =
    "avarias recebidas";

const DAMAGE_BASE_SHEET_NAME =
    "base de avarias";

const LOSSES_HISTORY_SHEET_NAME =
    "historico de analises";

const LOSSES_RECOVERY_SHEET_NAME =
    "pack recovery";

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

        packageCode: [
            "codigo br",
            "codigo do pacote",
            "package code",
            "tracking number",
        ],
    });

const damageBaseColumnAliases =
    Object.freeze({
        packageCode: [
            "codigo br",
            "codigo do pacote",
            "package code",
            "tracking number",
        ],

        currentStation: [
            "estacao inicial",
        ],
    });

const damageProductColumnAliases =
    Object.freeze({
        packageCode: [
            "codigo br",
            "codigo do pacote",
            "package code",
            "tracking number",
        ],

        productType: [
            "tipo de produto",
            "tipo produto",
            "product type",
        ],
    });

const lossesColumnAliases =
    Object.freeze({
        date: [
            "data",
            "date",
        ],

        situation: [
            "situacao",
            "status",
        ],

        packageCode: [
            "codigo br",
            "codigo do pacote",
            "package code",
            "tracking number",
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

function findColumnsByAliases(
    row,
    aliasesByField,
) {
    if (!Array.isArray(row)) {
        return null;
    }

    const headers =
        row.map(
            normalizeDamageSearchText,
        );

    const columns =
        Object.fromEntries(
            Object.entries(
                aliasesByField,
            ).map(
                function ([field, aliases]) {
                    return [
                        field,
                        headers.findIndex(
                            function (header) {
                                return aliases.includes(
                                    header,
                                );
                            },
                        ),
                    ];
                },
            ),
        );

    return Object.values(columns).every(
        function (columnIndex) {
            return columnIndex >= 0;
        },
    )
        ? columns
        : null;
}

function isDamageHistorySheetName(value) {
    const normalizedValue =
        normalizeDamageSearchText(value);

    return normalizedValue ===
        DAMAGE_HISTORY_SHEET_NAME ||
        /^hist.*avarias$/.test(
            normalizedValue,
        );
}

function isLossesHistorySheetName(value) {
    const normalizedValue =
        normalizeDamageSearchText(value);

    return normalizedValue ===
        LOSSES_HISTORY_SHEET_NAME ||
        /^hist.*an.*lises$/.test(
            normalizedValue,
        );
}

function isDamageProductSheetName(value) {
    return normalizeDamageSearchText(
        value,
    ) === DAMAGE_PRODUCT_SHEET_NAME;
}

function isDamageBaseSheetName(value) {
    return normalizeDamageSearchText(
        value,
    ) === DAMAGE_BASE_SHEET_NAME;
}

function isLossesRecoverySheetName(value) {
    return normalizeDamageSearchText(
        value,
    ) === LOSSES_RECOVERY_SHEET_NAME;
}

function incrementDamageSocStation(
    stationsByName,
    stationKey,
    stationName,
) {
    const station =
        stationsByName.get(
            stationKey,
        );

    if (station) {
        station.count += 1;
        return;
    }

    stationsByName.set(
        stationKey,
        {
            name: stationName,
            count: 1,
        },
    );
}

function findDamageColumns(
    row,
) {
    return findColumnsByAliases(
        row,
        damageColumnAliases,
    );
}

function findDamageProductColumns(row) {
    return findColumnsByAliases(
        row,
        damageProductColumnAliases,
    );
}

function findDamageBaseColumns(row) {
    return findColumnsByAliases(
        row,
        damageBaseColumnAliases,
    );
}

function findDamageBaseSource(workbook) {
    const sheetName =
        workbook.SheetNames.find(
            isDamageBaseSheetName,
        );

    if (!sheetName) {
        throw new Error(
            "O arquivo não possui a aba Base de Avarias.",
        );
    }

    const rows =
        window.XLSX.utils.sheet_to_json(
            workbook.Sheets[sheetName],
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
            findDamageBaseColumns(
                rows[rowIndex],
            );

        if (!columns) {
            continue;
        }

        const valuesByPackageCode =
            new Map();

        rows
            .slice(rowIndex + 1)
            .forEach(
                function (row) {
                    const packageCode =
                        normalizeDamagePackageCode(
                            row?.[
                                columns.packageCode
                            ],
                        );

                    if (packageCode) {
                        valuesByPackageCode.set(
                            packageCode,
                            {
                                currentStation:
                                    row?.[
                                        columns
                                            .currentStation
                                    ],
                            },
                        );
                    }
                },
            );

        return {
            sheetName,
            valuesByPackageCode,
        };
    }

    throw new Error(
        `A aba ${sheetName} não possui as colunas Código BR e Estação Inicial.`,
    );
}

function findDamageProductSource(
    workbook,
) {
    const sheetName =
        workbook.SheetNames.find(
            isDamageProductSheetName,
        );

    if (!sheetName) {
        throw new Error(
            "O arquivo não possui a aba Avarias Recebidas.",
        );
    }

    const rows =
        window.XLSX.utils.sheet_to_json(
            workbook.Sheets[sheetName],
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
            findDamageProductColumns(
                rows[rowIndex],
            );

        if (columns) {
            const valuesByPackageCode =
                new Map();

            rows
                .slice(rowIndex + 1)
                .forEach(
                    function (row) {
                        const packageCode =
                            normalizeDamagePackageCode(
                                row?.[
                                    columns.packageCode
                                ],
                            );

                        if (packageCode) {
                            valuesByPackageCode.set(
                                packageCode,
                                row?.[
                                    columns.productType
                                ],
                            );
                        }
                    },
                );

            return {
                sheetName,
                valuesByPackageCode,
            };
        }
    }

    throw new Error(
        `A aba ${sheetName} não possui as colunas Código BR e Tipo de Produto.`,
    );
}

function findDamageMonthSource(
    workbook,
    {
        required = true,
    } = {},
) {
    const sheetName =
        workbook.SheetNames.find(
            function (receivedSheetName) {
                return isDamageHistorySheetName(
                    receivedSheetName,
                );
            },
        );

    if (!sheetName) {
        if (!required) {
            return null;
        }

        throw new Error(
            "O arquivo não possui a aba Histórico de Avarias.",
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
                baseSource:
                    findDamageBaseSource(
                        workbook,
                    ),
                productSource:
                    findDamageProductSource(
                        workbook,
                    ),
            };
        }
    }

    throw new Error(
        `A aba ${sheetName} não possui as colunas Data e Código BR.`,
    );
}

function classifyDamageProductType(
    value,
) {
    const normalizedValue =
        normalizeDamageSearchText(
            value,
        );

    if (
        normalizedValue.includes(
            "liquid",
        ) ||
        /^l.*quido$/.test(
            normalizedValue,
        )
    ) {
        return "liquid";
    }

    if (
        normalizedValue.includes(
            "vidro",
        ) ||
        normalizedValue.includes(
            "espelho",
        )
    ) {
        return "glass";
    }

    if (
        normalizedValue.includes(
            "solid",
        ) ||
        /^s.*lido$/.test(
            normalizedValue,
        ) ||
        normalizedValue.includes(
            "outro",
        )
    ) {
        return "solid";
    }

    return "";
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

function findLossesColumns(row) {
    return findColumnsByAliases(
        row,
        lossesColumnAliases,
    );
}

function findLossesRecoveryColumns(row) {
    if (!Array.isArray(row)) {
        return null;
    }

    const headers =
        row.map(normalizeDamageSearchText);
    const packageCode =
        headers.findIndex(
            function (header) {
                return lossesColumnAliases
                    .packageCode.includes(
                        header,
                    );
            },
        );
    const recovery =
        headers.findIndex(
            function (header) {
                return [
                    "situacao",
                    "pack recovery",
                    "pack recover",
                ].includes(header);
            },
        );

    return packageCode >= 0 && recovery >= 0
        ? {
            packageCode,
            recovery,
        }
        : null;
}

function normalizeDamagePackageCode(value) {
    return normalizeDamageText(value)
        .replace(/\s+/g, "")
        .toLocaleUpperCase(
            "pt-BR",
        );
}

function findLossesRecoverySource(
    workbook,
) {
    const sheetName =
        workbook.SheetNames.find(
            isLossesRecoverySheetName,
        );

    if (!sheetName) {
        throw new Error(
            "O arquivo não possui a aba Pack Recovery.",
        );
    }

    const rows =
        window.XLSX.utils.sheet_to_json(
            workbook.Sheets[sheetName],
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
            findLossesRecoveryColumns(
                rows[rowIndex],
            );

        if (!columns) {
            continue;
        }

        const valuesByPackageCode =
            new Map();

        rows
            .slice(rowIndex + 1)
            .forEach(
                function (row) {
                    const packageCode =
                        normalizeDamagePackageCode(
                            row?.[
                                columns
                                    .packageCode
                            ],
                        );
                    const recovery =
                        parseLossesBoolean(
                            row?.[
                                columns.recovery
                            ],
                        );

                    if (
                        packageCode &&
                        recovery !== null
                    ) {
                        valuesByPackageCode.set(
                            packageCode,
                            recovery,
                        );
                    }
                },
            );

        return {
            sheetName,
            valuesByPackageCode,
        };
    }

    throw new Error(
        `A aba ${sheetName} não possui as colunas Código BR e Situação.`,
    );
}

function findLossesMonthSource(
    workbook,
    {
        required = true,
    } = {},
) {
    const sheetName =
        workbook.SheetNames.find(
            function (receivedSheetName) {
                return isLossesHistorySheetName(
                    receivedSheetName,
                );
            },
        );

    if (!sheetName) {
        if (!required) {
            return null;
        }

        throw new Error(
            "O arquivo não possui a aba Histórico de Análises.",
        );
    }

    const worksheet =
        workbook.Sheets[sheetName];
    const rows =
        window.XLSX.utils.sheet_to_json(
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
    let columns = null;
    let headerRowIndex = -1;

    for (
        let rowIndex = 0;
        rowIndex < searchLimit;
        rowIndex += 1
    ) {
        columns =
            findLossesColumns(rows[rowIndex]);

        if (columns) {
            headerRowIndex = rowIndex;
            break;
        }
    }

    if (!columns) {
        throw new Error(
            `A aba ${sheetName} não possui as colunas Data, Código BR e Situação.`,
        );
    }

    const recoverySource =
        findLossesRecoverySource(
            workbook,
        );

    return {
        sheetName,
        rows,
        columns,
        headerRowIndex,
        recoverySource,
    };
}

function parseLossesBoolean(value) {
    if (typeof value === "boolean") {
        return value;
    }

    if (value === 1) {
        return true;
    }

    if (value === 0) {
        return false;
    }

    const normalizedValue =
        normalizeDamageSearchText(value);

    if (
        ["sim", "true", "yes", "s"].includes(
            normalizedValue,
        )
    ) {
        return true;
    }

    if (
        ["nao", "false", "no", "n"].includes(
            normalizedValue,
        )
    ) {
        return false;
    }

    return null;
}

function classifyLossesSituation(value) {
    const normalizedValue =
        normalizeDamageSearchText(value);

    if (
        normalizedValue === "lost" ||
        normalizedValue.includes("perda confirmada")
    ) {
        return "confirmedLosses";
    }

    if (
        normalizedValue.includes("analise") ||
        /^em an.*lise$/.test(normalizedValue) ||
        normalizedValue === "pending"
    ) {
        return "underReview";
    }

    return "";
}

function getSourceMonthCandidates(
    source,
    date,
) {
    const requestedMonthValue =
        date.getFullYear() * 12 +
        date.getMonth();
    const candidatesByMonth =
        new Map();

    for (
        let rowIndex = source.headerRowIndex + 1;
        rowIndex < source.rows.length;
        rowIndex += 1
    ) {
        const parsedDate =
            parseDamageDate(
                source.rows[rowIndex]?.[
                    source.columns.date
                ],
            );

        if (!parsedDate) {
            continue;
        }

        const monthIndex =
            parsedDate.month - 1;
        const monthValue =
            parsedDate.year * 12 +
            monthIndex;

        if (
            monthValue > requestedMonthValue ||
            candidatesByMonth.has(monthValue)
        ) {
            continue;
        }

        candidatesByMonth.set(
            monthValue,
            new Date(
                parsedDate.year,
                monthIndex,
                1,
                12,
            ),
        );
    }

    return Array.from(
        candidatesByMonth.entries(),
    )
        .sort(
            function (first, second) {
                return second[0] - first[0];
            },
        )
        .map(
            function ([, candidateDate]) {
                return candidateDate;
            },
        );
}

function createLossesDataForMonth(
    source,
    date = new Date(),
) {
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const daysByDate = new Map();
    let importedRows = 0;
    let ignoredRows = 0;

    const getDay =
        function (dateKey) {
            const current =
                daysByDate.get(dateKey);

            if (current) {
                return current;
            }

            const day = {
                date: dateKey,
                underReview: 0,
                confirmedLosses: 0,
                recoveryYes: 0,
                recoveryNo: 0,
                recoveryUnknown: 0,
            };

            daysByDate.set(dateKey, day);
            return day;
        };

    for (
        let rowIndex = source.headerRowIndex + 1;
        rowIndex < source.rows.length;
        rowIndex += 1
    ) {
        const row = source.rows[rowIndex];
        const receivedDate =
            row?.[source.columns.date];
        const receivedSituation =
            row?.[source.columns.situation];

        if (
            normalizeDamageText(receivedDate) === "" &&
            normalizeDamageText(receivedSituation) === ""
        ) {
            continue;
        }

        const parsedDate =
            parseDamageDate(receivedDate);
        const situation =
            classifyLossesSituation(receivedSituation);

        if (
            !parsedDate ||
            parsedDate.month - 1 !== monthIndex ||
            parsedDate.year !== year ||
            !situation
        ) {
            ignoredRows += 1;
            continue;
        }

        const day = getDay(parsedDate.key);
        day[situation] += 1;
        importedRows += 1;

        const packageCode =
            normalizeDamagePackageCode(
                row?.[
                    source.columns
                        .packageCode
                ],
            );
        const recovery =
            source.recoverySource
                .valuesByPackageCode
                .get(packageCode) ?? null;

        if (recovery === true) {
            day.recoveryYes += 1;
        } else if (recovery === false) {
            day.recoveryNo += 1;
        } else {
            day.recoveryUnknown += 1;
        }
    }

    return {
        monthIndex,
        year,
        days:
            Array.from(daysByDate.values()).sort(
                function (first, second) {
                    return first.date.localeCompare(
                        second.date,
                    );
                },
            ),
        importedRows,
        ignoredRows,
    };
}

function createLossesMonthData(
    source,
    date = new Date(),
) {
    const requestedMonthIndex =
        date.getMonth();
    const requestedYear =
        date.getFullYear();
    const candidates =
        getSourceMonthCandidates(
            source,
            date,
        );

    for (const candidateDate of candidates) {
        const result =
            createLossesDataForMonth(
                source,
                candidateDate,
            );

        if (result.importedRows > 0) {
            return {
                ...result,
                requestedMonthIndex,
                requestedYear,
                fallbackUsed:
                    result.monthIndex !==
                        requestedMonthIndex ||
                    result.year !== requestedYear,
            };
        }
    }

    throw new Error(
        `Nenhum registro válido de perdas foi encontrado até ${DAMAGE_MONTH_NAMES[requestedMonthIndex]} de ${requestedYear}.`,
    );
}

function createDamageDataForMonth(
    source,
    date = new Date(),
) {
    const monthIndex =
        date.getMonth();

    const year =
        date.getFullYear();

    const daysByDate =
        new Map();

    const socStationsByName =
        new Map();

    const socStationsByDate =
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

        const packageCode =
            normalizeDamagePackageCode(
                row?.[
                    source.columns
                        .packageCode
                ],
            );
        const baseRecord =
            source.baseSource
                .valuesByPackageCode
                .get(packageCode);

        const currentStation =
            normalizeDamageText(
                baseRecord?.currentStation,
            );

        const currentStationSearch =
            normalizeDamageSearchText(
                currentStation,
            );

        if (
            !packageCode ||
            !currentStation ||
            currentStationSearch ===
                "sem dados"
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
                solid: 0,
                liquid: 0,
                glass: 0,
            };

        if (
            currentStation ===
            DAMAGE_HUB_STATION
        ) {
            day.hub += 1;
        } else {
            day.soc += 1;
        }

        if (
            currentStationSearch
                .startsWith(
                    "soc sp ",
                )
        ) {
            incrementDamageSocStation(
                socStationsByName,
                currentStationSearch,
                currentStation,
            );

            const stationsForDay =
                socStationsByDate.get(
                    parsedDate.key,
                ) || new Map();

            incrementDamageSocStation(
                stationsForDay,
                currentStationSearch,
                currentStation,
            );

            socStationsByDate.set(
                parsedDate.key,
                stationsForDay,
            );
        }

        const productType =
            classifyDamageProductType(
                source.productSource
                    .valuesByPackageCode
                    .get(packageCode),
            );

        if (productType) {
            day[productType] += 1;
        }

        daysByDate.set(
            parsedDate.key,
            day,
        );
    }

    const days =
        Array.from(
            daysByDate.values(),
        )
            .map(
                function (day) {
                    return {
                        ...day,

                        socStations:
                            Array.from(
                                (
                                    socStationsByDate
                                        .get(
                                            day.date,
                                        ) ||
                                    new Map()
                                ).values(),
                            ).sort(
                                function (
                                    first,
                                    second,
                                ) {
                                    return second.count -
                                        first.count ||
                                        first.name.localeCompare(
                                            second.name,
                                            "pt-BR",
                                        );
                                },
                            ),
                    };
                },
            )
            .sort(
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

    const socStations =
        Array.from(
            socStationsByName.values(),
        ).sort(
            function (first, second) {
                return second.count -
                    first.count ||
                    first.name.localeCompare(
                        second.name,
                        "pt-BR",
                    );
            },
        );

    return {
        monthIndex,
        year,
        days,
        socStations,
        importedRows,
        ignoredRows,
    };
}

function createDamageMonthData(
    source,
    date = new Date(),
) {
    const requestedMonthIndex =
        date.getMonth();
    const requestedYear =
        date.getFullYear();
    const candidates =
        getSourceMonthCandidates(
            source,
            date,
        );

    for (const candidateDate of candidates) {
        const result =
            createDamageDataForMonth(
                source,
                candidateDate,
            );

        if (result.importedRows > 0) {
            return {
                ...result,
                requestedMonthIndex,
                requestedYear,
                fallbackUsed:
                    result.monthIndex !==
                        requestedMonthIndex ||
                    result.year !== requestedYear,
            };
        }
    }

    throw new Error(
        `Nenhuma avaria válida foi encontrada até ${DAMAGE_MONTH_NAMES[requestedMonthIndex]} de ${requestedYear}.`,
    );
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
        );

    const lossesSource =
        findLossesMonthSource(
            workbook,
        );

    const damage =
        {
            ...createDamageMonthData(
                source,
                date,
            ),

            sourceFileName:
                file.name,

            sourceSheetName:
                source.sheetName,
        };

    const losses =
        {
            ...createLossesMonthData(
                lossesSource,
                date,
            ),

            sourceFileName:
                file.name,

            sourceSheetName:
                lossesSource.sheetName,
        };

    const lossesRate =
        findLossesRateWorkbookHistory(
            workbook,
        );

    return {
        ...(damage || {}),
        sourceFileName:
            damage.sourceFileName ||
            file.name,
        sourceSheetName:
            damage.sourceSheetName ||
            "",
        damage,
        losses,
        lossesRate,
    };
}

function synchronizeLossesRateReport(
    result,
) {
    return replaceLossesRateHistory(
        result.lossesRate.history,
        result.lossesRate.identification,
    );
}

function setDamageAndLossesImportNotification(
    type,
    message,
) {
    [
        "damage-and-losses",
        "losses-rate",
    ].forEach(
        function (reportId) {
            setReportNotification({
                reportId,
                type,
                message,
            });
        },
    );
}

function createDamageAndLossesSuccessMessage(
    result,
) {
    const fallbackPeriods = [];

    [
        ["Avarias", result.damage],
        ["Perdas", result.losses],
    ].forEach(
        function ([label, data]) {
            if (!data?.fallbackUsed) {
                return;
            }

            fallbackPeriods.push(
                `${label}: ${DAMAGE_MONTH_NAMES[data.monthIndex]} de ${data.year}`,
            );
        },
    );

    const baseMessage =
        "Relatórios de Avarias e Perdas e Taxa de Perdas atualizados.";

    return fallbackPeriods.length > 0
        ? `${baseMessage} Períodos anteriores utilizados: ${fallbackPeriods.join("; ")}.`
        : baseMessage;
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
        "Importando avarias e perdas...";
    importButton.setAttribute(
        "aria-label",
        "Importando avarias e perdas",
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
            result.damage,
        );

        replaceLossesData(
            result.losses,
        );

        synchronizeLossesRateReport(
            result,
        );

        setDamageAndLossesImportNotification(
            "success",
            createDamageAndLossesSuccessMessage(
                result,
            ),
        );

        return true;
    } catch (error) {
        console.error(
            "Não foi possível importar as avarias e perdas:",
            error,
        );

        setDamageAndLossesImportNotification(
            "error",
            error instanceof Error
                ? error.message
                : "Não foi possível importar a planilha de avarias e perdas.",
        );

        return false;
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
    DAMAGE_HISTORY_SHEET_NAME,
    classifyDamageProductType,
    createDamageMonthData,
    createLossesMonthData,
    findDamageMonthSource,
    findLossesMonthSource,
    initializeDamageAndLossesImport,
    importDamageAndLossesFile,
    parseDamageDate,
    readDamageAndLossesFile,
};
