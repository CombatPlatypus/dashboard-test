import {
    getReceiptState,
    getReceiptSummary,
    subscribeReceiptState,
    updateReceiptGeneralField,
    updateReceiptOperator,
} from "./receipt-state.js";

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
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        },
    );

let receiptOperatorStructureSignature =
    null;

let receiptHeightResizeObserver =
    null;

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

function getReceiptElements() {
    return {
        expectedInput:
            document.getElementById(
                "receiptExpectedInput",
            ),

        receivedInput:
            document.getElementById(
                "receiptReceivedInput",
            ),

        errorsInput:
            document.getElementById(
                "receiptErrorsInput",
            ),

        windowInput:
            document.getElementById(
                "receiptWindowInput",
            ),

        operatorControls:
            document.getElementById(
                "receiptOperatorControls",
            ),

        previewWindow:
            document.getElementById(
                "receiptPreviewWindow",
            ),

        previewExpected:
            document.getElementById(
                "receiptPreviewExpected",
            ),

        previewReceived:
            document.getElementById(
                "receiptPreviewReceived",
            ),

        previewErrors:
            document.getElementById(
                "receiptPreviewErrors",
            ),

        previewErrorRate:
            document.getElementById(
                "receiptPreviewErrorRate",
            ),

        previewOperatorBody:
            document.getElementById(
                "receiptPreviewOperatorBody",
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

    return row;
}

function createEmptyReceiptOperatorControl(
    template,
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
        "Etiquetador";

    inputs.labeler.value =
        "";

    inputs.labeler.disabled =
        true;

    inputs.errorQuantity.value =
        "";

    inputs.errorQuantity.disabled =
        true;

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

    if (
        operators.length === 0
    ) {
        fragment.appendChild(
            createEmptyReceiptOperatorControl(
                template,
            ),
        );
    } else {
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
        calculateReceiptErrorRate(
            operator?.errorQuantity,
            operator?.packagesReceived,
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
) {
    const fragment =
        document.createDocumentFragment();

    operators.forEach(
        function (operator) {
            fragment.appendChild(
                createReceiptPreviewRow(
                    operator,
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
            createReceiptPreviewRow(),
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

    elements.receivedInput.disabled =
        disabled;

    elements.errorsInput.disabled =
        disabled;

    elements.windowInput.disabled =
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

    setReceiptInputValue(
        elements.receivedInput,
        receivedVolume,
    );

    setReceiptInputValue(
        elements.errorsInput,
        totalErrors,
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
    renderReceiptSummary(
        elements,
        state,
        getReceiptSummary(),
    );

    renderReceiptOperatorControls(
        elements,
        template,
        state.operators,
    );

    renderReceiptOperatorPreview(
        elements,
        state.operators,
    );
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
}

/* SINCRONIZA A ALTURA DOS CONTROLES COM A PRÉVIA */

function initializeReceiptHeightSynchronization(
    elements,
) {
    const receiptPreview =
        document.getElementById(
            "receiptSheetPreview",
        );

    const receiptControls =
        elements.operatorControls.closest(
            ".report-controls",
        );

    if (
        !(
            receiptPreview instanceof
            HTMLElement
        ) ||
        !(
            receiptControls instanceof
            HTMLElement
        )
    ) {
        console.error(
            "Não foi possível sincronizar a altura do recebimento.",
            {
                receiptPreview,
                receiptControls,
            },
        );

        return;
    }

    function synchronizeReceiptHeight() {
        const previewRect =
            receiptPreview
                .getBoundingClientRect();

        /*
         * O painel ainda pode estar oculto
         * porque pertence a uma aba.
         */
        if (previewRect.height <= 0) {
            return;
        }

        const operatorRect =
            elements.operatorControls
                .getBoundingClientRect();

        const controlsStyle =
            window.getComputedStyle(
                receiptControls,
            );

        const bottomInset =
            (
                Number.parseFloat(
                    controlsStyle.paddingBottom,
                ) || 0
            ) +
            (
                Number.parseFloat(
                    controlsStyle.borderBottomWidth,
                ) || 0
            );

        const availableHeight =
            previewRect.bottom -
            operatorRect.top -
            bottomInset;

        const newMaxHeight =
            Math.max(
                MINIMUM_RECEIPT_OPERATOR_CONTROLS_HEIGHT,
                Math.round(
                    availableHeight,
                ),
            );

        const cssValue =
            `${newMaxHeight}px`;

        if (
            elements.operatorControls
                .style
                .getPropertyValue(
                    "--receipt-operator-controls-max-height",
                ) === cssValue
        ) {
            return;
        }

        elements.operatorControls
            .style
            .setProperty(
                "--receipt-operator-controls-max-height",
                cssValue,
            );
    }

    receiptHeightResizeObserver
        ?.disconnect();

    receiptHeightResizeObserver =
        new ResizeObserver(
            function () {
                requestAnimationFrame(
                    synchronizeReceiptHeight,
                );
            },
        );

    receiptHeightResizeObserver.observe(
        receiptPreview,
    );

    requestAnimationFrame(
        synchronizeReceiptHeight,
    );
}

/* INICIALIZAÇÃO */

function initializeReceiptReport() {
    const elements =
        getReceiptElements();

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
        )
    ) {
        return false;
    }

    const operatorTemplate =
        template.cloneNode(
            true,
        );

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

    subscribeReceiptState(
        function (state) {
            renderReceiptReport(
                elements,
                operatorTemplate,
                state,
            );
        },
    );

    renderReceiptReport(
        elements,
        operatorTemplate,
        getReceiptState(),
    );

    initializeReceiptHeightSynchronization(
        elements,
    );

    return true;
}

export {
    initializeReceiptReport,
};
