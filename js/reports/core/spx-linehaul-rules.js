const SPX_LINEHAUL_WINDOW_PATTERN =
    /^(AM|PM1|PM2)$/i;

const SPX_LINEHAUL_CODE_PATTERN =
    /\bLT[A-Z0-9]{8,24}\b/i;

function formatSpXLinehaulOrigin(
    value,
) {
    const origin =
        String(
            value ?? "",
        )
            .replace(
                /^(?:\s*\[[^\]]+\]\s*)+/,
                "",
            )
            .replace(
                /_+/g,
                " ",
            )
            .replace(
                /\s+/g,
                " ",
            )
            .trim();

    const originParts =
        origin.split(
            " ",
        );

    const stateIndex =
        originParts.findIndex(
            function (part) {
                return part.toUpperCase() ===
                    "SP";
            },
        );

    if (stateIndex === -1) {
        return /^s(?:a|ã)o bernardo do campo$/i.test(
            origin,
        )
            ? "São Bernardo"
            : origin;
    }

    const formattedOrigin =
        originParts
        .slice(
            stateIndex + 1,
        )
        .join(
            " ",
        )
        .trim();

    return /^s(?:a|ã)o bernardo do campo$/i.test(
        formattedOrigin,
    )
        ? "São Bernardo"
        : formattedOrigin;
}

function getSpXLinehaulCode(
    value,
) {
    const match =
        String(
            value ?? "",
        )
            .toUpperCase()
            .match(
                SPX_LINEHAUL_CODE_PATTERN,
            );

    return match?.[0] || "";
}

function parseSpXLinehaulQuantity(
    value,
) {
    const receivedValue =
        String(
            value ?? "",
        )
            .replace(
                /\u00a0/g,
                " ",
            )
            .trim();

    if (
        !/^\d{1,3}(?:[.\s]\d{3})*$/.test(
            receivedValue,
        ) &&
        !/^\d+$/.test(
            receivedValue,
        )
    ) {
        return null;
    }

    const quantity =
        Number(
            receivedValue.replace(
                /[.\s]/g,
                "",
            ),
        );

    return Number.isSafeInteger(
        quantity,
    )
        ? quantity
        : null;
}

function getSpXLinehaulWindow(
    values,
) {
    for (const value of values) {
        const match =
            String(value)
                .trim()
                .match(
                    SPX_LINEHAUL_WINDOW_PATTERN,
                );

        if (match) {
            return match[1]
                .toUpperCase();
        }
    }

    return "";
}

function getSpXLinehaulPlainLoadedOrders(
    values,
) {
    const receivedValues =
        Array.isArray(values)
            ? values
            : [];

    for (
        let index = 0;
        index < receivedValues.length;
        index += 1
    ) {
        const value =
            String(
                receivedValues[index] ??
                "",
            )
                .replace(
                    /\u00a0/g,
                    " ",
                )
                .trim();

        const inlineMatch =
            value.match(
                /^pedidos? carregados?\s*[:=-]\s*(.+)$/i,
            );

        if (inlineMatch) {
            return parseSpXLinehaulQuantity(
                inlineMatch[1],
            );
        }

        if (
            /^pedidos? carregados?$/i.test(
                value,
            )
        ) {
            return parseSpXLinehaulQuantity(
                receivedValues[index + 1],
            );
        }
    }

    /*
     * No texto puro copiado da grade do SPX, os cabeçalhos aparecem
     * apenas uma vez. A posição de "Pedido Carregado" pode ser
     * determinada pelas colunas finais da própria grade:
     *
     * Pedido carregado, MTB carregado, Tempo na fila, Ticket, Status.
     *
     * Esta posição evita usar Inbound ou qualquer outro número como
     * alternativa quando Pedido Carregado não foi informado.
     */

    const actionPattern =
        /^visualizar\b/i;

    let actionIndex =
        -1;

    receivedValues.forEach(
        function (value, index) {
            if (
                actionPattern.test(
                    String(value ?? "")
                        .replace(
                            /\u00a0/g,
                            " ",
                        )
                        .trim(),
                )
            ) {
                actionIndex = index;
            }
        },
    );

    if (actionIndex >= 5) {
        return parseSpXLinehaulQuantity(
            receivedValues[
                actionIndex - 5
            ],
        );
    }

    const statusPattern =
        /^(arrived|pending|unloaded|unseal)$/i;

    let statusIndex =
        -1;

    receivedValues.forEach(
        function (value, index) {
            if (
                statusPattern.test(
                    String(value ?? "")
                        .replace(
                            /\u00a0/g,
                            " ",
                        )
                        .trim(),
                )
            ) {
                statusIndex = index;
            }
        },
    );

    if (statusIndex >= 4) {
        return parseSpXLinehaulQuantity(
            receivedValues[
                statusIndex - 4
            ],
        );
    }

    return null;
}

function getSpXDetectedWindows(
    receivedRecords,
) {
    const records =
        Array.isArray(
            receivedRecords,
        )
            ? receivedRecords
            : [];

    const windows = new Set();

    records.forEach(
        function (record) {
            const windowValue =
                String(
                    record.window ?? "",
                )
                    .trim()
                    .toUpperCase();

            if (
                SPX_LINEHAUL_WINDOW_PATTERN.test(
                    windowValue,
                )
            ) {
                windows.add(
                    windowValue,
                );
            }
        },
    );

    return Array.from(
        windows,
    );
}

function isSpXAllWaitingImport(
    records,
) {
    return records.length > 0 &&
        records.every(
            function (record) {
                return record.waiting ===
                    true;
            },
        );
}

function hasSpXMatchingWindowNeighbor(
    records,
    index,
    targetWindow,
) {
    return (
        records[index - 1]
            ?.window ===
            targetWindow ||
        records[index + 1]
            ?.window ===
            targetWindow
    );
}

function createEmptySpXSelection(
    records,
    targetWindow,
    skippedAllWaitingGroups = 0,
) {
    return {
        records: [],
        targetWindow,
        skippedWaitingWithoutWindow: 0,
        skippedAllWaitingGroups,
        skippedUngrouped:
            records.filter(
                function (record) {
                    return record.window ===
                        targetWindow;
                },
            ).length,
        skippedDuplicates: 0,
    };
}

function selectSpXLinehaulRecords(
    receivedRecords,
    receivedTargetWindow = "",
) {
    const records =
        Array.isArray(
            receivedRecords,
        )
            ? receivedRecords
            : [];

    const detectedWindows =
        getSpXDetectedWindows(
            records,
        );

    const targetWindow =
        String(
            receivedTargetWindow ||
            detectedWindows[0] ||
            "",
        )
            .trim()
            .toUpperCase();

    const allWaitingImport =
        isSpXAllWaitingImport(
            records,
        );

    if (
        allWaitingImport &&
        targetWindow !==
            detectedWindows[0]
    ) {
        return createEmptySpXSelection(
            records,
            targetWindow,
        );
    }

    const validWindowIndexes = [];

    records.forEach(
        function (
            record,
            index,
        ) {
            if (
                record.window ===
                    targetWindow &&
                hasSpXMatchingWindowNeighbor(
                    records,
                    index,
                    targetWindow,
                )
            ) {
                validWindowIndexes.push(
                    index,
                );
            }
        },
    );

    if (
        !targetWindow ||
        validWindowIndexes.length === 0
    ) {
        return createEmptySpXSelection(
            records,
            targetWindow,
        );
    }

    let blockStart = -1;
    let blockEnd = -1;
    let blockWindowIndexes = [];
    let skippedAllWaitingGroups = 0;

    const checkedBlocks = new Set();

    for (const validIndex of validWindowIndexes) {
        let candidateStart = validIndex;
        let candidateEnd = validIndex;

        while (candidateStart > 0) {
            const previousWindow =
                records[
                    candidateStart - 1
                ].window;

            if (
                previousWindow &&
                previousWindow !==
                    targetWindow
            ) {
                break;
            }

            candidateStart -= 1;
        }

        while (
            candidateEnd <
            records.length - 1
        ) {
            const nextWindow =
                records[
                    candidateEnd + 1
                ].window;

            if (
                nextWindow &&
                nextWindow !==
                    targetWindow
            ) {
                break;
            }

            candidateEnd += 1;
        }

        const blockKey =
            `${candidateStart}:${candidateEnd}`;

        if (checkedBlocks.has(blockKey)) {
            continue;
        }

        checkedBlocks.add(blockKey);

        const candidateWindowIndexes =
            validWindowIndexes.filter(
                function (index) {
                    return (
                        index >= candidateStart &&
                        index <= candidateEnd
                    );
                },
            );

        const hasNonWaitingLh =
            candidateWindowIndexes.some(
                function (index) {
                    return !records[index]
                        .waiting;
                },
            );

        if (
            !hasNonWaitingLh &&
            !allWaitingImport
        ) {
            skippedAllWaitingGroups += 1;
            continue;
        }

        blockStart = candidateStart;
        blockEnd = candidateEnd;
        blockWindowIndexes =
            candidateWindowIndexes;

        break;
    }

    if (
        blockStart === -1 ||
        blockWindowIndexes.length === 0
    ) {
        return createEmptySpXSelection(
            records,
            targetWindow,
            skippedAllWaitingGroups,
        );
    }

    const selectedIndexes =
        new Set(
            blockWindowIndexes,
        );

    for (
        let index = blockStart;
        index <= blockEnd;
        index += 1
    ) {
        const record = records[index];

        if (
            record.window ||
            record.waiting
        ) {
            continue;
        }

        selectedIndexes.add(index);
    }

    const orderedIndexes =
        Array.from(
            selectedIndexes,
        )
            .sort(
                function (
                    firstIndex,
                    secondIndex,
                ) {
                    return firstIndex -
                        secondIndex;
                },
            );

    const selectedRecords = [];
    const receivedCodes = new Set();
    let skippedDuplicates = 0;

    orderedIndexes.forEach(
        function (index) {
            const record = records[index];
            const code =
                getSpXLinehaulCode(
                    record.code,
                );

            if (!code) {
                return;
            }

            if (receivedCodes.has(code)) {
                skippedDuplicates += 1;
                return;
            }

            receivedCodes.add(code);

            selectedRecords.push({
                ...record,
                code,
            });
        },
    );

    const selectedCodes =
        new Set(
            selectedRecords.map(
                function (record) {
                    return record.code;
                },
            ),
        );

    const skippedWaitingWithoutWindow =
        records
            .slice(
                blockStart,
                blockEnd + 1,
            )
            .filter(
                function (record) {
                    return (
                        !record.window &&
                        record.waiting
                    );
                },
            ).length;

    const skippedUngrouped =
        records.filter(
            function (record) {
                return (
                    record.window ===
                        targetWindow &&
                    !selectedCodes.has(
                        getSpXLinehaulCode(
                            record.code,
                        ),
                    )
                );
            },
        ).length;

    return {
        records: selectedRecords,
        targetWindow,
        skippedWaitingWithoutWindow,
        skippedAllWaitingGroups,
        skippedUngrouped,
        skippedDuplicates,
    };
}

function createSpXLinehaulWindowCandidates(
    records,
) {
    const detectedWindows =
        getSpXDetectedWindows(
            records,
        );

    const candidateWindows =
        isSpXAllWaitingImport(
            records,
        )
            ? detectedWindows.slice(0, 1)
            : detectedWindows;

    return candidateWindows.map(
        function (windowValue) {
            return {
                window: windowValue,
                selection:
                    selectSpXLinehaulRecords(
                        records,
                        windowValue,
                    ),
            };
        },
    );
}

export {
    SPX_LINEHAUL_CODE_PATTERN,
    SPX_LINEHAUL_WINDOW_PATTERN,
    createSpXLinehaulWindowCandidates,
    formatSpXLinehaulOrigin,
    getSpXDetectedWindows,
    getSpXLinehaulCode,
    getSpXLinehaulPlainLoadedOrders,
    getSpXLinehaulWindow,
    isSpXAllWaitingImport,
    parseSpXLinehaulQuantity,
    selectSpXLinehaulRecords,
};
