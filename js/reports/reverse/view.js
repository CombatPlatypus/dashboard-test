import {
    REVERSE_TYPE_KEYS,
    createReverseSummary,
} from "./model.js";

import {
    getReverseState,
    subscribeReverseState,
} from "./state.js";

const reverseIntegerFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 0,
        },
    );

const reversePercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        },
    );

const MINIMUM_REVERSE_ROWS = 8;

let reverseViewElements = null;

function getReverseViewElements(
    rootElement,
) {
    const getElement =
        function (id) {
            return rootElement.querySelector(
                `#${id}`,
            );
        };

    return {
        total:
            getElement("reverseTotal"),
        return:
            getElement("reverseReturn"),
        missorted:
            getElement("reverseMissorted"),
        liquidate:
            getElement("reverseLiquidate"),
        confiscated:
            getElement("reverseConfiscated"),
        compositionReturn:
            getElement(
                "reverseCompositionReturn",
            ),
        compositionMissorted:
            getElement(
                "reverseCompositionMissorted",
            ),
        compositionLiquidate:
            getElement(
                "reverseCompositionLiquidate",
            ),
        compositionConfiscated:
            getElement(
                "reverseCompositionConfiscated",
            ),
        distributionBody:
            getElement(
                "reverseDistributionBody",
            ),
    };
}

function hasReverseViewElements(
    elements,
) {
    return Object.values(elements)
        .every(
            function (element) {
                return element instanceof
                    HTMLElement;
            },
        );
}

function formatReverseQuantity(
    value,
    hasData,
) {
    return hasData
        ? reverseIntegerFormatter
            .format(value)
        : "—";
}

function createReverseDistributionRow(
    transfer,
) {
    const row =
        document.createElement("tr");

    const values =
        transfer
            ? [
                transfer.to,
                reverseIntegerFormatter
                    .format(
                        transfer.quantity,
                    ),
                reversePercentageFormatter
                    .format(
                        transfer.percentage,
                    ),
                transfer.typeLabel,
            ]
            : ["—", "—", "—", "—"];

    values.forEach(
        function (value) {
            const cell =
                document.createElement(
                    "td",
                );

            cell.textContent = value;
            row.appendChild(cell);
        },
    );

    return row;
}

function renderReverseDistribution(
    body,
    transfers,
) {
    const fragment =
        document.createDocumentFragment();

    const visibleRows =
        Math.max(
            transfers.length,
            MINIMUM_REVERSE_ROWS,
        );

    for (
        let index = 0;
        index < visibleRows;
        index += 1
    ) {
        fragment.appendChild(
            createReverseDistributionRow(
                transfers[index] || null,
            ),
        );
    }

    body.replaceChildren(fragment);
}

function renderReverseView(
    state = getReverseState(),
) {
    if (!reverseViewElements) {
        return false;
    }

    const summary =
        createReverseSummary(
            state.transfers,
        );

    reverseViewElements.total
        .textContent =
        formatReverseQuantity(
            summary.total,
            summary.hasData,
        );

    REVERSE_TYPE_KEYS.forEach(
        function (typeKey) {
            reverseViewElements[typeKey]
                .textContent =
                formatReverseQuantity(
                    summary.quantities[
                        typeKey
                    ],
                    summary.hasData,
                );

            const indicator =
                reverseViewElements[
                    `composition${
                        typeKey[0]
                            .toUpperCase()
                    }${typeKey.slice(1)}`
                ];

            indicator.textContent =
                summary.hasData
                    ? (
                        `${reverseIntegerFormatter.format(
                            summary.quantities[
                                typeKey
                            ],
                        )} ` +
                        `(${reversePercentageFormatter.format(
                            summary.total > 0
                                ? summary.quantities[
                                    typeKey
                                ] / summary.total
                                : 0,
                        )})`
                    )
                    : "—";
        },
    );

    renderReverseDistribution(
        reverseViewElements
            .distributionBody,
        summary.transfers,
    );

    return true;
}

function initializeReverseView(
    rootElement = document,
) {
    const elements =
        getReverseViewElements(
            rootElement,
        );

    if (!hasReverseViewElements(elements)) {
        return false;
    }

    reverseViewElements = elements;

    subscribeReverseState(
        renderReverseView,
    );

    renderReverseView(
        getReverseState(),
    );

    return true;
}

export {
    initializeReverseView,
    renderReverseView,
};
