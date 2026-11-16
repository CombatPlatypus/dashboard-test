import {
    REVERSE_TYPE_DEFINITIONS,
    REVERSE_TYPE_KEYS,
    getReverseDistribution,
    getReversePackageRows,
} from "./model.js";

import {
    getReverseSnapshot,
    getReverseStateTotals,
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
    const packageSections = {};

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

            packageSections[typeKey] =
                getElement(
                    `reverse${idSuffix}PackagesSection`,
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
        packageTables:
            getElement(
                "reversePackageTables",
            ),
        packageBodies,
        packageCopyButtons,
        packageSections,
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
                            "packageCopyButtons" &&
                        key !==
                            "packageSections";
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
        ...Object.values(
            elements.packageSections,
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
    section = null,
    showWhenEmpty = false,
) {
    if (section instanceof HTMLElement) {
        section.hidden =
            packageRows.length === 0 &&
            !showWhenEmpty;
    }

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

function renderReverseMetrics(summary) {
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
}

function renderReverseView(state = getReverseSnapshot(), change) {
    if (!reverseViewElements) return false;

    const { transfers } = state;
    if (change?.totalsChanged !== false) {
        const totals = getReverseStateTotals(state);
        renderReverseMetrics(totals);
        renderReverseDistribution(reverseViewElements.distributionBody, getReverseDistribution(transfers, totals.total));
    }

    const packageTypes = change?.packageTypes ?? REVERSE_TYPE_KEYS;
    if (packageTypes.length > 0) {
        const hasPackages = type => transfers.some(transfer => transfer.packages[type].length > 0);
        const showWhenEmpty = !REVERSE_TYPE_KEYS.some(hasPackages);
        for (const type of REVERSE_TYPE_KEYS) {
            const section = reverseViewElements.packageSections[type];
            if (packageTypes.includes(type)) {
                renderReversePackageTable(reverseViewElements.packageBodies[type], getReversePackageRows(transfers, type),
                    reverseViewElements.packageCopyButtons[type], section, showWhenEmpty);
            } else if (section instanceof HTMLElement) {
                const hidden = !showWhenEmpty && !hasPackages(type);
                if (section.hidden !== hidden) section.hidden = hidden;
            }
        }
    }

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
    elements.packageTables.hidden = false;

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

    renderReverseView();

    return true;
}

export {
    initializeReverseView,
    renderReversePackageTable,
    renderReverseView,
};
