import {
    getReceiptState,
    getReceiptSummary,
    resetReceiptReport,
    subscribeReceiptState,
    updateReceiptGeneralField,
    updateReceiptOperator,
    updateReceiptOperatorSelection,
} from "./state.js";

import {
    resetReceiptLinehaulState,
} from "./linehaul-state.js";

/* CONFIGURAÇÕES */

const MINIMUM_RECEIPT_PREVIEW_ROWS = 9;

const receiptNumberFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

const receiptErrorRateFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

let receiptOperatorStructureSignature =
    null;

let receiptPanel = null;
let receiptViewElements = null;
let receiptOperatorTemplate = null;

/* FORMATAÇÃO */

function sanitizeReceiptIntegerInput(
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

function formatReceiptQuantity(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    return receiptNumberFormatter.format(
        value,
    );
}

/* CALCULA UMA TAXA DE ERROS */

function calculateReceiptErrorRate(
    errorQuantity,
    receivedQuantity,
) {
    if (
        errorQuantity === null ||
        errorQuantity === undefined ||
        receivedQuantity === null ||
        receivedQuantity === undefined ||
        receivedQuantity <= 0
    ) {
        return null;
    }

    return (
        errorQuantity /
        receivedQuantity
    );
}

function calculateReceiptOperatorErrorMetric(
    operator,
    totalErrors,
    useTotalErrorParticipation,
) {
    if (!operator) {
        return null;
    }

    const denominator =
        useTotalErrorParticipation
            ? totalErrors
            : operator.packagesReceived;

    return calculateReceiptErrorRate(
        operator.errorQuantity,
        denominator,
    );
}

/* FORMATA UMA TAXA DE ERROS */

function formatReceiptErrorRate(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    return receiptErrorRateFormatter
        .format(
            value,
        );
}

/* RETORNA O PRIMEIRO NOME DO RECEBEDOR */

function getReceiptReceiverFirstName(
    value,
) {
    const receivedValue =
        String(value ?? "")
            .trim();

    if (receivedValue === "") {
        return "";
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

    return (
        name
            .trim()
            .split(/\s+/)[0] ||
        ""
    );
}

function setReceiptInputValue(
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

/* SINCRONIZA O SELECT DA JANELA COM O SELECT2 */

function refreshReceiptWindowSelect(
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

/* ELEMENTOS */

function getReceiptElementById(
    rootElement,
    id,
) {
    return rootElement.querySelector(
        `#${id}`,
    );
}

function getReceiptElements(rootElement) {
    return {

        clearReportButton:
            getReceiptElementById(
                rootElement,
                "receiptClearReportButton",
            ),

        expectedInput:
            getReceiptElementById(
                rootElement,
                "receiptExpectedInput",
            ),

        windowInput:
            getReceiptElementById(
                rootElement,
                "receiptWindowInput",
            ),

        operatorControls:
            getReceiptElementById(
                rootElement,
                "receiptOperatorControls",
            ),

        viewTabs:
            getReceiptElementById(
                rootElement,
                "receipt-view-tabs",
            ),

        controls:
            getReceiptElementById(
                rootElement,
                "receipt-controls",
            ),

        previewWindow:
            getReceiptElementById(
                rootElement,
                "receiptPreviewWindow",
            ),

        previewExpected:
            getReceiptElementById(
                rootElement,
                "receiptPreviewExpected",
            ),

        previewReceived:
            getReceiptElementById(
                rootElement,
                "receiptPreviewReceived",
            ),

        previewErrors:
            getReceiptElementById(
                rootElement,
                "receiptPreviewErrors",
            ),

        previewErrorRate:
            getReceiptElementById(
                rootElement,
                "receiptPreviewErrorRate",
            ),

        previewOperatorBody:
            getReceiptElementById(
                rootElement,
                "receiptPreviewOperatorBody",
            ),

        errorCalculationToggle:
            getReceiptElementById(
                rootElement,
                "receiptErrorCalculationToggle",
            ),

        previewOperatorRateHeading:
            getReceiptElementById(
                rootElement,
                "receiptPreviewOperatorRateHeading",
            ),

    };
}

function hasReceiptElements(
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

/* CONTROLES DOS OPERADORES */

function getReceiptOperatorInputs(
    row,
) {
    return {
        title:
            row.querySelector(
                "[data-receipt-operator-label]",
            ),

        labeler:
            row.querySelector(
                '[data-receipt-operator-field="labeler"]',
            ),

        errorQuantity:
            row.querySelector(
                '[data-receipt-operator-field="errorQuantity"]',
            ),

        selection:
            row.querySelector(
                "[data-receipt-operator-selection]",
            ),

        selectionLabel:
            row.querySelector(
                ".checkbox > label",
            ),
    };
}

function createReceiptOperatorControl(
    template,
    operator,
) {
    const row =
        template.cloneNode(
            true,
        );

    const inputs =
        getReceiptOperatorInputs(
            row,
        );

    const receiverName =
        getReceiptReceiverFirstName(
            operator.receiver,
        );

    row.dataset.receiptOperatorId =
        String(
            operator.id,
        );

    inputs.title.textContent =
        receiverName
            ? `Etiquetador de ${receiverName}`
            : "Etiquetador";

    inputs.labeler.value =
        operator.labeler;

    inputs.labeler.disabled =
        false;

    inputs.labeler.autocomplete =
        "off";

    inputs.labeler.setAttribute(
        "aria-label",
        receiverName
            ? `Etiquetador de ${receiverName}`
            : "Etiquetador",
    );

    setReceiptInputValue(
        inputs.errorQuantity,
        operator.errorQuantity,
    );

    inputs.errorQuantity.disabled =
        false;

    inputs.errorQuantity.inputMode =
        "numeric";

    inputs.errorQuantity.pattern =
        "[0-9]*";

    inputs.errorQuantity.setAttribute(
        "aria-label",
        receiverName
            ? `Erros do etiquetador de ${receiverName}`
            : "Erros do etiquetador",
    );

    const selectionId =
        `receiptReceiver${operator.id}`;

    inputs.selection.id =
        selectionId;

    inputs.selection.checked =
        operator.selected !== false;

    inputs.selection.disabled =
        false;

    inputs.selection.setAttribute(
        "aria-label",
        receiverName
            ? `Exibir ${receiverName} no relatório`
            : "Exibir recebedor no relatório",
    );

    inputs.selectionLabel.htmlFor =
        selectionId;

    return row;
}

function createEmptyReceiptOperatorControl(
    template,
    position,
) {
    const row =
        template.cloneNode(
            true,
        );

    const inputs =
        getReceiptOperatorInputs(
            row,
        );

    delete row.dataset
        .receiptOperatorId;

    inputs.title.textContent =
        `Etiquetador ${position}`;

    inputs.labeler.value =
        "";

    inputs.labeler.disabled =
        true;

    inputs.labeler.setAttribute(
        "aria-label",
        `Etiquetador ${position}`,
    );

    inputs.errorQuantity.value =
        "";

    inputs.errorQuantity.disabled =
        true;

    inputs.errorQuantity.setAttribute(
        "aria-label",
        `Erros do etiquetador ${position}`,
    );

    const selectionId =
        `receiptReceiverEmpty${position}`;

    inputs.selection.id =
        selectionId;

    inputs.selection.checked =
        false;

    inputs.selection.disabled =
        true;

    inputs.selection.setAttribute(
        "aria-label",
        `Recebedor ${position} indisponível`,
    );

    inputs.selectionLabel.htmlFor =
        selectionId;

    return row;
}

function getReceiptOperatorStructureSignature(
    operators,
) {
    return JSON.stringify(
        operators.map(
            function (operator) {
                return [
                    operator.id,
                    operator.receiver,
                ];
            },
        ),
    );
}

function synchronizeReceiptOperatorControls(
    elements,
    operators,
) {
    operators.forEach(
        function (operator) {
            const row =
                elements.operatorControls
                    .querySelector(
                        `[data-receipt-operator-id="${operator.id}"]`,
                    );

            if (!row) {
                return;
            }

            const inputs =
                getReceiptOperatorInputs(
                    row,
                );

            setReceiptInputValue(
                inputs.labeler,
                operator.labeler,
            );

            setReceiptInputValue(
                inputs.errorQuantity,
                operator.errorQuantity,
            );

            inputs.selection.checked =
                operator.selected !== false;
        },
    );
}

function renderReceiptOperatorControls(
    elements,
    template,
    operators,
) {
    const currentSignature =
        getReceiptOperatorStructureSignature(
            operators,
        );

    if (
        currentSignature ===
        receiptOperatorStructureSignature
    ) {
        synchronizeReceiptOperatorControls(
            elements,
            operators,
        );

        return;
    }

    receiptOperatorStructureSignature =
        currentSignature;

    const fragment =
        document.createDocumentFragment();

    operators.forEach(
        function (operator) {
            fragment.appendChild(
                createReceiptOperatorControl(
                    template,
                    operator,
                ),
            );
        },
    );

    const emptyControls =
        Math.max(
            MINIMUM_RECEIPT_PREVIEW_ROWS -
                operators.length,
            0,
        );

    for (
        let index = 0;
        index < emptyControls;
        index += 1
    ) {
        const position =
            operators.length +
            index +
            1;

        fragment.appendChild(
            createEmptyReceiptOperatorControl(
                template,
                position,
            ),
        );
    }

    elements.operatorControls
        .replaceChildren(
            fragment,
        );
}

/* PRÉVIA DOS OPERADORES */

function createReceiptPreviewCell(
    value,
) {
    const cell =
        document.createElement(
            "td",
        );

    cell.textContent =
        value;

    return cell;
}

function createReceiptPreviewRow(
    operator = null,
    totalErrors = null,
    useTotalErrorParticipation = false,
) {
    const row =
        document.createElement(
            "tr",
        );

    const receiver =
        getReceiptReceiverFirstName(
            operator?.receiver,
        ) ||
        "—";

    const labeler =
        operator?.labeler?.trim() ||
        "—";

    const packagesReceived =
        formatReceiptQuantity(
            operator?.packagesReceived,
        );

    const errorQuantity =
        formatReceiptQuantity(
            operator?.errorQuantity,
        );

    const errorRate =
        calculateReceiptOperatorErrorMetric(
            operator,
            totalErrors,
            useTotalErrorParticipation,
        );

    row.append(
        createReceiptPreviewCell(
            receiver,
        ),

        createReceiptPreviewCell(
            labeler,
        ),

        createReceiptPreviewCell(
            packagesReceived,
        ),

        createReceiptPreviewCell(
            errorQuantity,
        ),

        createReceiptPreviewCell(
            formatReceiptErrorRate(
                errorRate,
            ),
        ),
    );

    return row;
}

function renderReceiptOperatorPreview(
    elements,
    operators,
    totalErrors,
    useTotalErrorParticipation,
) {

    elements
        .previewOperatorRateHeading
        .textContent =
            useTotalErrorParticipation
                ? "Participação nos Erros"
                : "Taxa de Erros";

    const fragment =
        document.createDocumentFragment();

    operators.forEach(
        function (operator) {
            fragment.appendChild(
                createReceiptPreviewRow(
                    operator,
                    totalErrors,
                    useTotalErrorParticipation,
                ),
            );
        },
    );

    const emptyRows =
        Math.max(
            MINIMUM_RECEIPT_PREVIEW_ROWS -
                operators.length,
            0,
        );

    for (
        let index = 0;
        index < emptyRows;
        index += 1
    ) {
        fragment.appendChild(
            createReceiptPreviewRow(
                null,
                totalErrors,
                useTotalErrorParticipation,
            ),
        );
    }

    elements.previewOperatorBody
        .replaceChildren(
            fragment,
        );
}

/* ATIVA OU DESATIVA OS CONTROLES GERAIS */

function setReceiptGeneralControlsAvailability(
    elements,
    hasImportedFile,
) {
    const disabled =
        !hasImportedFile;

    elements.expectedInput.disabled =
        disabled;

    elements.windowInput.disabled =
        disabled;

    elements.errorCalculationToggle.disabled =
        disabled;

    elements.clearReportButton.disabled =
        disabled;   
}

/* RESUMO */

function renderReceiptSummary(
    elements,
    state,
    summary,
) {
    const hasOperators =
        state.operators.length > 0;

    setReceiptGeneralControlsAvailability(
        elements,
        hasOperators,
    );

    const receivedVolume =
        hasOperators
            ? summary.receivedVolume
            : null;

    const totalErrors =
        hasOperators
            ? summary.totalErrors
            : null;

    const totalErrorRate =
        calculateReceiptErrorRate(
            totalErrors,
            receivedVolume,
        );

    setReceiptInputValue(
        elements.windowInput,
        state.window,
    );

    refreshReceiptWindowSelect(
        elements.windowInput,
    );

    setReceiptInputValue(
        elements.expectedInput,
        state.expectedVolume,
    );

    elements.previewWindow.textContent =
        state.window.trim() ||
        "—";

    elements.previewExpected.textContent =
        formatReceiptQuantity(
            state.expectedVolume,
        );

    elements.previewReceived.textContent =
        formatReceiptQuantity(
            receivedVolume,
        );

    elements.previewErrors.textContent =
        formatReceiptQuantity(
            totalErrors,
        );

    elements.previewErrorRate.textContent =
        formatReceiptErrorRate(
            totalErrorRate,
        );
}

function renderReceiptReport(
    elements,
    template,
    state,
) {
    const selectedOperators =
        state.operators.filter(
            function (operator) {
                return operator.selected !==
                    false;
            },
        );

    const summary =
        getReceiptSummary(
            state,
        );

    elements
        .errorCalculationToggle
        .checked =
            state
                .useTotalErrorParticipation;

    renderReceiptSummary(
        elements,
        state,
        summary,
    );

    renderReceiptOperatorControls(
        elements,
        template,
        state.operators,
    );

    renderReceiptOperatorPreview(
        elements,
        selectedOperators,
        summary.totalErrors,
        state
            .useTotalErrorParticipation,
    );
}

/* LIMPA TODO O RELATÓRIO */

function handleResetReceiptReport() {
    const shouldReset =
        window.confirm(
            "Limpar todas as informações do relatório de recebimento?",
        );

    if (!shouldReset) {
        return;
    }

    resetReceiptReport();
    resetReceiptLinehaulState();

    const mainTabLink =
        receiptPanel?.querySelector(
            '#receipt-view-tabs a[href="#receipt-tables"]',
        );

    if (
        mainTabLink instanceof
        HTMLAnchorElement
    ) {
        mainTabLink.click();
    }

    const importButton =
        receiptPanel?.querySelector(
            "#receiptImportButton",
        );

    if (
        importButton instanceof
        HTMLButtonElement
    ) {
        importButton.focus();
    }
}

/* EVENTOS */

function bindReceiptGeneralInputs(
    elements,
) {
    elements.expectedInput.addEventListener(
        "input",
        function () {
            const sanitizedValue =
                sanitizeReceiptIntegerInput(
                    elements.expectedInput,
                );

            updateReceiptGeneralField(
                "expectedVolume",
                sanitizedValue,
            );
        },
    );

    const handleWindowChange =
        function () {
            updateReceiptGeneralField(
                "window",
                elements.windowInput.value,
            );
        };

    /*
     * O Select2 dispara o evento change
     * por meio do jQuery.
     */

    if (
        typeof window.jQuery ===
        "function"
    ) {
        window.jQuery(
            elements.windowInput,
        )
            .off(
                "change.receiptReport",
            )
            .on(
                "change.receiptReport",
                handleWindowChange,
            );
    } else {
        elements.windowInput
            .addEventListener(
                "change",
                handleWindowChange,
            );
    }

    elements.errorCalculationToggle
        .addEventListener(
            "change",
            function () {
                updateReceiptGeneralField(
                    "useTotalErrorParticipation",
                    elements
                        .errorCalculationToggle
                        .checked,
                );
            },
        );
}

function bindReceiptOperatorControls(
    elements,
) {
    elements.operatorControls
        .addEventListener(
            "input",
            function (event) {
                const input =
                    event.target.closest(
                        "[data-receipt-operator-field]",
                    );

                if (
                    !(
                        input instanceof
                        HTMLInputElement
                    ) ||
                    !elements.operatorControls
                        .contains(
                            input,
                        )
                ) {
                    return;
                }

                const field =
                    input.dataset
                        .receiptOperatorField;

                if (
                    field !==
                        "labeler" &&
                    field !==
                        "errorQuantity"
                ) {
                    return;
                }

                const row =
                    input.closest(
                        "[data-receipt-operator-id]",
                    );

                if (!row) {
                    return;
                }

                const operatorId =
                    Number(
                        row.dataset
                            .receiptOperatorId,
                    );

                if (
                    !Number.isInteger(
                        operatorId,
                    )
                ) {
                    return;
                }

                const value =
                    field ===
                    "errorQuantity"
                        ? sanitizeReceiptIntegerInput(
                            input,
                        )
                        : input.value;

                updateReceiptOperator(
                    operatorId,
                    field,
                    value,
                );
            },
        );

    elements.operatorControls
        .addEventListener(
            "change",
            function (event) {
                const checkbox =
                    event.target.closest(
                        "[data-receipt-operator-selection]",
                    );

                if (
                    !(
                        checkbox instanceof
                        HTMLInputElement
                    ) ||
                    !elements.operatorControls
                        .contains(
                            checkbox,
                        )
                ) {
                    return;
                }

                const row =
                    checkbox.closest(
                        "[data-receipt-operator-id]",
                    );

                if (!row) {
                    return;
                }

                const operatorId =
                    Number(
                        row.dataset
                            .receiptOperatorId,
                    );

                if (
                    !Number.isInteger(
                        operatorId,
                    )
                ) {
                    return;
                }

                updateReceiptOperatorSelection(
                    operatorId,
                    checkbox.checked,
                );
            },
        );
}

/* SINCRONIZA AS ABAS COM OS PAINÉIS DE CONTROLE */

function synchronizeReceiptControlPanel(
    elements,
) {
    const activeLink =
        elements.viewTabs.querySelector(
            ".tabs-title.is-active > a[data-controls-target]",
        );

    const controlsTarget =
        activeLink?.dataset
            .controlsTarget || "";

    elements.controls
        .querySelectorAll(
            ".receipt-controls-panel",
        )
        .forEach(
            function (panel) {
                const isActive =
                    panel.id ===
                    controlsTarget;

                panel.classList.toggle(
                    "is-active",
                    isActive,
                );

                panel.hidden =
                    !isActive;
            },
        );
}

function initializeReceiptControlPanels(
    elements,
) {
    if (
        elements.viewTabs.dataset
            .receiptControlsInitialized ===
        "true"
    ) {
        synchronizeReceiptControlPanel(
            elements,
        );

        return;
    }

    elements.viewTabs.dataset
        .receiptControlsInitialized =
            "true";

    if (
        typeof window.jQuery ===
        "function"
    ) {
        window.jQuery(
            elements.viewTabs,
        ).on(
            "change.zf.tabs",
            function () {
                synchronizeReceiptControlPanel(
                    elements,
                );
            },
        );
    } else {
        elements.viewTabs.addEventListener(
            "click",
            function () {
                window.requestAnimationFrame(
                    function () {
                        synchronizeReceiptControlPanel(
                            elements,
                        );
                    },
                );
            },
        );
    }

    synchronizeReceiptControlPanel(
        elements,
    );
}


/* INICIALIZAÇÃO */

function renderReceiptView(
    state = getReceiptState(),
) {
    if (
        !receiptViewElements ||
        !receiptOperatorTemplate
    ) {
        return false;
    }

    renderReceiptReport(
        receiptViewElements,
        receiptOperatorTemplate,
        state,
    );

    return true;
}

function initializeReceiptView(
    rootElement =
        document.getElementById(
            "receipt",
        ),
) {
    receiptPanel =
        rootElement instanceof HTMLElement
            ? rootElement
            : null;

    if (!receiptPanel) {
        return false;
    }

    const elements =
        getReceiptElements(
            receiptPanel,
        );

    if (
        !hasReceiptElements(
            elements,
        )
    ) {
        return false;
    }

    if (
        elements.operatorControls
            .dataset
            .receiptInitialized ===
        "true"
    ) {
        return true;
    }

    const template =
        elements.operatorControls
            .firstElementChild;

    if (
        !(
            template instanceof
            HTMLElement
        )
    ) {
        return false;
    }

    const templateInputs =
        getReceiptOperatorInputs(
            template,
        );

    if (
        !(
            templateInputs.title instanceof
            HTMLElement
        ) ||
        !(
            templateInputs.labeler instanceof
            HTMLInputElement
        ) ||
        !(
            templateInputs.errorQuantity instanceof
            HTMLInputElement
        ) ||
        !(
            templateInputs.selection instanceof
            HTMLInputElement
        ) ||
        !(
            templateInputs.selectionLabel instanceof
            HTMLLabelElement
        )
    ) {
        return false;
    }

    const operatorTemplate =
        template.cloneNode(
            true,
        );

    receiptViewElements =
        elements;

    receiptOperatorTemplate =
        operatorTemplate;

    elements.operatorControls
        .dataset
        .receiptInitialized =
            "true";

    bindReceiptGeneralInputs(
        elements,
    );

    bindReceiptOperatorControls(
        elements,
    );

    initializeReceiptControlPanels(
        elements,
    );

    elements.clearReportButton.addEventListener(
        "click",
        handleResetReceiptReport,
    );

    subscribeReceiptState(
        function (state) {
            renderReceiptView(
                state,
            );
        },
    );

    renderReceiptView();

    return true;
}

export {
    initializeReceiptView,
    renderReceiptView,
};
