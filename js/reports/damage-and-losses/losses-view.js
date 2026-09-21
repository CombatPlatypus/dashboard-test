import {
    getLossesState,
    getLossesSummary,
    subscribeLossesState,
} from "./losses-state.js";

const lossesQuantityFormatter =
    new Intl.NumberFormat("pt-BR");

const lossesCurrencyFormatter =
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

let lossesViewElements = null;

function getLossesViewElements(rootElement) {
    return {
        total:
            rootElement.querySelector("#lossesTotalValue"),
        underReview:
            rootElement.querySelector("#PackagesUnderReview"),
        confirmed:
            rootElement.querySelector("#confirmedLosses"),
        monetaryValue:
            rootElement.querySelector("#lossesMonetaryValue"),
        traditionalAnalysisTable:
            rootElement.querySelector(
                "#lossesTraditionalAnalysisTable",
            ),
    };
}

function hasLossesViewElements(elements) {
    return Object.values(elements).every(
        function (element) {
            return element instanceof HTMLElement;
        },
    );
}

function formatLossesQuantity(value, hasData) {
    return hasData
        ? lossesQuantityFormatter.format(value)
        : "—";
}

function renderLossesTraditionalAnalysis(summary) {
    const periods = [
        "today",
        "yesterday",
        "dayBeforeYesterday",
        "days3to7",
        "days8to14",
        "days15toMonthStart",
        "totalMonth",
    ];

    lossesViewElements.traditionalAnalysisTable
        .querySelectorAll("[data-losses-analysis-field]")
        .forEach(
            function (row) {
                const field =
                    row.dataset.lossesAnalysisField;
                const cells = row.querySelectorAll("td");

                periods.forEach(
                    function (period, index) {
                        const cell = cells[index];

                        if (!cell) {
                            return;
                        }

                        const value =
                            summary.traditionalAnalysis
                                ?.[period]
                                ?.[field];

                        cell.textContent =
                            formatLossesQuantity(
                                value || 0,
                                summary.hasData,
                            );
                    },
                );
            },
        );
}

function renderLossesView(
    state = getLossesState(),
) {
    if (!lossesViewElements) {
        return false;
    }

    const summary =
        getLossesSummary(state);

    lossesViewElements.total.textContent =
        formatLossesQuantity(
            summary.total,
            summary.hasData,
        );
    lossesViewElements.underReview.textContent =
        formatLossesQuantity(
            summary.underReview,
            summary.hasData,
        );
    lossesViewElements.confirmed.textContent =
        formatLossesQuantity(
            summary.confirmedLosses,
            summary.hasData,
        );
    lossesViewElements.monetaryValue.textContent =
        summary.confirmedValueRecords > 0
            ? lossesCurrencyFormatter.format(
                summary.estimatedLoss,
            )
            : "—";

    renderLossesTraditionalAnalysis(summary);

    return true;
}

function initializeLossesView(
    rootElement = document.getElementById(
        "damage-and-losses",
    ),
) {
    const panel =
        rootElement instanceof HTMLElement
            ? rootElement
            : null;

    if (!panel) {
        return false;
    }

    const elements =
        getLossesViewElements(panel);

    if (!hasLossesViewElements(elements)) {
        return false;
    }

    lossesViewElements = elements;

    if (
        panel.dataset.lossesViewInitialized ===
        "true"
    ) {
        return true;
    }

    panel.dataset.lossesViewInitialized = "true";
    subscribeLossesState(renderLossesView);
    renderLossesView();

    return true;
}

export {
    initializeLossesView,
    renderLossesView,
};
