import {
    createParcelSummary,
    filterParcelPackageRows,
    formatParcelOperatorName,
    getParcelOperatorKey,
} from "./model.js";

import {
    getParcelState,
    subscribeParcelState,
    toggleParcelOperatorBulky,
    updateParcelFilter,
} from "./state.js";

import {
    sortParcelPackageRows,
    toggleParcelPackageSort,
} from "./table-sort.js";

import { bindParcelPackageCopyButton } from "./package-copy.js";

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

const parcelCoveragePercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

function formatParcelCoverageMetric(quantity, total) {
    if (total <= 0) {
        return "—";
    }

    return `${parcelIntegerFormatter.format(quantity)} ` +
        `(${parcelCoveragePercentageFormatter.format(quantity / total)})`;
}

let parcelViewElements = null;
const parcelPackageSorts = { common: null, bulky: null };

const parcelMinimumOperatorRows = 8;

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
        missortedTotal:
            rootElement.querySelector(
                "#parcelMissortedTotal",
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

            const classificationCell = document.createElement("td");
            const button = document.createElement("button");
            const isBulky = operator.packageKind === "bulky";
            button.type = "button";
            button.className = "parcel-bulky-toggle";
            button.dataset.parcelOperatorKey = operator.operatorKey ?? getParcelOperatorKey(operator.operator);
            button.textContent = isBulky ? "Sim" : "Não";
            button.setAttribute("aria-label", `Volumoso? ${formatParcelOperatorName(operator.operator)}`);
            button.setAttribute("aria-pressed", String(isBulky));
            classificationCell.appendChild(button);
            row.appendChild(classificationCell);

            fragment.appendChild(
                row,
            );
        },
    );

    for (let index = operatorStats.length; index < parcelMinimumOperatorRows; index += 1) {
        const row = document.createElement("tr");
        row.className = "empty-row";

        for (let column = 0; column < 4; column += 1) {
            const cell = document.createElement("td");
            cell.textContent = "-";
            row.appendChild(cell);
        }

        fragment.appendChild(row);
    }

    body.appendChild(
        fragment,
    );
}

function renderParcelPackageTable(
    body,
    rows,
    sort,
) {
    const table = body.closest("table");
    const copyButton = table.querySelector("[data-parcel-copy]");
    if (copyButton instanceof HTMLButtonElement) {
        copyButton.disabled = copyButton.dataset.parcelCopyBusy === "true" || rows.length === 0;
    }

    table.querySelectorAll("[data-parcel-sort]").forEach(button => {
        const isSorted = sort?.column === button.dataset.parcelSort;
        const direction = isSorted ? sort.direction : null;
        button.closest("th").setAttribute("aria-sort",
            direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none");
        button.querySelector(".parcel-sort-indicator").textContent =
            direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕";
    });

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

    sortParcelPackageRows(rows, sort).forEach(
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
    event,
) {
    if (!parcelViewElements) {
        return false;
    }

    if (["parcel-rows-replaced", "parcel-reset", "parcel-state-restored"].includes(event?.type)) {
        parcelPackageSorts.common = null;
        parcelPackageSorts.bulky = null;
    }

    const summary =
        createParcelSummary(
            state.rows,
            state.operatorKindOverrides,
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
        .missortedTotal
        .textContent =
            formatMetric(
                summary.missortedCount,
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
            formatParcelCoverageMetric(
                summary.expectedScannedCount,
                summary.expectedTotalCount,
            );

    parcelViewElements
        .coverageUnscanned
        .textContent =
            formatParcelCoverageMetric(
                summary.expectedUnscannedCount,
                summary.expectedTotalCount,
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
        parcelPackageSorts.common,
    );

    renderParcelPackageTable(
        parcelViewElements
            .bulkyPackagesBody,
        filterParcelPackageRows(
            summary.bulkyRows,
            state.activeFilter,
        ),
        parcelPackageSorts.bulky,
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

    parcelViewElements.operatorBody.addEventListener("click", event => {
        const button = event.target instanceof Element
            ? event.target.closest("[data-parcel-operator-key]")
            : null;
        if (!(button instanceof HTMLButtonElement) ||
            !parcelViewElements.operatorBody.contains(button)) {
            return;
        }

        const operatorKey = button.dataset.parcelOperatorKey;
        if (toggleParcelOperatorBulky(operatorKey)) {
            const replacement = [...parcelViewElements.operatorBody.querySelectorAll("[data-parcel-operator-key]")]
                .find(item => item.dataset.parcelOperatorKey === operatorKey);
            replacement?.focus({ preventScroll: true });
        }
    });

    parcelPackageSorts.common = null;
    parcelPackageSorts.bulky = null;
    [
        ["common", parcelViewElements.commonPackagesBody],
        ["bulky", parcelViewElements.bulkyPackagesBody],
    ].forEach(([kind, body]) => {
        const table = body.closest("table");
        table.addEventListener("click", event => {
            const button = event.target instanceof Element
                ? event.target.closest("[data-parcel-sort]")
                : null;
            if (!(button instanceof HTMLButtonElement) || !table.contains(button)) {
                return;
            }

            parcelPackageSorts[kind] = toggleParcelPackageSort(
                parcelPackageSorts[kind], button.dataset.parcelSort);
            renderParcelView();
        });

        bindParcelPackageCopyButton(
            table.querySelector("[data-parcel-copy]"), body,
            kind === "common" ? "pacotes comuns" : "pacotes volumosos",
        );
    });

    return renderParcelView(
        getParcelState(),
    );
}

export {
    formatParcelCoverageMetric,
    initializeParcelView,
    renderParcelOperatorTable,
    renderParcelView,
};
