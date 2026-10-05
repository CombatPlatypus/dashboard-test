import {
    createParcelSummary,
    filterParcelPackageRows,
    formatParcelOperatorName,
} from "./model.js";

import {
    getParcelState,
    subscribeParcelState,
    updateParcelFilter,
} from "./state.js";

const parcelIntegerFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 0,
        },
    );

const parcelPercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        },
    );

let parcelViewElements = null;

function getParcelViewElements(
    rootElement,
) {
    return {
        totalScanned:
            rootElement.querySelector(
                "#parcelTotalScanned",
            ),
        backlogTotal:
            rootElement.querySelector(
                "#parcelBacklogTotal",
            ),
        exceptionTotal:
            rootElement.querySelector(
                "#parcelExceptionTotal",
            ),
        unscannedTotal:
            rootElement.querySelector(
                "#parcelUnscannedTotal",
            ),
        coverageScanned:
            rootElement.querySelector(
                "#parcelCoverageScanned",
            ),
        coverageUnscanned:
            rootElement.querySelector(
                "#parcelCoverageUnscanned",
            ),
        operatorBody:
            rootElement.querySelector(
                "#parcelOperatorDistributionBody",
            ),
        packageFilter:
            rootElement.querySelector(
                "#parcelPackageFilter",
            ),
        commonPackagesBody:
            rootElement.querySelector(
                "#parcelCommonPackagesBody",
            ),
        bulkyPackagesBody:
            rootElement.querySelector(
                "#parcelBulkyPackagesBody",
            ),
    };
}

function hasParcelViewElements(
    elements,
) {
    return Object.values(
        elements,
    ).every(
        function (element) {
            return element instanceof
                HTMLElement;
        },
    );
}

function createEmptyTableRow(
    columnCount,
) {
    const row =
        document.createElement(
            "tr",
        );

    const cell =
        document.createElement(
            "td",
        );

    row.className =
        "empty-row";

    cell.colSpan =
        columnCount;

    cell.textContent = "—";

    row.appendChild(
        cell,
    );

    return row;
}

function renderParcelOperatorTable(
    body,
    operatorStats,
) {
    body.replaceChildren();

    if (
        operatorStats.length === 0
    ) {
        body.appendChild(
            createEmptyTableRow(
                3,
            ),
        );

        return;
    }

    const fragment =
        document.createDocumentFragment();

    operatorStats.forEach(
        function (operator) {
            const row =
                document.createElement(
                    "tr",
                );

            [
                formatParcelOperatorName(operator.operator),
                parcelIntegerFormatter
                    .format(
                        operator.count,
                    ),
                parcelPercentageFormatter
                    .format(
                        operator.percentage,
                    ),
            ].forEach(
                function (value) {
                    const cell =
                        document.createElement(
                            "td",
                        );

                    cell.textContent =
                        value;

                    row.appendChild(
                        cell,
                    );
                },
            );

            fragment.appendChild(
                row,
            );
        },
    );

    body.appendChild(
        fragment,
    );
}

function renderParcelPackageTable(
    body,
    rows,
) {
    body.replaceChildren();

    if (
        rows.length === 0
    ) {
        body.appendChild(
            createEmptyTableRow(
                2,
            ),
        );

        return;
    }

    const fragment =
        document.createDocumentFragment();

    rows.forEach(
        function (item) {
            const row =
                document.createElement(
                    "tr",
                );

            [
                formatParcelOperatorName(item.operator),
                item.trackingNumber,
            ].forEach(
                function (value) {
                    const cell =
                        document.createElement(
                            "td",
                        );

                    cell.textContent =
                        value;

                    row.appendChild(
                        cell,
                    );
                },
            );

            fragment.appendChild(
                row,
            );
        },
    );

    body.appendChild(
        fragment,
    );
}

function renderParcelFilter(
    elements,
    state,
) {
    const hasData =
        state.rows.length > 0;

    elements.packageFilter
        .querySelectorAll(
            "[data-parcel-filter]",
        )
        .forEach(
            function (button) {
                const isActive =
                    button.dataset
                        .parcelFilter ===
                    state.activeFilter;

                button.disabled =
                    !hasData;

                button.classList.toggle(
                    "is-active",
                    isActive,
                );

                button.setAttribute(
                    "aria-selected",
                    String(
                        isActive,
                    ),
                );
            },
        );
}

function renderParcelView(
    state = getParcelState(),
) {
    if (!parcelViewElements) {
        return false;
    }

    const summary =
        createParcelSummary(
            state.rows,
        );

    const formatMetric =
        function (value) {
            return summary.hasData
                ? parcelIntegerFormatter
                    .format(
                        value,
                    )
                : "—";
        };

    parcelViewElements
        .totalScanned
        .textContent =
            formatMetric(
                summary.scannedCount,
            );

    parcelViewElements
        .backlogTotal
        .textContent =
            formatMetric(
                summary.backlogCount,
            );

    parcelViewElements
        .exceptionTotal
        .textContent =
            formatMetric(
                summary.exceptionCount,
            );

    parcelViewElements
        .unscannedTotal
        .textContent =
            formatMetric(
                summary.unscannedCount,
            );

    parcelViewElements
        .coverageScanned
        .textContent =
            formatMetric(
                summary.scannedCount,
            );

    parcelViewElements
        .coverageUnscanned
        .textContent =
            formatMetric(
                summary.unscannedCount,
            );

    renderParcelOperatorTable(
        parcelViewElements
            .operatorBody,
        summary.operatorStats,
    );

    renderParcelFilter(
        parcelViewElements,
        state,
    );

    renderParcelPackageTable(
        parcelViewElements
            .commonPackagesBody,
        filterParcelPackageRows(
            summary.commonRows,
            state.activeFilter,
        ),
    );

    renderParcelPackageTable(
        parcelViewElements
            .bulkyPackagesBody,
        filterParcelPackageRows(
            summary.bulkyRows,
            state.activeFilter,
        ),
    );

    return true;
}

function initializeParcelView(
    rootElement = document,
) {
    parcelViewElements =
        getParcelViewElements(
            rootElement,
        );

    if (
        !hasParcelViewElements(
            parcelViewElements,
        )
    ) {
        parcelViewElements = null;

        return false;
    }

    if (
        parcelViewElements
            .packageFilter
            .dataset
            .parcelViewInitialized ===
        "true"
    ) {
        return true;
    }

    parcelViewElements
        .packageFilter
        .dataset
        .parcelViewInitialized =
            "true";

    parcelViewElements
        .packageFilter
        .addEventListener(
            "click",
            function (event) {
                const button =
                    event.target.closest(
                        "[data-parcel-filter]",
                    );

                if (
                    !(
                        button instanceof
                            HTMLButtonElement
                    ) ||
                    button.disabled
                ) {
                    return;
                }

                updateParcelFilter(
                    button.dataset
                        .parcelFilter,
                );
            },
        );

    subscribeParcelState(
        renderParcelView,
    );

    return renderParcelView(
        getParcelState(),
    );
}

export {
    initializeParcelView,
    renderParcelView,
};
