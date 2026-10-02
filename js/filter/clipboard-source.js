function normalizeClipboardCell(value) {
    return String(value ?? "")
        .replace(
            /[\u200B-\u200D\u2060\uFEFF]/g,
            "",
        )
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeText(value) {
    return normalizeClipboardCell(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR");
}

function parseClipboardRows(text) {
    const clipboardText =
        String(text ?? "")
            .replace(/\r\n?/g, "\n")
            .replace(/\n+$/g, "");

    if (!clipboardText.trim()) {
        return [];
    }

    return clipboardText
        .split("\n")
        .map(
            function (line) {
                return line.split("\t");
            },
        );
}

function isClipboardCell(element) {
    const tagName =
        element.tagName
            ?.toLocaleLowerCase(
                "pt-BR",
            );

    if (
        tagName === "th" ||
        tagName === "td"
    ) {
        return true;
    }

    const role =
        element.getAttribute?.("role")
            ?.toLocaleLowerCase(
                "pt-BR",
            );

    return role === "cell" ||
        role === "gridcell" ||
        role === "columnheader" ||
        role === "rowheader";
}

function parseClipboardHtmlRows(
    html,
    DomParser = globalThis.DOMParser,
) {
    if (
        !String(html ?? "").trim() ||
        typeof DomParser !== "function"
    ) {
        return [];
    }

    const document =
        new DomParser().parseFromString(
            html,
            "text/html",
        );

    const rowElements =
        document.querySelectorAll(
            "tr, [role='row']",
        );

    return Array.from(rowElements)
        .map(
            function (rowElement) {
                return Array.from(
                    rowElement.children,
                )
                    .filter(
                        isClipboardCell,
                    )
                    .map(
                        function (cell) {
                            return normalizeClipboardCell(
                                cell.textContent,
                            );
                        },
                    );
            },
        )
        .filter(
            function (row) {
                return row.some(Boolean);
            },
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

function createPurposeHeaderIndex(
    headers,
    purpose,
) {
    const sourceHeaderIndexes =
        createHeaderIndex(headers);

    const headerIndexes =
        new Map(sourceHeaderIndexes);

    const purposeColumns =
        new Set([
            purpose.filterColumn,
            ...(purpose.requiredColumns ?? []),
            ...purpose.columns,
            purpose.oldestByColumn,
        ].filter(Boolean));

    purposeColumns.forEach(
        function (column) {
            const normalizedColumn =
                normalizeText(column);

            if (
                headerIndexes.has(
                    normalizedColumn,
                )
            ) {
                return;
            }

            const aliases =
                purpose.columnAliases?.[
                    column
                ] ?? [];

            const matchingAlias =
                aliases.find(
                    function (alias) {
                        return sourceHeaderIndexes
                            .has(
                                normalizeText(
                                    alias,
                                ),
                            );
                    },
                );

            if (!matchingAlias) {
                return;
            }

            headerIndexes.set(
                normalizedColumn,
                sourceHeaderIndexes.get(
                    normalizeText(
                        matchingAlias,
                    ),
                ),
            );
        },
    );

    return headerIndexes;
}

function findCompatibleClipboardSource(
    rows,
    purpose,
) {
    let closestSource = null;

    for (
        let rowIndex = 0;
        rowIndex < rows.length;
        rowIndex += 1
    ) {
        const headers =
            Array.isArray(rows[rowIndex])
                ? rows[rowIndex]
                : [];

        const headerIndexes =
            createPurposeHeaderIndex(
                headers,
                purpose,
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

        const sourceCandidate = {
            rowIndex,
            headerIndexes,
            missingColumns,
        };

        if (missingColumns.length === 0) {
            return sourceCandidate;
        }

        if (
            !closestSource ||
            missingColumns.length <
                closestSource
                    .missingColumns
                    .length
        ) {
            closestSource =
                sourceCandidate;
        }
    }

    return closestSource;
}

function findBestClipboardSource(
    rowSources,
    purpose,
) {
    let closestSource = null;

    for (const rows of rowSources) {
        if (rows.length === 0) {
            continue;
        }

        const compatibleSource =
            findCompatibleClipboardSource(
                rows,
                purpose,
            );

        if (!compatibleSource) {
            continue;
        }

        const sourceCandidate = {
            ...compatibleSource,
            rows,
        };

        if (
            sourceCandidate
                .missingColumns
                .length === 0
        ) {
            return sourceCandidate;
        }

        if (
            !closestSource ||
            sourceCandidate
                .missingColumns
                .length <
                closestSource
                    .missingColumns
                    .length
        ) {
            closestSource =
                sourceCandidate;
        }
    }

    return closestSource;
}

export {
    createHeaderIndex,
    createPurposeHeaderIndex,
    findBestClipboardSource,
    findCompatibleClipboardSource,
    normalizeText,
    parseClipboardHtmlRows,
    parseClipboardRows,
};
