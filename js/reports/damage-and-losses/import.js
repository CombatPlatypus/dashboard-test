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
    getLossesRateState,
    replaceLossesRateHistory,
} from "../losses-rate/state.js";

import {
    findLossesRateWorkbookHistory,
} from "../losses-rate/import.js";

const MAX_DAMAGE_FILE_SIZE =
    10 * 1024 * 1024;

const MAX_DAMAGE_HEADER_SEARCH_ROWS =
    50;

const DAMAGE_HUB_STATION =
    "LM Hub_SP_Santos_PraiaGrande_02";

const DAMAGE_HISTORY_SHEET_NAME =
    "historico de avarias";

const LOSSES_HISTORY_SHEET_NAME =
    "historico de analises";

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
            "estacao da avaria",
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

        packRecovery: [
            "pack recovery",
            "pack recover",
        ],

        monetaryValue: [
            "valor r",
            "valor",
            "value",
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

function damageHeaderMatches(
    header,
    field,
    aliases,
) {
    if (aliases.includes(header)) {
        return true;
    }

    if (field === "currentStation") {
        return (
            header === "current station" ||
            /^esta.*(?:atual|corrente|avaria)$/.test(
                header,
            )
        );
    }

    if (field === "productType") {
        return /^tipo.*produto$/.test(header);
    }

    return field === "date" &&
        /^(?:data|date)$/.test(header);
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
                    return damageHeaderMatches(
                        header,
                        field,
                        aliases,
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
            };
        }
    }

    throw new Error(
        `A aba ${sheetName} não possui as colunas Data, Estação da Avaria e Tipo de Produto.`,
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

function lossesHeaderMatches(
    header,
    field,
    aliases,
) {
    if (aliases.includes(header)) {
        return true;
    }

    if (field === "situation") {
        return /^situa.*o$/.test(header);
    }

    if (field === "monetaryValue") {
        return /^valor(?: r)?$/.test(header);
    }

    return false;
}

function findLossesColumns(row) {
    if (!Array.isArray(row)) {
        return null;
    }

    const headers =
        row.map(normalizeDamageSearchText);
    const columns = {};

    for (
        const [field, aliases] of
        Object.entries(lossesColumnAliases)
    ) {
        const columnIndex =
            headers.findIndex(
                function (header) {
                    return lossesHeaderMatches(
                        header,
                        field,
                        aliases,
                    );
                },
            );

        if (columnIndex === -1) {
            return null;
        }

        columns[field] = columnIndex;
    }

    return columns;
}

function findEmptyPackagesColumns(row) {
    if (!Array.isArray(row)) {
        return null;
    }

    const headers =
        row.map(normalizeDamageSearchText);
    const date =
        headers.findIndex(
            function (header) {
                return header === "data";
            },
        );
    const packageCode =
        headers.findIndex(
            function (header) {
                return header === "codigo br" ||
                    /^c.*digo br$/.test(header);
            },
        );
    const ticketOpened =
        headers.findIndex(
            function (header) {
                return header === "abertura de ticket";
            },
        );
    const ticketResolved =
        headers.findIndex(
            function (header) {
                return header === "resolucao de ticket" ||
                    /^resolu.*de ticket$/.test(header);
            },
        );

    return [
        date,
        packageCode,
        ticketOpened,
        ticketResolved,
    ].every(
        function (columnIndex) {
            return columnIndex >= 0;
        },
    )
        ? {
            date,
            packageCode,
            ticketOpened,
            ticketResolved,
        }
        : null;
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
    let emptyPackagesColumns = null;
    let emptyPackagesHeaderRowIndex = -1;

    for (
        let rowIndex = 0;
        rowIndex < searchLimit;
        rowIndex += 1
    ) {
        if (!columns) {
            columns =
                findLossesColumns(rows[rowIndex]);

            if (columns) {
                headerRowIndex = rowIndex;
            }
        }

        if (!emptyPackagesColumns) {
            emptyPackagesColumns =
                findEmptyPackagesColumns(
                    rows[rowIndex],
                );

            if (emptyPackagesColumns) {
                emptyPackagesHeaderRowIndex =
                    rowIndex;
            }
        }
    }

    if (!columns) {
        throw new Error(
            `A aba ${sheetName} não possui as colunas Data, Situação, Pack Recovery e Valor R$.`,
        );
    }

    return {
        sheetName,
        rows,
        columns,
        headerRowIndex,
        emptyPackagesColumns,
        emptyPackagesHeaderRowIndex,
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

function parseLossesMonetaryValue(value) {
    if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
    ) {
        return value;
    }

    const receivedValue =
        normalizeDamageText(value);

    if (!receivedValue) {
        return null;
    }

    const numericText =
        receivedValue
            .replace(/[^\d,.-]/g, "")
            .replace(/\.(?=.*[,])/g, "")
            .replace(",", ".");
    const numericValue =
        Number(numericText);

    return Number.isFinite(numericValue) &&
        numericValue >= 0
        ? numericValue
        : null;
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

function createLossesMonthData(
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
                savedAwaitingTicket: 0,
                emptyAwaitingTicket: 0,
                recoveryYes: 0,
                recoveryNo: 0,
                recoveryUnknown: 0,
                confirmedValue: 0,
                underReviewValue: 0,
                confirmedValueRecords: 0,
                underReviewValueRecords: 0,
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

        const recovery =
            parseLossesBoolean(
                row?.[source.columns.packRecovery],
            );

        if (recovery === true) {
            day.recoveryYes += 1;
            day.savedAwaitingTicket += 1;
        } else if (recovery === false) {
            day.recoveryNo += 1;
        } else {
            day.recoveryUnknown += 1;
        }

        const monetaryValue =
            parseLossesMonetaryValue(
                row?.[source.columns.monetaryValue],
            );

        if (monetaryValue !== null) {
            const valueField =
                situation === "confirmedLosses"
                    ? "confirmedValue"
                    : "underReviewValue";
            const recordsField =
                situation === "confirmedLosses"
                    ? "confirmedValueRecords"
                    : "underReviewValueRecords";

            day[valueField] += monetaryValue;
            day[recordsField] += 1;
        }
    }

    if (
        source.emptyPackagesColumns &&
        source.emptyPackagesHeaderRowIndex >= 0
    ) {
        for (
            let rowIndex =
                source.emptyPackagesHeaderRowIndex + 1;
            rowIndex < source.rows.length;
            rowIndex += 1
        ) {
            const row = source.rows[rowIndex];
            const columns =
                source.emptyPackagesColumns;
            const packageCode =
                normalizeDamageText(
                    row?.[columns.packageCode],
                );

            if (!packageCode) {
                continue;
            }

            const parsedDate =
                parseDamageDate(row?.[columns.date]);

            if (
                !parsedDate ||
                parsedDate.month - 1 !== monthIndex ||
                parsedDate.year !== year
            ) {
                continue;
            }

            const ticketOpened =
                parseLossesBoolean(
                    row?.[columns.ticketOpened],
                );

            if (ticketOpened !== true) {
                getDay(parsedDate.key)
                    .emptyAwaitingTicket += 1;
            }
        }
    }

    if (importedRows === 0) {
        throw new Error(
            `Nenhum registro de perdas de ${DAMAGE_MONTH_NAMES[monthIndex]} de ${year} foi encontrado.`,
        );
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

        const currentStation =
            normalizeDamageText(
                row?.[
                    source.columns
                        .currentStation
                ],
            );

        const currentStationSearch =
            normalizeDamageSearchText(
                currentStation,
            );

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
                row?.[
                    source.columns
                        .productType
                ],
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

    if (importedRows === 0) {
        throw new Error(
            `Nenhuma avaria de ${DAMAGE_MONTH_NAMES[monthIndex]} de ${year} foi encontrada.`,
        );
    }

    return {
        monthIndex,
        year,
        days,
        socStations,
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
            {
                required: false,
            },
        );

    const lossesSource =
        findLossesMonthSource(
            workbook,
            {
                required: false,
            },
        );

    if (
        !source &&
        !lossesSource
    ) {
        throw new Error(
            "Não foi possível localizar o Histórico de Avarias ou Perdas, em nenhuma das abas da planilha.",
        );
    }

    const damage =
        source
            ? {
                ...createDamageMonthData(
                    source,
                    date,
                ),

                sourceFileName:
                    file.name,

                sourceSheetName:
                    source.sheetName,
            }
            : null;

    const losses =
        lossesSource
            ? {
                ...createLossesMonthData(
                    lossesSource,
                    date,
                ),

                sourceFileName:
                    file.name,

                sourceSheetName:
                    lossesSource.sheetName,
            }
            : null;

    let lossesRate = null;

    try {
        lossesRate =
            findLossesRateWorkbookHistory(
                workbook,
            );
    } catch (error) {
        console.warn(
            "A base da Taxa de Perdas não pôde ser lida; os campos manuais serão preservados.",
            error,
        );
    }

    return {
        ...(damage || {}),
        sourceFileName:
            damage?.sourceFileName ||
            file.name,
        sourceSheetName:
            damage?.sourceSheetName ||
            "",
        damage,
        losses,
        lossesRate,
    };
}

function sumLossesMonthField(
    losses,
    field,
) {
    return losses.days.reduce(
        function (total, day) {
            return total +
                Number(
                    day[field] || 0,
                );
        },
        0,
    );
}

function synchronizeLossesRateReport(
    result,
) {
    const currentState =
        getLossesRateState();

    const importedHistory =
        result.lossesRate?.history;

    const months =
        currentState.months.map(
            function (
                currentMonth,
                monthIndex,
            ) {
                return {
                    ...currentMonth,
                    ...(
                        importedHistory?.[
                            monthIndex
                        ] || {}
                    ),
                };
            },
        );

    const monthIndex =
        result.damage?.monthIndex ??
        result.losses?.monthIndex;

    if (
        Number.isInteger(
            monthIndex,
        )
    ) {
        const month = {
            ...months[monthIndex],
        };

        if (result.damage) {
            month.damage =
                result.damage
                    .importedRows;
        }

        if (result.losses) {
            month.possibleLosses =
                sumLossesMonthField(
                    result.losses,
                    "underReview",
                );

            month.lost =
                sumLossesMonthField(
                    result.losses,
                    "confirmedLosses",
                );
        }

        months[monthIndex] =
            month;
    }

    const importedIdentification =
        result.lossesRate
            ?.identification || {};

    const identification = {};

    [
        "description",
        "hubCode",
        "subRegional",
    ].forEach(
        function (field) {
            identification[field] =
                String(
                    importedIdentification[
                        field
                    ] ?? "",
                ).trim() ||
                currentState
                    .identification[field];
        },
    );

    replaceLossesRateHistory(
        months,
        identification,
    );

    setReportNotification({
        reportId:
            "losses-rate",
        type: "success",
        message:
            "Taxa de Perdas atualizada pela importação de Avarias e Perdas.",
    });
}

function getDamageAndLossesImportMessage(
    result,
) {
    if (
        result.damage &&
        result.losses
    ) {
        return "Histórico de Avarias e Perdas Importado.";
    }

    if (result.damage) {
        return "Histórico de Avarias Importado.";
    }

    return "Histórico de Perdas Importado.";
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

        if (result.damage) {
            replaceDamageAndLossesData(
                result.damage,
            );
        }

        if (result.losses) {
            replaceLossesData(
                result.losses,
            );
        }

        synchronizeLossesRateReport(
            result,
        );

        setReportNotification({
            reportId:
                "damage-and-losses",
            type: "success",
            message:
                getDamageAndLossesImportMessage(
                    result,
                ),
        });
    } catch (error) {
        console.error(
            "Não foi possível importar as avarias e perdas:",
            error,
        );

        setReportNotification({
            reportId:
                "damage-and-losses",

            type: "error",

            message:
                error instanceof Error
                    ? error.message
                    : "Não foi possível importar a planilha de avarias e perdas.",
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
    DAMAGE_HISTORY_SHEET_NAME,
    classifyDamageProductType,
    createDamageMonthData,
    createLossesMonthData,
    findDamageMonthSource,
    findLossesMonthSource,
    initializeDamageAndLossesImport,
    parseDamageDate,
    readDamageAndLossesFile,
};
