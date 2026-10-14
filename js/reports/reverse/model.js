const REVERSE_TYPE_DEFINITIONS =
    Object.freeze({
        return: {
            label: "Return",
            color: "#4caf50",
        },
        missorted: {
            label: "Missorted",
            color: "#FF5722",
        },
        liquidate: {
            label: "Liquidate",
            color: "#3F51B5",
        },
        confiscated: {
            label: "Confiscado",
            color: "#f0ad4e",
        },
    });

const REVERSE_TYPE_KEYS =
    Object.freeze(
        Object.keys(
            REVERSE_TYPE_DEFINITIONS,
        ),
    );

function normalizeReverseText(
    value,
) {
    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeReverseSearchText(
    value,
) {
    return normalizeReverseText(
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

function normalizeReverseType(
    value,
) {
    const normalizedValue =
        normalizeReverseSearchText(
            value,
        );

    if (
        normalizedValue === "return" ||
        normalizedValue === "devolucao"
    ) {
        return "return";
    }

    if (
        normalizedValue === "missorted" ||
        normalizedValue === "mis sorted" ||
        normalizedValue === "sorting incorreto"
    ) {
        return "missorted";
    }

    if (
        normalizedValue === "liquidate" ||
        normalizedValue === "liquidado" ||
        normalizedValue === "liquidacao"
    ) {
        return "liquidate";
    }

    if (
        normalizedValue === "confiscado" ||
        normalizedValue === "confiscated"
    ) {
        return "confiscated";
    }

    return null;
}

function normalizeReverseQuantity(
    value,
) {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return 0;
    }

    const numericValue =
        typeof value === "number"
            ? value
            : Number(
                String(value)
                    .replace(/\s+/g, "")
                    .replace(
                        /\.(?=\d{3}(?:\D|$))/g,
                        "",
                    )
                    .replace(",", "."),
            );

    return Number.isSafeInteger(
        numericValue,
    ) && numericValue >= 0
        ? numericValue
        : 0;
}

function createEmptyReverseQuantities() {
    return Object.fromEntries(
        REVERSE_TYPE_KEYS.map(
            function (typeKey) {
                return [typeKey, 0];
            },
        ),
    );
}

function createReverseTransfer(
    values = {},
) {
    const to =
        normalizeReverseText(
            values.to,
        ).toUpperCase();

    if (!/^TO[A-Z0-9]+$/.test(to)) {
        return null;
    }

    const quantities =
        createEmptyReverseQuantities();

    REVERSE_TYPE_KEYS.forEach(
        function (typeKey) {
            quantities[typeKey] =
                normalizeReverseQuantity(
                    values.quantities
                        ?.[typeKey],
                );
        },
    );

    const quantity =
        REVERSE_TYPE_KEYS.reduce(
            function (total, typeKey) {
                return total +
                    quantities[typeKey];
            },
            0,
        );

    if (quantity === 0) {
        return null;
    }

    return {
        to,
        destination:
            normalizeReverseText(
                values.destination,
            ),
        completedAt:
            normalizeReverseText(
                values.completedAt,
            ),
        totalOrders:
            normalizeReverseQuantity(
                values.totalOrders,
            ),
        scannedOrders:
            normalizeReverseQuantity(
                values.scannedOrders,
            ),
        sourceFileName:
            normalizeReverseText(
                values.sourceFileName,
            ),
        quantities,
        quantity,
    };
}

function getReverseTransferTypeLabel(
    transfer,
) {
    const labels =
        REVERSE_TYPE_KEYS
            .filter(
                function (typeKey) {
                    return transfer
                        ?.quantities
                        ?.[typeKey] > 0;
                },
            )
            .map(
                function (typeKey) {
                    return REVERSE_TYPE_DEFINITIONS[
                        typeKey
                    ].label;
                },
            );

    return labels.join(" / ") || "—";
}

function createReverseSummary(
    transfers = [],
) {
    const normalizedTransfers =
        Array.isArray(transfers)
            ? transfers
                .map(
                    createReverseTransfer,
                )
                .filter(Boolean)
            : [];

    const quantities =
        createEmptyReverseQuantities();

    normalizedTransfers.forEach(
        function (transfer) {
            REVERSE_TYPE_KEYS.forEach(
                function (typeKey) {
                    quantities[typeKey] +=
                        transfer
                            .quantities[
                                typeKey
                            ];
                },
            );
        },
    );

    const total =
        REVERSE_TYPE_KEYS.reduce(
            function (sum, typeKey) {
                return sum +
                    quantities[typeKey];
            },
            0,
        );

    return {
        hasData:
            normalizedTransfers.length > 0,
        total,
        quantities,
        transfers:
            normalizedTransfers
                .slice()
                .reverse()
                .map(
                    function (transfer) {
                        return {
                            ...transfer,
                            percentage:
                                total > 0
                                    ? transfer.quantity /
                                        total
                                    : 0,
                            typeLabel:
                                getReverseTransferTypeLabel(
                                    transfer,
                                ),
                        };
                    },
                ),
    };
}

export {
    REVERSE_TYPE_DEFINITIONS,
    REVERSE_TYPE_KEYS,
    createEmptyReverseQuantities,
    createReverseSummary,
    createReverseTransfer,
    getReverseTransferTypeLabel,
    normalizeReverseSearchText,
    normalizeReverseText,
    normalizeReverseType,
};
