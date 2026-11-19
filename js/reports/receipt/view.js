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

import { findReceiptLabelerOps, parseReceiptLabelerDirectory } from "./labeler-lookup.js";
import { batchReportUpdates } from "../core/report-updates.js";

import {
    formatReportPersonFirstName,
    formatReportPersonWithOps,
} from "../core/person-name.js";

import {
    resetReportNotification,
    setReportNotification,
} from "../report-notifications.js";

/* CONFIGURAÇÕES */

const MINIMUM_RECEIPT_PREVIEW_ROWS = 9;

const RECEIPT_IMPORT_TAB_TARGETS =
    new Set([
        "#receipt-tables",
        "#receipt-charts",
    ]);

const RECEIPT_IMPORT_MESSAGE =
    "No SPX, acesse Entrada / Gestão de Recebimento, e exporte somente recebimento da Janela que deseja, então volte aqui e clique em importar.";

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
    return formatReportPersonFirstName(
        value,
        "",
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

        operatorControls:
            getReceiptElementById(
                rootElement,
                "receiptOperatorControls",
            ),

        labelerLookupButton:
            getReceiptElementById(
                rootElement,
                "receiptLabelerLookupButton",
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

        labelerOps:
            row.querySelector(
                '[data-receipt-operator-field="labelerOps"]',
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

function formatReceiptLabelerValue(ops, name) {
    const prefix = /^\d+$/.test(ops) ? `[ops${ops}]` : "";
    return [prefix, name.trim()].filter(Boolean).join(" ");
}

function readReceiptLabelerInputs({ labelerOps, labeler }) {
    return formatReceiptLabelerValue(labelerOps.value, labeler.value);
}

function splitReceiptLabelerValue(value) {
    const match = /^(?:\[\s*ops(\d+)\s*\]\s*|ops(\d+)$)/i.exec(value);
    const prefixLength = match?.[0].length ?? 0;
    return { ops: match?.[1] ?? match?.[2] ?? "", name: value.slice(prefixLength) };
}

function setReceiptLabelerInputs({ labelerOps, labeler }, value) {
    const { ops, name } = splitReceiptLabelerValue(value);
    setReceiptInputValue(labelerOps, ops);
    setReceiptInputValue(labeler, name);
}

function getReceiptLabelersWithoutOps() {
    return getReceiptState().operators.flatMap(({ id, labeler }) => {
        const { ops, name } = splitReceiptLabelerValue(labeler);
        return name && !ops ? [{ id, name }] : [];
    });
}

async function fillReceiptLabelerOps(button) {
    if (button.disabled) return;

    const notify = (type, message) => setReportNotification({ reportId: "receipt", type, message });
    if (getReceiptLabelersWithoutOps().length === 0) {
        notify("info", "Preencha o nome de um etiquetador com o OPS em branco.");
        return;
    }

    let text;
    button.disabled = true;
    try {
        text = await navigator.clipboard.readText();
    } catch {
        notify("error", "Não foi possível ler a área de transferência.");
        return;
    } finally {
        button.disabled = false;
    }

    const labelers = getReceiptLabelersWithoutOps();
    if (labelers.length === 0) return;

    const directory = parseReceiptLabelerDirectory(text);
    let missing = 0;
    batchReportUpdates(() => {
        for (const { id, name } of labelers) {
            const ops = findReceiptLabelerOps(name, directory);
            if (ops) updateReceiptOperator(id, "labeler", formatReceiptLabelerValue(ops, name));
            else missing += 1;
        }
    });

    if (missing > 0) {
        notify("warning", missing === 1 ? "1 Código OPS não encontrado." : `${missing} Códigos OPS não encontrados.`);
        return;
    }

    notify("success", labelers.length === 1 ? "1 Código OPS preenchido." : `${labelers.length} Códigos OPS preenchidos.`);
}

function configureReceiptErrorSelect(
    select,
    operator,
) {
    const maximum =
        Math.max(
            Number(
                operator?.packagesReceived,
            ) || 0,
            0,
        );

    const optionsChanged = select.dataset.receiptErrorMaximum !== String(maximum);
    if (optionsChanged) {
        const fragment =
            document.createDocumentFragment();

        const emptyOption =
            document.createElement(
                "option",
            );

        emptyOption.value = "";
        emptyOption.textContent = "—";
        fragment.appendChild(
            emptyOption,
        );

        for (
            let value = 0;
            value <= maximum;
            value += 1
        ) {
            const option =
                document.createElement(
                    "option",
                );

            option.value = String(value);
            option.textContent = String(value);
            fragment.appendChild(option);
        }

        select.replaceChildren(
            fragment,
        );

        select.dataset
            .receiptErrorMaximum =
                String(maximum);
    }

    const previousValue = select.value;
    setReceiptInputValue(
        select,
        operator?.errorQuantity,
    );

    if (
        (optionsChanged || previousValue !== select.value) &&
        select.classList.contains(
            "select2-hidden-accessible",
        ) &&
        typeof window.jQuery ===
            "function"
    ) {
        window.jQuery(
            select,
        ).trigger(
            "change.select2",
        );
    }
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
    const labelerContext = receiverName ? ` de ${receiverName}` : "";

    row.dataset.receiptOperatorId =
        String(
            operator.id,
        );

    inputs.title.textContent = `Etiquetador${labelerContext}`;

    setReceiptLabelerInputs(inputs, operator.labeler);
    inputs.labelerOps.disabled = false;
    inputs.labeler.disabled = false;
    inputs.labelerOps.setAttribute(
        "aria-label",
        `Código OPS do etiquetador${labelerContext}`,
    );
    inputs.labeler.setAttribute(
        "aria-label",
        `Nome do etiquetador${labelerContext}`,
    );

    configureReceiptErrorSelect(
        inputs.errorQuantity,
        operator,
    );

    inputs.errorQuantity.disabled =
        false;

    inputs.errorQuantity.setAttribute(
        "aria-label",
        `Erros do etiquetador${labelerContext}`,
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

    setReceiptLabelerInputs(inputs, "");
    inputs.labelerOps.disabled = true;
    inputs.labeler.disabled = true;
    inputs.labelerOps.setAttribute("aria-label", `Código OPS do etiquetador ${position}`);
    inputs.labeler.setAttribute(
        "aria-label",
        `Nome do etiquetador ${position}`,
    );

    configureReceiptErrorSelect(
        inputs.errorQuantity,
        null,
    );

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

            setReceiptLabelerInputs(inputs, operator.labeler);

            configureReceiptErrorSelect(
                inputs.errorQuantity,
                operator,
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

    if (
        typeof window.destroySelect2Fields ===
            "function"
    ) {
        window.destroySelect2Fields(
            elements.operatorControls,
        );
    }

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

    if (
        typeof window.initializeSelect2Fields ===
            "function"
    ) {
        window.initializeSelect2Fields(
            elements.operatorControls,
        );
    }

    receiptOperatorStructureSignature = currentSignature;
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
        formatReportPersonWithOps(
            operator?.receiver,
        ) || "—";

    const labeler =
        formatReportPersonWithOps(
            operator?.labeler,
        ) || "—";

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

    elements.errorCalculationToggle.disabled =
        disabled;

}

/* RESUMO */

function renderReceiptExpectedVolume(expectedVolume, elements = receiptViewElements) {
    elements.previewExpected.textContent = formatReceiptQuantity(expectedVolume);
}

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

    renderReceiptExpectedVolume(state.expectedVolume, elements);

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
    change,
) {
    const selectedOperators =
        state.operators.filter(
            function (operator) {
                return operator.selected !==
                    false;
            },
        );

    if (change?.type === "operator-field-updated") {
        updateReceiptOperatorField(elements, state, selectedOperators, change);
        return;
    }
    const summary =
        getReceiptSummary(
            state,
        );

    elements
        .errorCalculationToggle
        .checked =
            state
                .useTotalErrorParticipation;

    if (change?.type === "general-field-updated" && change.field === "useTotalErrorParticipation") {
        renderReceiptOperatorRates(elements, selectedOperators, summary.totalErrors, state.useTotalErrorParticipation);
        return;
    }

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

function renderReceiptOperatorRates(elements, selectedOperators, totalErrors, useParticipation, operatorId) {
    const label = useParticipation ? "Participação nos Erros" : "Taxa de Erros";
    if (elements.previewOperatorRateHeading.textContent !== label) {
        elements.previewOperatorRateHeading.textContent = label;
    }
    selectedOperators.forEach((operator, index) => {
        if (operatorId === undefined || operator.id === operatorId) {
            const cell = elements.previewOperatorBody.rows[index].cells[4];
            const value = formatReceiptErrorRate(calculateReceiptOperatorErrorMetric(operator, totalErrors, useParticipation));
            if (cell.textContent !== value) cell.textContent = value;
        }
    });
}

function updateReceiptOperatorField(elements, state, selectedOperators, { operatorId, field }) {
    const operator = state.operators.find(item => item.id === operatorId);
    const control = elements.operatorControls.querySelector(`[data-receipt-operator-id="${operatorId}"]`);
    if (!operator || !control) return;
    const inputs = getReceiptOperatorInputs(control);
    const index = selectedOperators.findIndex(item => item.id === operatorId);
    const preview = elements.previewOperatorBody.rows[index];

    if (field === "labeler") {
        // Preserve espaços e posição do cursor durante a digitação.
        if (readReceiptLabelerInputs(inputs) !== operator.labeler) {
            setReceiptLabelerInputs(inputs, operator.labeler);
        }
        if (preview) preview.cells[1].textContent = formatReportPersonWithOps(operator.labeler) || "—";
        return;
    }

    configureReceiptErrorSelect(inputs.errorQuantity, operator);
    if (!preview) return;

    const { totalErrors, receivedVolume } = getReceiptSummary(state);
    preview.cells[3].textContent = formatReceiptQuantity(operator.errorQuantity);
    elements.previewErrors.textContent = formatReceiptQuantity(totalErrors);
    elements.previewErrorRate.textContent = formatReceiptErrorRate(calculateReceiptErrorRate(totalErrors, receivedVolume));
    renderReceiptOperatorRates(elements, selectedOperators, totalErrors, state.useTotalErrorParticipation,
        state.useTotalErrorParticipation ? undefined : operatorId);
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
            "#receiptImportActionButton",
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

function handleReceiptOperatorFieldEvent(
    elements,
    event,
) {
    const input =
        event.target instanceof Element
            ? event.target.closest(
                "[data-receipt-operator-field]",
            )
            : null;

    if (
        !(
            input instanceof
                HTMLInputElement ||
            input instanceof
                HTMLSelectElement
        ) ||
        !elements.operatorControls
            .contains(input)
    ) {
        return;
    }

    const field =
        input.dataset
            .receiptOperatorField;

    const row =
        input.closest(
            "[data-receipt-operator-id]",
        );

    const operatorId =
        Number(
            row?.dataset
                .receiptOperatorId,
        );

    if (
        !Number.isInteger(
            operatorId,
        )
    ) {
        return;
    }

    if (field === "labelerOps") {
        const value = input.value;
        const digits = value.replace(/\D/g, "");
        if (value !== digits) {
            const cursor = value.slice(0, input.selectionStart).replace(/\D/g, "").length;
            input.value = digits;
            input.setSelectionRange(cursor, cursor);
        }
    }

    if (field === "labeler" || field === "labelerOps") {
        const labeler = readReceiptLabelerInputs(getReceiptOperatorInputs(row));
        updateReceiptOperator(operatorId, "labeler", labeler);
    } else if (field === "errorQuantity") {
        updateReceiptOperator(operatorId, field, input.value);
    }
}

function bindReceiptOperatorControls(
    elements,
) {
    elements.operatorControls
        .addEventListener(
            "input",
            function (event) {
                handleReceiptOperatorFieldEvent(
                    elements,
                    event,
                );
            },
        );

    if (
        typeof window.jQuery ===
            "function"
    ) {
        window.jQuery(
            elements.operatorControls,
        )
            .off(
                "change.receiptErrorSelect2",
                'select[data-receipt-operator-field="errorQuantity"]',
            )
            .on(
                "change.receiptErrorSelect2",
                'select[data-receipt-operator-field="errorQuantity"]',
                function (event) {
                    handleReceiptOperatorFieldEvent(
                        elements,
                        event,
                    );
                },
            );
    }

    elements.operatorControls
        .addEventListener(
            "change",
            function (event) {
                handleReceiptOperatorFieldEvent(
                    elements,
                    event,
                );

                const checkbox =
                    event.target instanceof
                        Element
                        ? event.target.closest(
                            "[data-receipt-operator-selection]",
                        )
                        : null;

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

function renderReceiptTabNotification(
    elements,
) {
    const activeTarget =
        elements.viewTabs.querySelector(
            ".tabs-title.is-active > a",
        )?.getAttribute(
            "href",
        );

    if (
        RECEIPT_IMPORT_TAB_TARGETS.has(
            activeTarget,
        )
    ) {
        setReportNotification({
            reportId: "receipt",
            type: "idle",
            message:
                RECEIPT_IMPORT_MESSAGE,
        });

        return;
    }

    resetReportNotification(
        "receipt",
    );
}

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

    renderReceiptTabNotification(
        elements,
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
    change,
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
        change,
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
            templateInputs.labelerOps instanceof
            HTMLInputElement
        ) ||
        !(
            templateInputs.labeler instanceof
            HTMLInputElement
        ) ||
        !(
            templateInputs.errorQuantity instanceof
            HTMLSelectElement
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

    // Clone the plain controls, without Select2 containers or instance IDs.
    if (typeof window.destroySelect2Fields === "function") {
        window.destroySelect2Fields(elements.operatorControls);
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

    elements.labelerLookupButton.addEventListener("click", () => fillReceiptLabelerOps(elements.labelerLookupButton));

    initializeReceiptControlPanels(
        elements,
    );

    elements.clearReportButton.addEventListener(
        "click",
        handleResetReceiptReport,
    );

    subscribeReceiptState(renderReceiptView);

    renderReceiptView();

    return true;
}

export {
    initializeReceiptView,
    renderReceiptExpectedVolume,
    renderReceiptView,
};
