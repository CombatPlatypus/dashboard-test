import {
    getReceiptLinehaulState,
    getReceiptLinehaulSummary,
    subscribeReceiptLinehaulState,
    updateReceiptLinehaulField,
    updateReceiptLinehaulRecord,
    updateReceiptLinehaulSelection,
} from "./linehaul-state.js";

const MINIMUM_RECEIPT_LINEHAUL_ROWS = 9;

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

        windowInput:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulWindowInput",
            ),

        expectedInput:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulExpectedInput",
            ),

        reversesInput:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulReversesInput",
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

        previewReversesSent:
            getReceiptLinehaulElement(
                rootElement,
                "receiptLinehaulPreviewReversesSent",
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
        `Código do LH ${position}`;

    setReceiptLinehaulInputValue(
        inputs.code,
        linehaul.code,
    );

    inputs.code.disabled = false;
    inputs.code.readOnly =
        !manualEntryEnabled;
    inputs.code.title =
        linehaul.code;

    setReceiptLinehaulInputValue(
        inputs.loadedOrders,
        linehaul.loadedOrders,
    );

    inputs.loadedOrders.disabled =
        false;

    inputs.loadedOrders.readOnly =
        !manualEntryEnabled;

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
        `Código do LH ${position}`;

    inputs.code.value = "";
    inputs.code.disabled = true;

    inputs.loadedOrders.value = "";
    inputs.loadedOrders.disabled = true;

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
                inputs.code,
                linehaul.code,
            );

            setReceiptLinehaulInputValue(
                inputs.loadedOrders,
                linehaul.loadedOrders,
            );

            inputs.code.readOnly =
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
            formatReceiptLinehaulQuantity(
                linehaul?.loadedOrders,
            ),
        ),

        createReceiptLinehaulPreviewCell(
            linehaul?.origin,
        ),

        createReceiptLinehaulPreviewCell(
            linehaul?.cpt,
        ),

        createReceiptLinehaulPreviewCell(
            linehaul?.vehiclePlate,
        ),
    );

    return row;
}

function renderReceiptLinehaulPreview(
    elements,
    selectedLinehauls,
) {
    const fragment =
        document.createDocumentFragment();

    const visibleRows =
        Math.max(
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

function refreshReceiptLinehaulWindowSelect(
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
        selectElement.hasClass(
            "select2-hidden-accessible",
        )
    ) {
        selectElement.trigger(
            "change.select2",
        );
    }
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

    setReceiptLinehaulInputValue(
        elements.windowInput,
        state.window,
    );

    setReceiptLinehaulInputValue(
        elements.expectedInput,
        expectedVolume,
    );

    setReceiptLinehaulInputValue(
        elements.reversesInput,
        state.reversesSent,
    );

    elements.windowInput.disabled =
        !hasData;

    elements.expectedInput.disabled =
        !hasData;

    elements.reversesInput.disabled =
        !hasData;

    refreshReceiptLinehaulWindowSelect(
        elements.windowInput,
    );

    elements.previewWindow.textContent =
        hasData
            ? state.window
            : "—";

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

    elements.previewReversesSent
        .textContent =
            hasData
                ? formatReceiptLinehaulQuantity(
                    state.reversesSent,
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
    const handleWindowChange =
        function () {
            updateReceiptLinehaulField(
                "window",
                elements.windowInput.value,
            );
        };

    if (
        typeof window.jQuery ===
        "function"
    ) {
        window.jQuery(
            elements.windowInput,
        )
            .off(
                "change.receiptLinehaul",
            )
            .on(
                "change.receiptLinehaul",
                handleWindowChange,
            );
    } else {
        elements.windowInput.addEventListener(
            "change",
            handleWindowChange,
        );
    }

    elements.expectedInput.addEventListener(
        "input",
        function () {
            updateReceiptLinehaulField(
                "expectedVolume",
                sanitizeReceiptLinehaulInput(
                    elements.expectedInput,
                ),
            );
        },
    );

    elements.reversesInput.addEventListener(
        "input",
        function () {
            updateReceiptLinehaulField(
                "reversesSent",
                sanitizeReceiptLinehaulInput(
                    elements.reversesInput,
                ),
            );
        },
    );

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
