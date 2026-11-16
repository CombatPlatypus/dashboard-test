const SPX_LINEHAUL_WINDOW_PATTERN =
    /^(AM|PM1|PM2)$/i;

const SPX_LINEHAUL_CODE_PATTERN =
    /\bLT[A-Z0-9]{8,24}\b/i;

const SPX_LINEHAUL_SCHEDULE_MESSAGE =
    "Blocos com um único LH ou somente Waiting exigem uma data de STA/STD entre hoje e dois dias à frente.";

const spxLinehaulCalendar = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo",
});

function getSpXLinehaulScheduleColumns(row) {
    const combined = row.findIndex(value => /\bsta\s*(?:[\\/]\s*)?std\b/i.test(value));
    if (combined >= 0) return [combined];
    return ["sta", "std"].map(label => row.indexOf(label)).filter(index => index >= 0);
}

function getSpXLinehaulScheduledDate(values) {
    for (const value of values) {
        for (const line of String(value ?? "").split(/\r?\n/)) {
            const text = line.trim();
            const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?=$|[ T])/);
            if (iso) return iso[0];
            // No SPX a data e a hora também podem ser copiadas juntas, como 16-1102:30.
            const date = text.match(/^(\d{1,2})[-/](\d{2})(?:[-/](\d{4}))?(?=$|\s|\d{1,2}:\d{2})/);
            if (date) {
                const [, day, month, year] = date;
                return [year, month, day.padStart(2, "0")].filter(Boolean).join("-");
            }
        }
    }
    return null;
}

function getSpXLinehaulScheduleDays(referenceDate) {
    const [day, month, year] = spxLinehaulCalendar.format(referenceDate).split("/").map(Number);
    const keys = new Set();
    for (let offset = 0; offset <= 2; offset += 1) {
        const fullDate = new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
        keys.add(fullDate);
        keys.add(fullDate.slice(5));
    }
    return keys;
}

function parseSpXLinehaulTextMatrix(text) {
    if (!text.includes("\t")) return [];

    // Planilhas delimitam com aspas as células que têm quebras internas.
    const rows = [];
    for (const match of `\n${text}`.matchAll(/([\t\n])(?:"((?:[^"]|"")*)"(?=[\t\n]|$)|([^\t\n]*))/g)) {
        const [, delimiter, quoted, plain] = match;
        if (delimiter === "\n") rows.push([]);
        rows.at(-1).push(quoted?.replaceAll('""', '"') ?? plain);
    }
    return rows;
}

const spxLinehaulPunctualityPattern =
    /^(?:waiting|(?:on[- ]time|early|late|delay(?:ed)?)\s+(?:arrival|departure))$/i;

function getSpXLinehaulPlainScheduledDate(values, hasScheduleLayout) {
    const labeledDates = values.flatMap(value => {
        const label = value.match(/^STA(?:\s*[\\/]\s*STD)?\s*:\s*(.+)$|^STD\s*:\s*(.+)$/i);
        return label ? [label[1] ?? label[2]] : [];
    });
    const labeledDate = getSpXLinehaulScheduledDate(labeledDates);
    if (labeledDate || !hasScheduleLayout) return labeledDate;

    // Na lista linear do SPX, Veículo e STA/STD vêm logo após o Indicador de Pontualidade.
    let vehicle = values.findIndex(value => spxLinehaulPunctualityPattern.test(value));
    if (vehicle < 0) return null;
    do {
        vehicle += 1;
    } while (vehicle < values.length &&
        (!values[vehicle] || values[vehicle] === "-" || spxLinehaulPunctualityPattern.test(values[vehicle])));
    if (!values[vehicle] || getSpXLinehaulScheduledDate([values[vehicle]])) return null;
    return getSpXLinehaulScheduledDate([values[vehicle + 1]]);
}

function hasSpXLinehaulPlainScheduleLayout(headings) {
    return /(?:indicador de pontualidade|on time indicator)\s+(?:veiculo|vehicle)\s+sta\s*(?:[\\/]\s*)?std\b/.test(headings);
}

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
    const receivedValues =
        Array.isArray(values)
            ? values
            : [];

    for (const value of receivedValues) {
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

    /*
     * O SPX nem sempre preenche a coluna CPT, mas mantém a janela
     * no nome da viagem (por exemplo, HUB_PM101 ou HUB_AM01).
     * A mesma recuperação precisa valer para todos os importadores.
     */

    for (const value of receivedValues) {
        const match =
            String(value ?? "")
                .toUpperCase()
                .replace(
                    /\s+/g,
                    "",
                )
                .match(
                    /(?:^|_)(AM|PM1|PM2)(?:\d{2})?(?:$|_)/,
                );

        if (match) {
            return match[1];
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

function createEmptySpXSelection(
    records,
    targetWindow,
    skippedScheduleGroups = 0,
) {
    return {
        records: [],
        targetWindow,
        skippedWaitingWithoutWindow: 0,
        skippedScheduleGroups,
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

function selectSpXLinehaulRecords(receivedRecords, receivedTargetWindow = "", referenceDate = new Date()) {
    const records = Array.isArray(receivedRecords) ? receivedRecords : [];
    const targetWindow = String(receivedTargetWindow || getSpXDetectedWindows(records)[0] || "").trim().toUpperCase();
    if (!targetWindow) return createEmptySpXSelection(records, targetWindow);

    let blockStart = -1;
    let blockEnd = -1;
    let blockWindowIndexes = [];
    let skippedScheduleGroups = 0;
    let scheduleDays;

    for (let index = 0; index < records.length;) {
        if (records[index].window !== targetWindow) {
            index += 1;
            continue;
        }

        let start = index;
        while (start > 0 && !records[start - 1].window) start -= 1;

        const sameWindow = [];
        while (index < records.length && (!records[index].window || records[index].window === targetWindow)) {
            if (records[index].window === targetWindow) sameWindow.push(index);
            index += 1;
        }

        const grouped = sameWindow.length === 1 ? sameWindow : sameWindow.filter(row =>
            records[row - 1]?.window === targetWindow || records[row + 1]?.window === targetWindow);
        if (!grouped.length) continue;

        // A data habilita um bloco de um LH ou um bloco composto só por Waiting.
        const requiresSchedule = grouped.length === 1 || grouped.every(row => records[row].waiting === true);
        if (requiresSchedule) {
            scheduleDays ??= getSpXLinehaulScheduleDays(referenceDate);
            if (!grouped.every(row => scheduleDays.has(records[row].scheduledDate))) {
                skippedScheduleGroups += 1;
                continue;
            }
        }

        blockStart = start;
        blockEnd = index - 1;
        blockWindowIndexes = grouped;
        break;
    }

    if (blockStart === -1) {
        return createEmptySpXSelection(records, targetWindow, skippedScheduleGroups);
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
        skippedScheduleGroups,
        skippedUngrouped,
        skippedDuplicates,
    };
}

function createSpXLinehaulWindowCandidates(records, referenceDate = new Date()) {
    return getSpXDetectedWindows(records).map(window => ({
        window,
        selection: selectSpXLinehaulRecords(records, window, referenceDate),
    }));
}

export {
    SPX_LINEHAUL_CODE_PATTERN,
    SPX_LINEHAUL_SCHEDULE_MESSAGE,
    SPX_LINEHAUL_WINDOW_PATTERN,
    createSpXLinehaulWindowCandidates,
    formatSpXLinehaulOrigin,
    getSpXDetectedWindows,
    getSpXLinehaulCode,
    getSpXLinehaulPlainLoadedOrders,
    getSpXLinehaulPlainScheduledDate,
    getSpXLinehaulScheduleColumns,
    getSpXLinehaulScheduledDate,
    getSpXLinehaulWindow,
    hasSpXLinehaulPlainScheduleLayout,
    parseSpXLinehaulQuantity,
    parseSpXLinehaulTextMatrix,
    selectSpXLinehaulRecords,
};
