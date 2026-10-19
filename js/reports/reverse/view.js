import {
    REVERSE_TYPE_DEFINITIONS,
    REVERSE_TYPE_KEYS,
    createReverseSummary,
} from "./model.js";

import {
    getReverseState,
    subscribeReverseState,
} from "./state.js";

import {
    bindReversePackageCopyButton,
} from "./package-copy.js";

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
            maximumFractionDigits: 0,
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

    const packageBodies = {};
    const packageCopyButtons = {};

    REVERSE_TYPE_KEYS.forEach(
        function (typeKey) {
            const idSuffix =
                `${typeKey[0]
                    .toUpperCase()}${typeKey.slice(1)}`;

            packageBodies[typeKey] =
                getElement(
                    `reverse${idSuffix}PackagesBody`,
                );

            packageCopyButtons[typeKey] =
                getElement(
                    `reverseCopy${idSuffix}PackagesButton`,
                );
        },
    );

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
        packageBodies,
        packageCopyButtons,
    };
}

function hasReverseViewElements(
    elements,
) {
    const viewElements =
        Object.entries(elements)
            .filter(
                function ([key]) {
                    return key !==
                            "packageBodies" &&
                        key !==
                            "packageCopyButtons";
                },
            )
            .map(
                function ([, element]) {
                    return element;
                },
            );

    return [
        ...viewElements,
        ...Object.values(
            elements.packageBodies,
        ),
        ...Object.values(
            elements.packageCopyButtons,
        ),
    ]
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

function createReversePackageRow(
    packageRow,
) {
    const row =
        document.createElement("tr");

    [
        packageRow.trackingNumber,
        packageRow.to,
    ].forEach(
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

function renderReversePackageTable(
    body,
    packageRows,
    copyButton = null,
) {
    if (
        copyButton instanceof
            HTMLButtonElement
    ) {
        copyButton.disabled =
            copyButton.dataset
                .reversePackageCopyBusy ===
                "true" ||
            packageRows.length === 0;
    }

    if (packageRows.length === 0) {
        const row =
            document.createElement("tr");
        const cell =
            document.createElement("td");

        row.className = "empty-row";
        cell.colSpan = 2;
        cell.textContent = "—";
        row.appendChild(cell);
        body.replaceChildren(row);

        return;
    }

    const fragment =
        document.createDocumentFragment();

    packageRows.forEach(
        function (packageRow) {
            fragment.appendChild(
                createReversePackageRow(
                    packageRow,
                ),
            );
        },
    );

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

    REVERSE_TYPE_KEYS.forEach(
        function (typeKey) {
            renderReversePackageTable(
                reverseViewElements
                    .packageBodies[
                        typeKey
                    ],
                summary.packages[
                    typeKey
                ],
                reverseViewElements
                    .packageCopyButtons[
                        typeKey
                    ],
            );
        },
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

    REVERSE_TYPE_KEYS.forEach(
        function (typeKey) {
            bindReversePackageCopyButton(
                elements
                    .packageCopyButtons[
                        typeKey
                    ],
                elements.packageBodies[
                    typeKey
                ],
                REVERSE_TYPE_DEFINITIONS[
                    typeKey
                ].label,
            );
        },
    );

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
    renderReversePackageTable,
    renderReverseView,
};
