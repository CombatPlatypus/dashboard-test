import {
    addReceiptLinehaul,
    getReceiptLinehaulState,
    getReceiptLinehaulSummary,
    removeReceiptLinehaul,
    subscribeReceiptLinehaulState,
    updateReceiptLinehaulRecord,
    updateReceiptLinehaulSelection,
} from "./linehaul-state.js";

const MINIMUM_RECEIPT_LINEHAUL_ROWS = 8;

const RECEIPT_LINEHAUL_ORDINAL_NAMES = [
    "Primeiro",
    "Segundo",
    "Terceiro",
    "Quarto",
    "Quinto",
    "Sexto",
    "Sétimo",
    "Oitavo",
    "Nono",
];

const receiptLinehaulNumberFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

const receiptLinehaulPercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        },
    );

let receiptLinehaulElements = null;
let receiptLinehaulTemplate = null;
let receiptLinehaulStructureSignature =
    null;

function getReceiptLinehaulElement(
    rootElement,
    id,
) {
    return rootElement.querySelector(
        `#${id}`,
    );
}

function getReceiptLinehaulElements(
    rootElement,
) {
    return {
        controls:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulControls",
            ),

        addButton:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulAddButton",
            ),

        removeButton:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulRemoveButton",
            ),

        previewWindow:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulPreviewWindow",
            ),

        previewExpected:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulPreviewExpected",
            ),

        previewUnloadedVolume:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulPreviewUnloadedVolume",
            ),

        previewUnloadedCount:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulPreviewUnloadedCount",
            ),

        progressUnloaded:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulProgressUnloaded",
            ),

        progressExpected:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulProgressExpected",
            ),

        progressPercentage:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulProgressPercentage",
            ),

        progressBar:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulProgressBar",
            ),

        progressFill:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulProgressFill",
            ),

        previewBody:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulPreviewBody",
            ),
    };
}

function hasReceiptLinehaulElements(
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

function getReceiptLinehaulControlInputs(
    row,
) {
    return {
        title:
            row.querySelector(
                "[data-receipt-linehaul-label]",
            ),

        code:
            row.querySelector(
                '[data-receipt-linehaul-field="code"]',
            ),

        driver:
            row.querySelector(
                '[data-receipt-linehaul-field="driver"]',
            ),

        origin:
            row.querySelector(
                '[data-receipt-linehaul-field="origin"]',
            ),

        loadedOrders:
            row.querySelector(
                '[data-receipt-linehaul-field="loadedOrders"]',
            ),

        selection:
            row.querySelector(
                "[data-receipt-linehaul-selection]",
            ),

        selectionLabel:
            row.querySelector(
                ".checkbox > label",
            ),
    };
}

function setReceiptLinehaulInputValue(
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

function formatReceiptLinehaulQuantity(
    value,
) {
    return (
        value === null ||
        value === undefined
    )
        ? "—"
        : receiptLinehaulNumberFormatter
            .format(
                value,
            );
}

function getReceiptLinehaulOrdinalLabel(
    position,
) {
    return `${
        RECEIPT_LINEHAUL_ORDINAL_NAMES[
            position - 1
        ] ?? `${position}º`
    } LH`;
}

function createReceiptLinehaulControl(
    template,
    linehaul,
    position,
    manualEntryEnabled,
) {
    const row =
        template.cloneNode(
            true,
        );

    const inputs =
        getReceiptLinehaulControlInputs(
            row,
        );

    row.dataset.receiptLinehaulId =
        String(
            linehaul.id,
        );

    inputs.title.textContent =
        getReceiptLinehaulOrdinalLabel(
            position,
        );

    setReceiptLinehaulInputValue(
        inputs.driver,
        linehaul.driver,
    );

    inputs.driver.disabled = false;
    inputs.driver.readOnly =
        !manualEntryEnabled;
    inputs.driver.setAttribute(
        "aria-label",
        `Motorista do LH ${position}`,
    );

    setReceiptLinehaulInputValue(
        inputs.code,
        linehaul.code,
    );

    inputs.code.disabled = false;
    inputs.code.readOnly =
        !manualEntryEnabled;
    inputs.code.title =
        linehaul.code;
    inputs.code.setAttribute(
        "aria-label",
        `Código do LH ${position}`,
    );

    setReceiptLinehaulInputValue(
        inputs.origin,
        linehaul.origin,
    );

    inputs.origin.disabled = false;
    inputs.origin.readOnly =
        !manualEntryEnabled;
    inputs.origin.setAttribute(
        "aria-label",
        `Origem do LH ${position}`,
    );

    setReceiptLinehaulInputValue(
        inputs.loadedOrders,
        linehaul.loadedOrders,
    );

    inputs.loadedOrders.disabled =
        false;

    inputs.loadedOrders.readOnly =
        !manualEntryEnabled;
    inputs.loadedOrders.setAttribute(
        "aria-label",
        `Quantidade do LH ${position}`,
    );

    const selectionId =
        `receiptLinehaulSelection${linehaul.id}`;

    inputs.selection.id =
        selectionId;

    inputs.selection.checked =
        linehaul.selected === true;

    inputs.selection.disabled =
        false;

    inputs.selection.setAttribute(
        "aria-label",
        `Adicionar ${linehaul.code} à prévia de descarregamentos`,
    );

    inputs.selectionLabel.htmlFor =
        selectionId;

    return row;
}

function createEmptyReceiptLinehaulControl(
    template,
    position,
) {
    const row =
        template.cloneNode(
            true,
        );

    const inputs =
        getReceiptLinehaulControlInputs(
            row,
        );

    delete row.dataset
        .receiptLinehaulId;

    inputs.title.textContent =
        getReceiptLinehaulOrdinalLabel(
            position,
        );

    inputs.driver.value = "";
    inputs.driver.disabled = true;
    inputs.driver.setAttribute(
        "aria-label",
        `Motorista do LH ${position}`,
    );

    inputs.code.value = "";
    inputs.code.disabled = true;
    inputs.code.setAttribute(
        "aria-label",
        `Código do LH ${position}`,
    );

    inputs.origin.value = "";
    inputs.origin.disabled = true;
    inputs.origin.setAttribute(
        "aria-label",
        `Origem do LH ${position}`,
    );

    inputs.loadedOrders.value = "";
    inputs.loadedOrders.disabled = true;
    inputs.loadedOrders.setAttribute(
        "aria-label",
        `Quantidade do LH ${position}`,
    );

    const selectionId =
        `receiptLinehaulEmpty${position}`;

    inputs.selection.id =
        selectionId;

    inputs.selection.checked = false;
    inputs.selection.disabled = true;

    inputs.selection.setAttribute(
        "aria-label",
        `LH ${position} indisponível`,
    );

    inputs.selectionLabel.htmlFor =
        selectionId;

    return row;
}

function getReceiptLinehaulStructureSignature(
    linehauls,
    manualEntryEnabled,
) {
    return JSON.stringify(
        {
            manualEntryEnabled,
            ids:
                linehauls.map(
                    function (linehaul) {
                        return linehaul.id;
                    },
                ),
        },
    );
}

function synchronizeReceiptLinehaulControls(
    elements,
    linehauls,
    manualEntryEnabled,
) {
    linehauls.forEach(
        function (linehaul) {
            const row =
                elements.controls
                    .querySelector(
                        `[data-receipt-linehaul-id="${linehaul.id}"]`,
                    );

            if (!row) {
                return;
            }

            const inputs =
                getReceiptLinehaulControlInputs(
                    row,
                );

            setReceiptLinehaulInputValue(
                inputs.driver,
                linehaul.driver,
            );

            setReceiptLinehaulInputValue(
                inputs.code,
                linehaul.code,
            );

            setReceiptLinehaulInputValue(
                inputs.origin,
                linehaul.origin,
            );

            setReceiptLinehaulInputValue(
                inputs.loadedOrders,
                linehaul.loadedOrders,
            );

            inputs.code.readOnly =
                !manualEntryEnabled;

            inputs.driver.readOnly =
                !manualEntryEnabled;

            inputs.origin.readOnly =
                !manualEntryEnabled;

            inputs.loadedOrders.readOnly =
                !manualEntryEnabled;

            inputs.selection.checked =
                linehaul.selected === true;
        },
    );
}

function renderReceiptLinehaulControls(
    elements,
    template,
    linehauls,
    manualEntryEnabled,
) {
    const signature =
        getReceiptLinehaulStructureSignature(
            linehauls,
            manualEntryEnabled,
        );

    if (
        signature ===
        receiptLinehaulStructureSignature
    ) {
        synchronizeReceiptLinehaulControls(
            elements,
            linehauls,
            manualEntryEnabled,
        );

        return;
    }

    receiptLinehaulStructureSignature =
        signature;

    const fragment =
        document.createDocumentFragment();

    const visibleControls =
        Math.max(
            linehauls.length,
            MINIMUM_RECEIPT_LINEHAUL_ROWS,
        );

    for (
        let index = 0;
        index < visibleControls;
        index += 1
    ) {
        const linehaul =
            linehauls[index] ||
            null;

        fragment.append(
            linehaul
                ? createReceiptLinehaulControl(
                    template,
                    linehaul,
                    index + 1,
                    manualEntryEnabled,
                )
                : createEmptyReceiptLinehaulControl(
                    template,
                    index + 1,
                ),
        );
    }

    elements.controls.replaceChildren(
        fragment,
    );

    elements.removeButton.disabled =
        linehauls.length <=
            MINIMUM_RECEIPT_LINEHAUL_ROWS;
}

function createReceiptLinehaulPreviewCell(
    value,
) {
    const cell =
        document.createElement(
            "td",
        );

    cell.textContent =
        value || "—";

    return cell;
}

function createReceiptLinehaulPreviewRow(
    linehaul = null,
) {
    const row =
        document.createElement(
            "tr",
        );

    row.append(
        createReceiptLinehaulPreviewCell(
            linehaul?.code,
        ),

        createReceiptLinehaulPreviewCell(
            linehaul?.driver,
        ),

        createReceiptLinehaulPreviewCell(
            linehaul?.origin,
        ),

        createReceiptLinehaulPreviewCell(
            formatReceiptLinehaulQuantity(
                linehaul?.loadedOrders,
            ),
        ),
    );

    return row;
}

function renderReceiptLinehaulPreview(
    elements,
    selectedLinehauls,
    totalLinehauls,
) {
    const fragment =
        document.createDocumentFragment();

    const visibleRows =
        Math.max(
            totalLinehauls,
            selectedLinehauls.length,
            MINIMUM_RECEIPT_LINEHAUL_ROWS,
        );

    for (
        let index = 0;
        index < visibleRows;
        index += 1
    ) {
        fragment.append(
            createReceiptLinehaulPreviewRow(
                selectedLinehauls[index] ||
                    null,
            ),
        );
    }

    elements.previewBody.replaceChildren(
        fragment,
    );
}

function renderReceiptLinehaulSummary(
    elements,
    state,
    summary,
) {
    const hasData =
        summary.hasData;

    const expectedVolume =
        state.expectedVolume;

    const canCalculateProgress =
        hasData &&
        Number.isSafeInteger(
            expectedVolume,
        ) &&
        expectedVolume > 0;

    const progressRatio =
        canCalculateProgress
            ? summary.unloadedVolume /
                expectedVolume
            : null;

    const visiblePercentage =
        progressRatio === null
            ? 0
            : Math.max(
                0,
                Math.min(
                    progressRatio * 100,
                    100,
                ),
            );

    elements.previewWindow.textContent =
        String(
            state.window ?? "",
        ).trim() || "—";

    elements.previewExpected.textContent =
        hasData
            ? formatReceiptLinehaulQuantity(
                expectedVolume,
            )
            : "—";

    elements.previewUnloadedVolume
        .textContent =
            hasData
                ? formatReceiptLinehaulQuantity(
                    summary.unloadedVolume,
                )
                : "—";

    elements.previewUnloadedCount
        .textContent =
            hasData
                ? formatReceiptLinehaulQuantity(
                    summary.unloadedCount,
                )
                : "—";

    elements.progressUnloaded.textContent =
        hasData
            ? formatReceiptLinehaulQuantity(
                summary.unloadedVolume,
            )
            : "—";

    elements.progressExpected.textContent =
        hasData
            ? formatReceiptLinehaulQuantity(
                expectedVolume,
            )
            : "—";

    elements.progressPercentage
        .textContent =
            progressRatio === null
                ? "—"
                : receiptLinehaulPercentageFormatter
                    .format(
                        progressRatio,
                    );

    elements.progressBar.setAttribute(
        "aria-valuenow",
        String(
            Math.round(
                visiblePercentage,
            ),
        ),
    );

    elements.progressFill.style.width =
        `${visiblePercentage}%`;
}

function renderReceiptLinehaulView(
    state = getReceiptLinehaulState(),
) {
    if (
        !receiptLinehaulElements ||
        !receiptLinehaulTemplate
    ) {
        return false;
    }

    const summary =
        getReceiptLinehaulSummary(
            state,
        );

    renderReceiptLinehaulSummary(
        receiptLinehaulElements,
        state,
        summary,
    );

    renderReceiptLinehaulControls(
        receiptLinehaulElements,
        receiptLinehaulTemplate,
        state.linehauls,
        state.manualEntryEnabled ===
            true,
    );

    renderReceiptLinehaulPreview(
        receiptLinehaulElements,
        summary.selectedLinehauls,
        state.linehauls.length,
    );

    return true;
}

function sanitizeReceiptLinehaulInput(
    input,
) {
    const value =
        input.value.replace(
            /\D/g,
            "",
        );

    if (input.value !== value) {
        input.value = value;
    }

    return value;
}

function bindReceiptLinehaulInputs(
    elements,
) {
    elements.controls.addEventListener(
        "input",
        function (event) {
            const input =
                event.target.closest(
                    "[data-receipt-linehaul-field]",
                );

            if (
                !(
                    input instanceof
                    HTMLInputElement
                ) ||
                input.readOnly
            ) {
                return;
            }

            const row =
                input.closest(
                    "[data-receipt-linehaul-id]",
                );

            const linehaulId =
                Number(
                    row?.dataset
                        .receiptLinehaulId,
                );

            if (
                !Number.isInteger(
                    linehaulId,
                )
            ) {
                return;
            }

            const field =
                input.dataset
                    .receiptLinehaulField;

            const value =
                field === "loadedOrders"
                    ? sanitizeReceiptLinehaulInput(
                        input,
                    )
                    : input.value;

            updateReceiptLinehaulRecord(
                linehaulId,
                field,
                value,
            );
        },
    );

    elements.controls.addEventListener(
        "change",
        function (event) {
            const checkbox =
                event.target.closest(
                    "[data-receipt-linehaul-selection]",
                );

            if (
                !(
                    checkbox instanceof
                    HTMLInputElement
                )
            ) {
                return;
            }

            const row =
                checkbox.closest(
                    "[data-receipt-linehaul-id]",
                );

            const linehaulId =
                Number(
                    row?.dataset
                        .receiptLinehaulId,
                );

            if (
                !Number.isInteger(
                    linehaulId,
                )
            ) {
                return;
            }

            updateReceiptLinehaulSelection(
                linehaulId,
                checkbox.checked,
            );
        },
    );
}

function handleAddReceiptLinehaul() {
    const linehaul =
        addReceiptLinehaul();

    receiptLinehaulElements
        ?.controls
        .querySelector(
            `[data-receipt-linehaul-id="${linehaul.id}"]`,
        )
        ?.querySelector(
            '[data-receipt-linehaul-field="driver"]',
        )
        ?.focus();
}

function handleRemoveReceiptLinehaul() {
    const lastLinehaul =
        getReceiptLinehaulState()
            .linehauls
            .at(-1);

    if (
        !lastLinehaul ||
        receiptLinehaulElements
            ?.removeButton
            .disabled
    ) {
        return;
    }

    if (
        removeReceiptLinehaul(
            lastLinehaul.id,
        )
    ) {
        receiptLinehaulElements
            ?.addButton
            .focus();
    }
}

function initializeReceiptLinehaulView(
    rootElement =
        document.getElementById(
            "receipt",
        ),
) {
    if (
        !(rootElement instanceof HTMLElement)
    ) {
        return false;
    }

    const elements =
        getReceiptLinehaulElements(
            rootElement,
        );

    if (
        !hasReceiptLinehaulElements(
            elements,
        )
    ) {
        return false;
    }

    if (
        elements.controls.dataset
            .receiptLinehaulInitialized ===
        "true"
    ) {
        return true;
    }

    const template =
        elements.controls
            .firstElementChild;

    if (
        !(template instanceof HTMLElement)
    ) {
        return false;
    }

    const templateInputs =
        getReceiptLinehaulControlInputs(
            template,
        );

    if (
        !(
            templateInputs.title instanceof
            HTMLElement
        ) ||
        !(
            templateInputs.code instanceof
            HTMLInputElement
        ) ||
        !(
            templateInputs.driver instanceof
            HTMLInputElement
        ) ||
        !(
            templateInputs.origin instanceof
            HTMLInputElement
        ) ||
        !(
            templateInputs.loadedOrders instanceof
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

    receiptLinehaulElements =
        elements;

    receiptLinehaulTemplate =
        template.cloneNode(
            true,
        );

    elements.controls.dataset
        .receiptLinehaulInitialized =
            "true";

    bindReceiptLinehaulInputs(
        elements,
    );

    elements.addButton.addEventListener(
        "click",
        handleAddReceiptLinehaul,
    );

    elements.removeButton.addEventListener(
        "click",
        handleRemoveReceiptLinehaul,
    );

    subscribeReceiptLinehaulState(
        function (state) {
            renderReceiptLinehaulView(
                state,
            );
        },
    );

    renderReceiptLinehaulView();

    return true;
}

export {
    initializeReceiptLinehaulView,
    renderReceiptLinehaulView,
};
