import {
    getExpeditionErrorAnalysis,
    getExpeditionOperatorRanking,
    getExpeditionState,
    getExpeditionSummary,
    resetExpeditionReport,
    subscribeExpeditionState,
    updateExpeditionManualQuantity,
    updateExpeditionOperatorSelection,
    updateExpeditionStreetGuardian,
} from "./state.js";

import {
    resetReportNotification,
    setReportNotification,
} from "../report-notifications.js";

import {
    formatReportPersonFirstName,
} from "../core/person-name.js";

/* CONFIGURAÇÕES */

const MINIMUM_EXPEDITION_PREVIEW_ROWS =
    30;

const MINIMUM_EXPEDITION_STREET_ROWS =
    10;

const MINIMUM_FASTEST_OPERATOR_ROUTES =
    3;

const EXPEDITION_ERROR_TAB_TARGETS =
    new Set([
        "#expedition-mistakes",
        "#expedition-streets",
    ]);

const EXPEDITION_ERROR_IMPORT_MESSAGE =
    "Importe uma planilha com a aba Bipagem de Erros, seguindo exatamente o modelo fornecido no footer do dashboard.";

let expeditionViewElements =
    null;

const expeditionNumberFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

const expeditionRateFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
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

function formatExpeditionRate(
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

    return expeditionRateFormatter
        .format(
            Number(value),
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
    return formatReportPersonFirstName(
        value,
        "—",
    );
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

function getExpeditionElements(
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
        panel:
            getElementById(
                "expedition",
            ),

        tabs:
            getElementById(
                "expedition-view-tabs",
            ),

        floorVolumeInput:
            getElementById(
                "expeditionFloorRoutesInput",
            ),

        duplicatedInput:
            getElementById(
                "expeditionDuplicatedInput",
            ),

        exceptionInput:
            getElementById(
                "expeditionExceptionInput",
            ),

        revertedInput:
            getElementById(
                "expeditionRevertedInput",
            ),

        streetGuardianControls:
            getElementById(
                "expeditionStreetGuardianControls",
            ),

        operatorControls:
            getElementById(
                "expeditionOperatorControls",
            ),

        previewWindow:
            getElementById(
                "expeditionPreviewWindow",
            ),

        previewOperatorCount:
            getElementById(
                "expeditionPreviewOperatorCount",
            ),

        previewVolumeChecked:
            getElementById(
                "expeditionPreviewVolumeChecked",
            ),

        previewValidatedRoutes:
            getElementById(
                "expeditionPreviewValidatedRoutes",
            ),

        previewFloorVolume:
            getElementById(
                "expeditionPreviewFloorRoutes",
            ),
        previewDuration:
            getElementById(
                "expeditionPreviewDuration",
            ),
        previewMissing:
            getElementById(
                "expeditionPreviewMissing",
            ),

        previewDuplicated:
            getElementById(
                "expeditionPreviewDuplicated",
            ),

        previewMissorted:
            getElementById(
                "expeditionPreviewMissorted",
            ),
        previewException:
            getElementById(
                "expeditionPreviewException",
            ),

        previewOperatorBody:
            getElementById(
                "expeditionPreviewOperatorBody",
            ),

        previewSortingErrors:
            getElementById(
                "expeditionPreviewSortingErrors",
            ),

        previewLabelingErrors:
            getElementById(
                "expeditionPreviewLabelingErrors",
            ),

        previewTotalErrors:
            getElementById(
                "expeditionPreviewTotalErrors",
            ),

        previewErrorRate:
            getElementById(
                "expeditionPreviewErrorRate",
            ),

        previewRevertedErrors:
            getElementById(
                "expeditionPreviewRevertedErrors",
            ),

        previewRevertedRate:
            getElementById(
                "expeditionPreviewRevertedRate",
            ),

        previewFinalErrors:
            getElementById(
                "expeditionPreviewFinalErrors",
            ),

        previewFinalRate:
            getElementById(
                "expeditionPreviewFinalRate",
            ),

        previewStreetBody:
            getElementById(
                "expeditionPreviewStreetBody",
            ),

        topRoutesOperator:
            getElementById(
                "expeditionTopRoutesOperator",
            ),

        topRoutesDetails:
            getElementById(
                "expeditionTopRoutesDetails",
            ),

        fastestOperator:
            getElementById(
                "expeditionFastestOperator",
            ),

        fastestOperatorDetails:
            getElementById(
                "expeditionFastestOperatorDetails",
            ),

        clearButton:
            getElementById(
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

        setReportNotification({
            reportId: "expedition",

            type: "error",

            message:
                "Não foi possível inicializar o relatório de expedição.",
        });
    }

    return missingElements.length === 0;
}

/* ATIVA OU DESATIVA OS CONTROLES GERAIS */

function setExpeditionGeneralControlsAvailability(
    elements,
    hasImportedFile,
    hasErrorAnalysis,
) {
    const disabled =
        !hasImportedFile;

    elements.floorVolumeInput.disabled =
        disabled;

    elements.floorVolumeInput.readOnly =
        false;

    elements.duplicatedInput.disabled =
        disabled;

    elements.exceptionInput.disabled =
        disabled;

    elements.revertedInput.disabled =
        !hasErrorAnalysis;

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

/* CONTROLES DOS CONFERENTES */

function createExpeditionOperatorControl(
    operator,
    index,
) {
    const field =
        document.createElement(
            "div",
        );

    field.className =
        "expedition-operator-control";

    const title =
        document.createElement(
            "h4",
        );

    title.textContent =
        `Conferente ${String(
            index + 1,
        ).padStart(2, "0")}`;

    const checkboxContainer =
        document.createElement(
            "div",
        );

    checkboxContainer.className =
        "checkbox flex-box-start";

    const nameInput =
        document.createElement(
            "input",
        );

    nameInput.type =
        "text";

    nameInput.readOnly =
        true;

    const checkbox =
        document.createElement(
            "input",
        );

    checkbox.type =
        "checkbox";

    const checkboxId =
        `expeditionChecker${String(
            index + 1,
        ).padStart(2, "0")}`;

    checkbox.id =
        checkboxId;

    const label =
        document.createElement(
            "label",
        );

    label.htmlFor =
        checkboxId;

    if (operator) {
        nameInput.disabled =
            false;

        const operatorName =
            getExpeditionOperatorName(
                operator.operator,
            );

        nameInput.value =
            operatorName;

        nameInput.title =
            operatorName;

        checkbox.checked =
            operator.selected !==
            false;

        checkbox.setAttribute(
            "aria-label",
            `Exibir ${operatorName} no relatório`,
        );

        checkbox.addEventListener(
            "change",
            function () {
                updateExpeditionOperatorSelection(
                    operator.operator,
                    checkbox.checked,
                );
            },
        );
    } else {
        nameInput.disabled =
            true;

        checkbox.disabled =
            true;

        checkbox.setAttribute(
            "aria-label",
            "Conferente indisponível",
        );
    }

    checkboxContainer.append(
        nameInput,
        checkbox,
        label,
    );

    field.append(
        title,
        checkboxContainer,
    );

    return field;
}

function renderExpeditionOperatorControls(
    elements,
    operators,
) {
    const fragment =
        document.createDocumentFragment();

    const visibleControls =
        Math.max(
            operators.length,
            MINIMUM_EXPEDITION_PREVIEW_ROWS,
        );

    for (
        let index = 0;
        index < visibleControls;
        index += 1
    ) {
        fragment.append(
            createExpeditionOperatorControl(
                operators[index] ||
                    null,

                index,
            ),
        );
    }

    elements.operatorControls
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

/* TABELAS DE ERROS */

function createExpeditionStreetRow(
    street,
) {
    const row =
        document.createElement(
            "tr",
        );

    const values =
        street
            ? [
                street.name || "—",
                street.guardian || "—",
                formatExpeditionQuantity(
                    street.missingOrders,
                ),
                formatExpeditionQuantity(
                    street.totalErrors,
                ),
                formatExpeditionRate(
                    street.errorRate,
                ),
            ]
            : [
                "—",
                "—",
                "—",
                "—",
                "—",
            ];

    values.forEach(
        function (value, index) {
            const cell =
                document.createElement(
                    "td",
                );

            const guardianMatch =
                index === 1 && street
                    ? String(value).match(
                        /^(\[ops\d+\])\s*(.*)$/i,
                    )
                    : null;

            if (guardianMatch) {
                const code =
                    document.createElement(
                        "span",
                    );

                code.textContent =
                    guardianMatch[1]
                        .toLowerCase();

                const name =
                    document.createElement(
                        "span",
                    );

                name.classList.add(
                    "expedition-guardian-name",
                );

                name.textContent =
                    guardianMatch[2];

                cell.append(
                    code,
                    " ",
                    name,
                );
            } else {
                if (index === 1 && street) {
                    cell.classList.add(
                        "expedition-guardian-name",
                    );
                }

                cell.textContent =
                    value;
            }

            row.append(
                cell,
            );
        },
    );

    return row;
}

function renderExpeditionStreetTable(
    elements,
    streets,
) {
    const receivedStreets =
        Array.isArray(streets)
            ? streets
            : [];

    const fragment =
        document.createDocumentFragment();

    const visibleRows =
        Math.max(
            receivedStreets.length,
            MINIMUM_EXPEDITION_STREET_ROWS,
        );

    for (
        let index = 0;
        index < visibleRows;
        index += 1
    ) {
        fragment.append(
            createExpeditionStreetRow(
                receivedStreets[index] ||
                    null,
            ),
        );
    }

    elements.previewStreetBody
        .replaceChildren(
            fragment,
        );
}

function renderExpeditionGuardianControls(
    elements,
    streets,
) {
    const receivedStreets =
        Array.isArray(streets)
            ? streets
            : [];

    const visibleInputs =
        Math.max(
            receivedStreets.length,
            MINIMUM_EXPEDITION_STREET_ROWS,
        );

    const inputStreets =
        Array.from(
            {
                length: visibleInputs,
            },
            function (
                unused,
                index,
            ) {
                return (
                    receivedStreets[index] ||
                    null
                );
            },
        );

    const currentInputs =
        Array.from(
            elements.streetGuardianControls
                .querySelectorAll(
                    "input[data-expedition-guardian-input]",
                ),
        );

    const hasSameStreets =
        currentInputs.length ===
            inputStreets.length &&
        currentInputs.every(function (
            input,
            index,
        ) {
            return (
                input.dataset
                    .expeditionStreet ===
                (
                    inputStreets[index]
                        ?.name ||
                    ""
                )
            );
        });

    if (!hasSameStreets) {
        const fragment =
            document.createDocumentFragment();

        inputStreets.forEach(function (
            street,
            index,
        ) {
            const field =
                document.createElement(
                    "div",
                );

            const title =
                document.createElement(
                    "h4",
                );

            title.textContent =
                "Rua ";

            const streetName =
                document.createElement(
                    "span",
                );

            streetName.textContent =
                street?.name || "—";

            title.append(
                streetName,
            );

            const input =
                document.createElement(
                    "input",
                );

            input.id =
                `expeditionStreetGuardianInput${index}`;

            input.type = "text";
            input.maxLength = 22;
            input.autocomplete = "off";
            input.setAttribute(
                "aria-label",
                street
                    ? `Guardião da rua ${street.name}`
                    : "Guardião de rua ainda não importada",
            );
            input.dataset
                .expeditionGuardianInput =
                    "true";
            input.dataset.expeditionStreet =
                street?.name || "";
            input.disabled =
                !street;

            field.append(
                title,
                input,
            );

            fragment.append(
                field,
            );
        });

        elements.streetGuardianControls
            .replaceChildren(
                fragment,
            );
    }

    const inputs =
        elements.streetGuardianControls
            .querySelectorAll(
                "input[data-expedition-guardian-input]",
            );

    inputs.forEach(function (
        input,
        index,
    ) {
        const street =
            inputStreets[index];

        input.disabled =
            !street;

        if (
            document.activeElement !==
            input
        ) {
            setExpeditionInputValue(
                input,
                street
                    ?.guardian ||
                    null,
            );
        }
    });
}

function renderExpeditionErrorTables(
    elements,
    analysis,
) {
    const quantity =
        function (value) {
            return formatExpeditionQuantity(
                value,
            );
        };

    elements.previewSortingErrors
        .textContent =
            quantity(
                analysis.sortingErrors,
            );

    elements.previewLabelingErrors
        .textContent =
            quantity(
                analysis.labelingErrors,
            );

    elements.previewTotalErrors
        .textContent =
            quantity(
                analysis.totalErrors,
            );

    elements.previewErrorRate
        .textContent =
            formatExpeditionRate(
                analysis.errorRate,
            );

    elements.previewRevertedErrors
        .textContent =
            quantity(
                analysis.totalRevertedErrors,
            );

    elements.previewRevertedRate
        .textContent =
            formatExpeditionRate(
                analysis.revertedRate,
            );

    elements.previewFinalErrors
        .textContent =
            quantity(
                analysis.finalErrors,
            );

    elements.previewFinalRate
        .textContent =
            formatExpeditionRate(
                analysis.finalRate,
            );

    setExpeditionInputValue(
        elements.revertedInput,
        analysis.canCalculate
            ? analysis
                .totalRevertedErrors
            : null,
    );

    renderExpeditionStreetTable(
        elements,
        analysis.streets,
    );
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

    const errorAnalysis =
        getExpeditionErrorAnalysis(
            state,
        );

    const hasImportedFile =
        state.routes.length > 0;

    setExpeditionGeneralControlsAvailability(
        elements,
        hasImportedFile,
        errorAnalysis.canCalculate,
    );

    const operators =
        getExpeditionOperatorRanking(
            state,
        );

     const selectedOperators =
        operators.filter(
            function (operator) {
                return operator.selected !==
                    false;
            },
        );   

    const quantityOrDash =
        function (value) {
            return summary.hasData
                ? formatExpeditionQuantity(
                    value,
                )
                : "—";
        };

    elements.previewWindow
        .textContent =
            String(
                state.window ?? "",
            ).trim() || "—";

    elements.previewOperatorCount
        .textContent =
            summary.hasData
                ? formatExpeditionQuantity(
                    summary.operatorCount,
                )
                : "—";

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

    elements.previewFloorVolume
        .textContent =
            quantityOrDash(
                summary.floorVolume,
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
            
    elements.previewException
        .textContent =
            summary.hasData
                ? formatExpeditionQuantity(
                    summary.exceptionOrders,
                )
                : "—";   

    setExpeditionInputValue(
        elements.floorVolumeInput,
        summary.hasData
            ? summary.floorVolume
            : null,
    );

    setExpeditionInputValue(
        elements.duplicatedInput,
        summary.duplicatedOrders,
    );

    setExpeditionInputValue(
        elements.exceptionInput,
        summary.exceptionOrders,
    );

    renderExpeditionOperators(
        elements,
        selectedOperators,
    );

    renderExpeditionRankingCards(
        elements,
        selectedOperators,
    );

    renderExpeditionOperatorControls(
        elements,
        operators,
    );

    renderExpeditionErrorTables(
        elements,
        errorAnalysis,
    );

    renderExpeditionGuardianControls(
        elements,
        errorAnalysis.streets,
    );

    elements.clearButton.disabled =
        !summary.hasData &&
        !errorAnalysis.hasErrorData;
}

/* EVENTOS */

function renderExpeditionTabNotification(
    elements,
) {
    const activeTarget =
        elements.tabs.querySelector(
            ".tabs-title.is-active > a",
        )?.getAttribute(
            "href",
        );

    if (
        EXPEDITION_ERROR_TAB_TARGETS.has(
            activeTarget,
        )
    ) {
        setReportNotification({
            reportId: "expedition",
            type: "idle",
            message:
                EXPEDITION_ERROR_IMPORT_MESSAGE,
        });

        return;
    }

    resetReportNotification(
        "expedition",
    );
}

function bindExpeditionEvents(
    elements,
) {
    const renderNotificationAfterTabChange =
        function () {
            window.setTimeout(
                function () {
                    renderExpeditionTabNotification(
                        elements,
                    );
                },
                0,
            );
        };

    if (
        typeof window.jQuery ===
        "function"
    ) {
        window.jQuery(
            elements.tabs,
        ).on(
            "change.zf.tabs",
            renderNotificationAfterTabChange,
        );
    }

    elements.tabs.addEventListener(
        "click",
        renderNotificationAfterTabChange,
    );

    function bindManualQuantityInput(
        input,
        field,
    ) {
        input.addEventListener(
            "input",
            function () {
                const normalizedValue =
                    input.value
                        .replace(
                            /\D/g,
                            "",
                        )
                        .slice(
                            0,
                            8,
                        );

                if (
                    input.value !==
                    normalizedValue
                ) {
                    input.value =
                        normalizedValue;
                }

                updateExpeditionManualQuantity(
                    field,
                    normalizedValue === ""
                        ? null
                        : Number(
                            normalizedValue,
                        ),
                );
            },
        );
    }

    bindManualQuantityInput(
        elements.floorVolumeInput,
        "floorVolume",
    );

    bindManualQuantityInput(
        elements.duplicatedInput,
        "duplicatedOrders",
    );

    bindManualQuantityInput(
        elements.exceptionInput,
        "exceptionOrders",
    );

    bindManualQuantityInput(
        elements.revertedInput,
        "revertedErrors",
    );

    elements.streetGuardianControls
        .addEventListener(
            "input",
            function (event) {
                const input =
                    event.target.closest(
                        "input[data-expedition-street]",
                    );

                if (!input) {
                    return;
                }

                const sanitizedValue =
                    input.value
                        .replace(
                            /[^\p{L}\s]/gu,
                            "",
                        )
                        .slice(
                            0,
                            22,
                        );

                if (
                    input.value !==
                    sanitizedValue
                ) {
                    input.value =
                        sanitizedValue;
                }

                updateExpeditionStreetGuardian(
                    input.dataset
                        .expeditionStreet,
                    sanitizedValue,
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

                    setReportNotification({
                        reportId: "expedition",

                        type: "info",

                        message:
                            "Relatório de expedição limpo.",
                    });
                }
            },
        );
}

/* INICIALIZAÇÃO */

function initializeExpeditionView(
    rootElement,
) {
    const elements =
        getExpeditionElements(
            rootElement,
        );

    if (
        !hasExpeditionElements(
            elements,
        ) ||
        elements.panel !==
            rootElement
    ) {
        return false;
    }

    expeditionViewElements =
        elements;

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

    renderExpeditionTabNotification(
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

function renderExpeditionView(
    state = getExpeditionState(),
) {
    if (!expeditionViewElements) {
        return false;
    }

    renderExpeditionReport(
        expeditionViewElements,
        state,
    );

    return true;
}

export {
    initializeExpeditionView,
    renderExpeditionView,
};
