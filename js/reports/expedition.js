import {
    getExpeditionOperatorRanking,
    getExpeditionState,
    getExpeditionSummary,
    resetExpeditionReport,
    subscribeExpeditionState,
    updateExpeditionWindow,
} from "./expedition-state.js";

/* CONFIGURAÇÕES */

const MINIMUM_EXPEDITION_PREVIEW_ROWS =
    15;

const MINIMUM_FASTEST_OPERATOR_ROUTES =
    3;

const expeditionNumberFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

/* FORMATAÇÕES */

function formatExpeditionQuantity(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    return expeditionNumberFormatter
        .format(
            value,
        );
}

function formatExpeditionDuration(
    value,
) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value),
        )
    ) {
        return "—";
    }

    const totalSeconds =
        Math.max(
            Math.round(
                Number(value),
            ),
            0,
        );

    const hours =
        Math.floor(
            totalSeconds / 3600,
        );

    const minutes =
        Math.floor(
            (
                totalSeconds % 3600
            ) /
            60,
        );

    const seconds =
        totalSeconds % 60;

    const formattedMinutes =
        String(minutes).padStart(
            2,
            "0",
        );

    const formattedSeconds =
        String(seconds).padStart(
            2,
            "0",
        );

    if (hours === 0) {
        return (
            `${formattedMinutes}:` +
            formattedSeconds
        );
    }

    return (
        `${String(hours).padStart(
            2,
            "0",
        )}:` +
        `${formattedMinutes}:` +
        formattedSeconds
    );
}

function getExpeditionOperatorName(
    value,
) {
    const receivedValue =
        String(
            value ?? "",
        ).trim();

    if (!receivedValue) {
        return "—";
    }

    const closingBracketIndex =
        receivedValue.lastIndexOf(
            "]",
        );

    const name =
        closingBracketIndex !== -1
            ? receivedValue.slice(
                closingBracketIndex + 1,
            )
            : receivedValue;

    return name.trim() || "—";
}

function setExpeditionInputValue(
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

/* ELEMENTOS */

function getExpeditionElements() {
    return {
        panel:
            document.getElementById(
                "expedition",
            ),

        windowInput:
            document.getElementById(
                "expeditionWindowInput",
            ),

        missingInput:
            document.getElementById(
                "expeditionMissingInput",
            ),

        duplicatedInput:
            document.getElementById(
                "expeditionDuplicatedInput",
            ),

        missortedInput:
            document.getElementById(
                "expeditionMissortedInput",
            ),
        unknownInput:
            document.getElementById(
                "expeditionUnknownInput",
            ),

        exceptionInput:
            document.getElementById(
                "expeditionExceptionInput",
            ),
        previewVolumeChecked:
            document.getElementById(
                "expeditionPreviewVolumeChecked",
            ),

        previewValidatedRoutes:
            document.getElementById(
                "expeditionPreviewValidatedRoutes",
            ),

        previewFloorRoutes:
            document.getElementById(
                "expeditionPreviewFloorRoutes",
            ),
        previewDuration:
            document.getElementById(
                "expeditionPreviewDuration",
            ),
        previewMissing:
            document.getElementById(
                "expeditionPreviewMissing",
            ),

        previewDuplicated:
            document.getElementById(
                "expeditionPreviewDuplicated",
            ),

        previewMissorted:
            document.getElementById(
                "expeditionPreviewMissorted",
            ),
        previewUnknown:
            document.getElementById(
                "expeditionPreviewUnknown",
            ),
        previewException:
            document.getElementById(
                "expeditionPreviewException",
            ),

        previewOperatorBody:
            document.getElementById(
                "expeditionPreviewOperatorBody",
            ),

        topRoutesOperator:
            document.getElementById(
                "expeditionTopRoutesOperator",
            ),

        topRoutesDetails:
            document.getElementById(
                "expeditionTopRoutesDetails",
            ),

        fastestOperator:
            document.getElementById(
                "expeditionFastestOperator",
            ),

        fastestOperatorDetails:
            document.getElementById(
                "expeditionFastestOperatorDetails",
            ),

        reportStatus:
            document.getElementById(
                "expeditionReportStatus",
            ),

        reportStatusIcon:
            document.getElementById(
                "expeditionReportStatusIcon",
            ),

        reportStatusText:
            document.getElementById(
                "expeditionReportStatusText",
            ),

        clearButton:
            document.getElementById(
                "expeditionClearReportButton",
            ),
    };
}

function hasExpeditionElements(
    elements,
) {
    const missingElements =
        Object.entries(
            elements,
        ).filter(
            function (
                entry,
            ) {
                return !(
                    entry[1] instanceof
                    HTMLElement
                );
            },
        );

    if (
        missingElements.length > 0
    ) {
        console.error(
            "Não foi possível inicializar o relatório de expedição. Elementos ausentes:",
            missingElements.map(
                function (entry) {
                    return entry[0];
                },
            ),
        );

        if (
            elements.reportStatusIcon instanceof
                HTMLImageElement
        ) {
            elements.reportStatusIcon.src =
                "images/geral-icons/error-icon.svg";
        }

        if (
            elements.reportStatusText instanceof
                HTMLElement
        ) {
            elements.reportStatusText.textContent =
                "Não foi possível inicializar o relatório de expedição.";
        }
    }

    return missingElements.length === 0;
}

/* SINCRONIZA O SELECT2 */

function refreshExpeditionWindowSelect(
    select,
) {
    if (
        typeof window.jQuery !==
        "function"
    ) {
        return;
    }

    const selectElement =
        window.jQuery(
            select,
        );

    if (
        !selectElement.hasClass(
            "select2-hidden-accessible",
        )
    ) {
        return;
    }

    selectElement.trigger(
        "change.select2",
    );
}

/* TABELA DOS CONFERENTES */

function createExpeditionOperatorRow(
    operator,
) {
    const row =
        document.createElement(
            "tr",
        );

    const nameCell =
        document.createElement(
            "td",
        );

    const routesCell =
        document.createElement(
            "td",
        );

    const averageTimeCell =
        document.createElement(
            "td",
        );

    const worstTimeCell =
        document.createElement(
            "td",
        );

    const bestTimeCell =
        document.createElement(
            "td",
        );

    nameCell.textContent =
        operator
            ? getExpeditionOperatorName(
                operator.operator,
            )
            : "—";

    routesCell.textContent =
        operator
            ? formatExpeditionQuantity(
                operator.routesChecked,
            )
            : "—";

    averageTimeCell.textContent =
        operator
            ? formatExpeditionDuration(
                operator.averageDurationSeconds,
            )
            : "—";

    worstTimeCell.textContent =
        operator
            ? formatExpeditionDuration(
                operator.worstDurationSeconds,
            )
            : "—";

    bestTimeCell.textContent =
        operator
            ? formatExpeditionDuration(
                operator.bestDurationSeconds,
            )
            : "—";

    row.append(
        nameCell,
        routesCell,
        averageTimeCell,
        worstTimeCell,
        bestTimeCell,
    );

    return row;
}
function renderExpeditionOperators(
    elements,
    operators,
) {
    const visibleRows =
        Math.max(
            operators.length,
            MINIMUM_EXPEDITION_PREVIEW_ROWS,
        );

    const fragment =
        document.createDocumentFragment();

    for (
        let index = 0;
        index < visibleRows;
        index += 1
    ) {
        fragment.append(
            createExpeditionOperatorRow(
                operators[index] ||
                null,
            ),
        );
    }

    elements.previewOperatorBody
        .replaceChildren(
            fragment,
        );
}

/* CARDS DO RANKING */

function renderExpeditionRankingCards(
    elements,
    operators,
) {
    const topRoutesOperator =
        operators[0] ||
        null;

    elements.topRoutesOperator
        .textContent =
            topRoutesOperator
                ? getExpeditionOperatorName(
                    topRoutesOperator.operator,
                )
                : "—";

    elements.topRoutesDetails
        .textContent =
            topRoutesOperator
                ? (
                    `${formatExpeditionQuantity(
                        topRoutesOperator
                            .routesChecked,
                    )} Rotas Conferidas`
                )
                : "0 Rotas Conferidas";

    const operatorsWithTime =
        operators.filter(
            function (operator) {
                return operator
                    .averageDurationSeconds !==
                    null;
            },
        );

    const eligibleOperators =
        operatorsWithTime.filter(
            function (operator) {
                return operator
                    .routesChecked >=
                    MINIMUM_FASTEST_OPERATOR_ROUTES;
            },
        );

    const fastestOperator =
        (
            eligibleOperators.length > 0
                ? eligibleOperators
                : operatorsWithTime
        )
            .slice()
            .sort(
                function (
                    first,
                    second,
                ) {
                    return (
                        first
                            .averageDurationSeconds -
                        second
                            .averageDurationSeconds ||

                        second.routesChecked -
                            first.routesChecked
                    );
                },
            )[0] ||
        null;

    elements.fastestOperator
        .textContent =
            fastestOperator
                ? getExpeditionOperatorName(
                    fastestOperator.operator,
                )
                : "—";

    elements.fastestOperatorDetails
        .textContent =
            fastestOperator
                ? (
                    `${formatExpeditionDuration(
                        fastestOperator
                            .averageDurationSeconds,
                    )} de média em ` +
                    `${formatExpeditionQuantity(
                        fastestOperator
                            .routesChecked,
                    )} rotas`
                )
                : "Melhor Tempo";
}

/* STATUS DO RELATÓRIO */

function renderExpeditionStatus(
    elements,
    state,
    summary,
) {
    if (!summary.hasData) {
        elements.reportStatusIcon.src =
            "images/geral-icons/alert-icon.svg";

        elements.reportStatusText
            .textContent =
                "O relatório ainda aguarda informações.";

        elements.clearButton.disabled =
            true;

        return;
    }

    elements.reportStatusIcon.src =
        "images/geral-icons/success-icon.svg";

    elements.reportStatusText
        .textContent =
            (
                `${formatExpeditionQuantity(
                    summary.totalRoutes,
                )} rotas importadas de ` +
                `${state.sourceFileName || "arquivo do SPX"}.`
            );

    elements.clearButton.disabled =
        false;
}

/* RENDERIZA O RELATÓRIO */

function renderExpeditionReport(
    elements,
    state,
) {
    const summary =
        getExpeditionSummary(
            state,
        );

    const operators =
        getExpeditionOperatorRanking(
            state,
        );

    const quantityOrDash =
        function (value) {
            return summary.hasData
                ? formatExpeditionQuantity(
                    value,
                )
                : "—";
        };

    elements.previewVolumeChecked
        .textContent =
            quantityOrDash(
                summary.volumeChecked,
            );

    elements.previewValidatedRoutes
        .textContent =
            quantityOrDash(
                summary.validatedRoutes,
            );

    elements.previewFloorRoutes
        .textContent =
            quantityOrDash(
                summary.routesOnFloor,
            );

    elements.previewDuration
        .textContent =
            summary.hasData
                ? formatExpeditionDuration(
                    summary
                        .expeditionDurationSeconds,
                )
                : "—";
    elements.previewMissing
        .textContent =
            quantityOrDash(
                summary.missingOrders,
            );

    elements.previewDuplicated
        .textContent =
            quantityOrDash(
                summary.duplicatedOrders,
            );

    elements.previewMissorted
        .textContent =
            quantityOrDash(
                summary.missortedOrders,
            );

    setExpeditionInputValue(
        elements.missingInput,
        summary.hasData
            ? summary.missingOrders
            : null,
    );

    setExpeditionInputValue(
        elements.duplicatedInput,
        summary.hasData
            ? summary.duplicatedOrders
            : null,
    );

    setExpeditionInputValue(
        elements.missortedInput,
        summary.hasData
            ? summary.missortedOrders
            : null,
    );

    elements.windowInput.value =
        state.window;

    elements.windowInput.disabled =
        !summary.hasData;

    refreshExpeditionWindowSelect(
        elements.windowInput,
    );

    renderExpeditionOperators(
        elements,
        operators,
    );

    renderExpeditionRankingCards(
        elements,
        operators,
    );

    renderExpeditionStatus(
        elements,
        state,
        summary,
    );
}

/* EVENTOS */

function bindExpeditionEvents(
    elements,
) {
    elements.windowInput
        .addEventListener(
            "change",
            function () {
                updateExpeditionWindow(
                    elements
                        .windowInput
                        .value,
                );
            },
        );

    elements.clearButton
        .addEventListener(
            "click",
            function () {
                const shouldClear =
                    window.confirm(
                        "Deseja limpar todos os dados do relatório de expedição?",
                    );

                if (shouldClear) {
                    resetExpeditionReport();
                }
            },
        );
}

/* INICIALIZAÇÃO */

function initializeExpeditionReport() {
    const elements =
        getExpeditionElements();

    if (
        !hasExpeditionElements(
            elements,
        )
    ) {
        return false;
    }

    if (
        elements.panel.dataset
            .expeditionReportInitialized ===
        "true"
    ) {
        return true;
    }

    elements.panel.dataset
        .expeditionReportInitialized =
            "true";

    bindExpeditionEvents(
        elements,
    );

    subscribeExpeditionState(
        function (state) {
            renderExpeditionReport(
                elements,
                state,
            );
        },
    );

    renderExpeditionReport(
        elements,
        getExpeditionState(),
    );

    return true;
}

export {
    initializeExpeditionReport,
};