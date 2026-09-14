import {
    LOSSES_RATE_MONTHS,
    getLossesRateMonthSummary,
    getLossesRateState,
    setActiveLossesRateMonth,
    subscribeLossesRateState,
    updateLossesRateMonthField,
} from "./state.js";

let lossesRateViewElements =
    null;

/* FORMATADORES */

const lossesRateIntegerFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

const lossesRatePercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        },
    );

/* NORMALIZA O VALOR DIGITADO */

function sanitizeLossesRateInput(
    input,
) {
    const sanitizedValue =
        input.value.replace(
            /\D/g,
            "",
        );

    if (
        input.value !==
        sanitizedValue
    ) {
        input.value =
            sanitizedValue;
    }

    return sanitizedValue;
}

/* FORMATA UMA QUANTIDADE */

function formatLossesRateQuantity(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    return lossesRateIntegerFormatter.format(
        value,
    );
}

/* FORMATA A TAXA DE PERDA */

function formatLossesRatePercentage(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    return lossesRatePercentageFormatter.format(
        value,
    );
}

/* DEFINE O VALOR DE UM INPUT */

function setLossesRateInputValue(
    input,
    value,
) {
    const receivedValue =
        value === null ||
        value === undefined
            ? ""
            : String(value);

    if (
        input.value !==
        receivedValue
    ) {
        input.value =
            receivedValue;
    }
}

/* LOCALIZA OS ELEMENTOS DO RELATÓRIO */

function getLossesRateElements(
    rootElement = document,
) {
    const getElementById =
        function (elementId) {
            if (
                rootElement.id ===
                elementId
            ) {
                return rootElement;
            }

            return rootElement.querySelector(
                `#${elementId}`,
            );
        };

    return {
        monthTabs:
            getElementById(
                "lossesRateMonthTabs",
            ),

        descriptionInput:
            getElementById(
                "lossesRateDescriptionInput",
            ),

        hubCodeInput:
            getElementById(
                "lossesRateHubCodeInput",
            ),

        subRegionalInput:
            getElementById(
                "lossesRateSubRegionalInput",
            ),

        movedInput:
            getElementById(
                "lossesRateMovedInput",
            ),

        possibleLossesInput:
            getElementById(
                "lossesRatePossibleLossesInput",
            ),

        lostInput:
            getElementById(
                "lossesRateLostInput",
            ),

        damageInput:
            getElementById(
                "lossesRateDamageInput",
            ),

        previewDescription:
            getElementById(
                "lossesRatePreviewDescription",
            ),

        previewHubCode:
            getElementById(
                "lossesRatePreviewHubCode",
            ),

        previewSubRegional:
            getElementById(
                "lossesRatePreviewSubRegional",
            ),

        previewMoved:
            getElementById(
                "lossesRatePreviewMoved",
            ),

        previewPossibleLosses:
            getElementById(
                "lossesRatePreviewPossibleLosses",
            ),

        previewLost:
            getElementById(
                "lossesRatePreviewLost",
            ),

        previewDamage:
            getElementById(
                "lossesRatePreviewDamage",
            ),

        previewTotal:
            getElementById(
                "lossesRatePreviewTotal",
            ),

        previewRate:
            getElementById(
                "lossesRatePreviewRate",
            ),

        controlsTotal:
            getElementById(
                "lossesRateControlsTotal",
            ),

        controlsRate:
            getElementById(
                "lossesRateControlsRate",
            ),  
    };
}

/* VERIFICA OS ELEMENTOS OBRIGATÓRIOS */

function hasLossesRateElements(
    elements,
) {
    return Object.values(
        elements,
    ).every(
        function (element) {
            return element instanceof HTMLElement;
        },
    );
}

/* CRIA OS BOTÕES DOS MESES */

function createLossesRateMonthTabs(
    elements,
) {
    const fragment =
        document.createDocumentFragment();

    LOSSES_RATE_MONTHS.forEach(
        function (
            monthName,
            monthIndex,
        ) {
            const item =
                document.createElement(
                    "li",
                );

            item.className =
                "tabs-title";

            const link =
                document.createElement(
                    "a",
                );

            link.href =
                "#losses-rate";

            link.dataset.lossesRateMonthIndex =
                String(monthIndex);

            link.setAttribute(
                "role",
                "tab",
            );

            link.setAttribute(
                "aria-controls",
                "lossesRatePreview",
            );

            const title =
                document.createElement(
                    "h4",
                );

            title.textContent =
                monthName;

            link.appendChild(
                title,
            );

            item.appendChild(
                link,
            );

            fragment.appendChild(
                item,
            );
        },
    );

    elements.monthTabs.replaceChildren(
        fragment,
    );
}

/* ATUALIZA OS BOTÕES DOS MESES */

function renderLossesRateMonthTabs(
    elements,
    state,
) {
    const monthTabs =
        elements.monthTabs.querySelectorAll(
            "[data-losses-rate-month-index]",
        );

    monthTabs.forEach(
        function (monthTab) {
            const monthIndex =
                Number(
                    monthTab.dataset
                        .lossesRateMonthIndex,
                );

            const isActive =
                monthIndex ===
                state.activeMonth;

            const monthData =
                state.months[
                    monthIndex
                ];

            const hasData =
                Object.values(
                    monthData,
                ).some(
                    function (value) {
                        return value !== null;
                    },
                );

            const item =
                monthTab.closest(
                    ".tabs-title",
                );

            item.classList.toggle(
                "is-active",
                isActive,
            );

            item.classList.toggle(
                "has-data",
                hasData,
            );

            monthTab.setAttribute(
                "aria-selected",
                String(isActive),
            );

            monthTab.tabIndex =
                isActive
                    ? 0
                    : -1;
        },
    );
}

/* ATUALIZA OS INPUTS DO MÊS */

function renderLossesRateInputs(
    elements,
    summary,
) {
    setLossesRateInputValue(
        elements.movedInput,
        summary.moved,
    );

    setLossesRateInputValue(
        elements.possibleLossesInput,
        summary.possibleLosses,
    );

    setLossesRateInputValue(
        elements.lostInput,
        summary.lost,
    );

    setLossesRateInputValue(
        elements.damageInput,
        summary.damage,
    );
}

/* ATUALIZA OS INPUTS DE IDENTIFICAÇÃO */

function renderLossesRateIdentification(
    elements,
    identification,
) {
    setLossesRateInputValue(
        elements.descriptionInput,
        identification.description,
    );

    setLossesRateInputValue(
        elements.hubCodeInput,
        identification.hubCode,
    );

    setLossesRateInputValue(
        elements.subRegionalInput,
        identification.subRegional,
    );
}

/* ATUALIZA O RESUMO DOS CONTROLES */

function renderLossesRateControlsSummary(
    elements,
    summary,
) {
    elements.controlsTotal.textContent =
        formatLossesRateQuantity(
            summary.totalLosses,
        );

    elements.controlsRate.textContent =
        formatLossesRatePercentage(
            summary.lossRate,
        );
}

/* ATUALIZA A PRÉVIA */

function renderLossesRatePreview(
    elements,
    state,
    summary,
) {
    const identification =
        state.identification;

    elements.previewDescription.textContent =
        identification.description ||
        "—";

    elements.previewHubCode.textContent =
        identification.hubCode ||
        "—";

    elements.previewSubRegional.textContent =
        identification.subRegional ||
        "—";

    elements.previewMoved.textContent =
        formatLossesRateQuantity(
            summary.moved,
        );

    elements.previewPossibleLosses.textContent =
        formatLossesRateQuantity(
            summary.possibleLosses,
        );

    elements.previewLost.textContent =
        formatLossesRateQuantity(
            summary.lost,
        );

    elements.previewDamage.textContent =
        formatLossesRateQuantity(
            summary.damage,
        );

    elements.previewTotal.textContent =
        formatLossesRateQuantity(
            summary.totalLosses,
        );

    elements.previewRate.textContent =
        formatLossesRatePercentage(
            summary.lossRate,
        );
}

/* RENDERIZA O RELATÓRIO */

function renderLossesRateReport(
    elements,
    state,
) {
    const summary =
        getLossesRateMonthSummary(
            state.activeMonth,
        );

    if (!summary) {
        return;
    }

    renderLossesRateMonthTabs(
        elements,
        state,
    );

    renderLossesRateIdentification(
        elements,
        state.identification,
    );

    renderLossesRateInputs(
        elements,
        summary,
    );

    renderLossesRateControlsSummary(
        elements,
        summary,
    );

    renderLossesRatePreview(
        elements,
        state,
        summary,
    );
}

/* CONECTA UM INPUT MENSAL */

function bindLossesRateMonthInput(
    input,
    field,
) {
    input.addEventListener(
        "input",
        function () {
            const sanitizedValue =
                sanitizeLossesRateInput(
                    input,
                );

            const state =
                getLossesRateState();

            updateLossesRateMonthField(
                state.activeMonth,
                field,
                sanitizedValue,
            );
        },
    );
}

/* CONECTA OS INPUTS MENSAIS */

function bindLossesRateInputs(
    elements,
) {
    bindLossesRateMonthInput(
        elements.movedInput,
        "moved",
    );

    bindLossesRateMonthInput(
        elements.possibleLossesInput,
        "possibleLosses",
    );

    bindLossesRateMonthInput(
        elements.lostInput,
        "lost",
    );

    bindLossesRateMonthInput(
        elements.damageInput,
        "damage",
    );
}

/* CONECTA OS BOTÕES DOS MESES */

function bindLossesRateMonthTabs(
    elements,
) {
    elements.monthTabs.addEventListener(
        "click",
        function (event) {
            const monthTab =
                event.target.closest(
                    "[data-losses-rate-month-index]",
                );

            if (
                !monthTab ||
                !elements.monthTabs.contains(
                    monthTab,
                )
            ) {
                return;
            }

            event.preventDefault();

            const monthIndex =
                Number(
                    monthTab.dataset
                        .lossesRateMonthIndex,
                );

            setActiveLossesRateMonth(
                monthIndex,
            );

            monthTab.focus();
        },
    );
}

/* INICIALIZA O RELATÓRIO DE TAXA DE PERDAS */

function initializeLossesRateView(
    rootElement,
) {
    const elements =
        getLossesRateElements(
            rootElement,
        );

    if (
        !hasLossesRateElements(
            elements,
        )
    ) {
        return false;
    }

    lossesRateViewElements =
        elements;

    if (
        elements.monthTabs.dataset
            .lossesRateInitialized ===
        "true"
    ) {
        return true;
    }

    elements.monthTabs.dataset
        .lossesRateInitialized =
            "true";

    createLossesRateMonthTabs(
        elements,
    );

    bindLossesRateMonthTabs(
        elements,
    );

    bindLossesRateInputs(
        elements,
    );

    subscribeLossesRateState(
        function (state) {
            renderLossesRateReport(
                elements,
                state,
            );
        },
    );

    renderLossesRateReport(
        elements,
        getLossesRateState(),
    );

    return true;
}

function renderLossesRateView(
    state = getLossesRateState(),
) {
    if (!lossesRateViewElements) {
        return false;
    }

    renderLossesRateReport(
        lossesRateViewElements,
        state,
    );

    return true;
}

export {
    initializeLossesRateView,
    renderLossesRateView,
};
