const naturalCollator =
    new Intl.Collator(
        "pt-BR",
        {
            numeric: true,
            sensitivity: "base",
        },
    );

function formatCellValue(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value);
}

function normalizeSearchValue(value) {
    return formatCellValue(value)
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLocaleLowerCase(
            "pt-BR",
        );
}

function isEmptyCell(value) {
    return formatCellValue(value)
        .trim() === "";
}

function parseNumericValue(value) {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    if (
        value instanceof Date ||
        isEmptyCell(value)
    ) {
        return null;
    }

    let normalizedValue =
        formatCellValue(value)
            .trim()
            .replace(
                /\s|\u00a0/g,
                "",
            )
            .replace(
                /^R\$/i,
                "",
            )
            .replace(
                /%$/,
                "",
            );

    if (
        !/^[+-]?\d[\d.,]*$/.test(
            normalizedValue,
        )
    ) {
        return null;
    }

    const lastComma =
        normalizedValue.lastIndexOf(
            ",",
        );

    const lastDot =
        normalizedValue.lastIndexOf(
            ".",
        );

    if (
        lastComma >= 0 &&
        lastDot >= 0
    ) {
        const decimalSeparator =
            lastComma > lastDot
                ? ","
                : ".";

        const thousandsSeparator =
            decimalSeparator === ","
                ? "."
                : ",";

        normalizedValue =
            normalizedValue
                .replaceAll(
                    thousandsSeparator,
                    "",
                )
                .replace(
                    decimalSeparator,
                    ".",
                );
    } else if (lastComma >= 0) {
        normalizedValue =
            normalizedValue
                .replaceAll(".", "")
                .replace(",", ".");
    } else {
        normalizedValue =
            normalizedValue.replaceAll(
                ",",
                "",
            );
    }

    const numericValue =
        Number(normalizedValue);

    return Number.isFinite(
        numericValue,
    )
        ? numericValue
        : null;
}

function parseDateValue(value) {
    if (
        value instanceof Date &&
        !Number.isNaN(
            value.getTime(),
        )
    ) {
        return value;
    }

    const displayValue =
        formatCellValue(value)
            .trim();

    if (!displayValue) {
        return null;
    }

    const dateMatch =
        displayValue.match(
            /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
        ) ||
        displayValue.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
        );

    if (!dateMatch) {
        return null;
    }

    const startsWithYear =
        dateMatch[1].length === 4;

    let year = Number(
        startsWithYear
            ? dateMatch[1]
            : dateMatch[3],
    );

    if (year < 100) {
        year +=
            year >= 70
                ? 1900
                : 2000;
    }

    const month =
        Number(dateMatch[2]);

    const day = Number(
        startsWithYear
            ? dateMatch[3]
            : dateMatch[1],
    );

    const hour =
        Number(dateMatch[4] ?? 0);

    const minute =
        Number(dateMatch[5] ?? 0);

    const second =
        Number(dateMatch[6] ?? 0);

    const parsedDate = new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
    );

    if (
        parsedDate.getFullYear() !== year ||
        parsedDate.getMonth() !== month - 1 ||
        parsedDate.getDate() !== day ||
        parsedDate.getHours() !== hour ||
        parsedDate.getMinutes() !== minute ||
        parsedDate.getSeconds() !== second
    ) {
        return null;
    }

    return parsedDate;
}

function detectColumnProfile(
    rows,
    columnIndex,
    header,
) {
    const filledValues = rows
        .map(function (row) {
            return row[columnIndex];
        })
        .filter(function (value) {
            return !isEmptyCell(value);
        });

    if (filledValues.length === 0) {
        return Object.freeze({
            type: "empty",
            hasTime: false,
        });
    }

    const dateValues =
        filledValues.filter(
            function (value) {
                return parseDateValue(
                    value,
                ) !== null;
            },
        );

    const numericValues =
        filledValues.filter(
            function (value) {
                return parseNumericValue(
                    value,
                ) !== null;
            },
        );

    const uniqueValues =
        new Set(
            filledValues.map(
                function (value) {
                    return normalizeSearchValue(
                        value,
                    ).trim();
                },
            ),
        );

    const uniqueRatio =
        uniqueValues.size /
        filledValues.length;

    const normalizedHeader =
        normalizeSearchValue(
            header,
        ).trim();

    const identifierHeader =
        /(^|[\s_-])(id|codigo|code|uuid|chave|key|referencia|reference|pacotes?|packages?|pedidos?|orders?)([\s_-]|$)/.test(
            normalizedHeader,
        ) ||
        /(^|[\s_-])(tracking|serial)(?:[\s_-]+number)?([\s_-]|$)/.test(
            normalizedHeader,
        ) ||
        normalizedHeader === "at/to";

    const identifierLikeValues =
        filledValues.filter(
            function (value) {
                const textValue =
                    formatCellValue(
                        value,
                    ).trim();

                return (
                    textValue.length >= 6 &&
                    !/\s/.test(textValue) &&
                    /[a-z]/i.test(textValue) &&
                    /\d/.test(textValue)
                );
            },
        );

    const isLikelyIdentifier =
        identifierHeader ||
        identifierLikeValues.length /
            filledValues.length >= 0.8;

    if (
        dateValues.length /
            filledValues.length >= 0.8
    ) {
        return Object.freeze({
            type: "datetime",
            hasTime:
                filledValues.some(
                    function (value) {
                        return /\d{1,2}:\d{2}/.test(
                            formatCellValue(
                                value,
                            ),
                        );
                    },
                ),
        });
    }

    if (
        numericValues.length /
            filledValues.length >= 0.8
    ) {
        return Object.freeze({
            type:
                isLikelyIdentifier &&
                uniqueRatio >= 0.8
                    ? "identifier"
                    : "number",
            hasTime: false,
        });
    }

    return Object.freeze({
        type:
            uniqueRatio >= 0.8 &&
            isLikelyIdentifier
                ? "identifier"
                : "category",
        hasTime: false,
    });
}

function createColumnProfiles(
    headers,
    rows,
) {
    return headers.map(
        function (
            header,
            columnIndex,
        ) {
            return detectColumnProfile(
                rows,
                columnIndex,
                header,
            );
        },
    );
}

export {
    createColumnProfiles,
    formatCellValue,
    isEmptyCell,
    naturalCollator,
    normalizeSearchValue,
    parseDateValue,
    parseNumericValue,
};
