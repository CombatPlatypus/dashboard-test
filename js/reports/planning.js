import {
    addPlanningLh,
    getPlanningState,
    removePlanningLh,
    subscribePlanningState,
    updatePlanningLh,
} from "./state.js";

/* ELEMENTOS DO PLANEJAMENTO */

let planningLhList = null;
let planningAddLhButton = null;
let planningEstimatedVolume = null;
let planningPreviewLhBody = null;
let planningPreviewSegregatedBody = null;

/* FORMATAÇÃO NUMÉRICA */

const planningNumberFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

/* CRIA UM INPUT DE LH */

function createPlanningLhInput({
    type = "text",
    field,
    value = "",
    placeholder,
    ariaLabel,
    maxLength = 30,
}) {
    const input =
        document.createElement(
            "input",
        );

    input.type = type;
    input.dataset.field = field;
    input.value = value ?? "";
    input.placeholder = placeholder;
    input.setAttribute(
        "aria-label",
        ariaLabel,
    );

    if (
        maxLength !== null
    ) {
        input.maxLength =
            maxLength;
    }

    input.autocomplete =
        "off";

    return input;
}

/* CRIA O ELEMENTO VISUAL DE UM LH */

function createPlanningLhElement(
    lh,
    position,
) {
    const item =
        document.createElement(
            "div",
        );

    item.className =
        "input-group planning-lh-item";

    item.dataset.lhId =
        String(lh.id);

    const header =
        document.createElement(
            "div",
        );

    header.className =
        "planning-lh-item-header flex-box-between";

    const title =
        document.createElement(
            "h4",
        );

    title.textContent =
        `LH ${position}`;

    const headerActions =
        document.createElement(
            "div",
        );

    headerActions.className =
        "planning-lh-item-actions flex-box-end";

    const segregateLabel =
        document.createElement(
            "label",
        );

    segregateLabel.className =
        "planning-lh-segregate-toggle";

    const segregateCheckbox =
        document.createElement(
            "input",
        );

    segregateCheckbox.type =
        "checkbox";

    segregateCheckbox.dataset.field =
        "segregate";

    segregateCheckbox.checked =
        lh.segregate;

    segregateCheckbox.setAttribute(
        "aria-label",
        `Segregar LH ${position}`,
    );

    const segregateText =
        document.createElement(
            "span",
        );

    segregateText.textContent =
        "Segregar";

    segregateLabel.append(
        segregateCheckbox,
        segregateText,
    );

    const removeButton =
        document.createElement(
            "button",
        );

    removeButton.type =
        "button";

    removeButton.className =
        "button planning-lh-remove";

    removeButton.dataset.action =
        "remove-lh";

    removeButton.textContent =
        "Remover";

    removeButton.setAttribute(
        "aria-label",
        `Remover LH ${position}`,
    );

    headerActions.append(
        segregateLabel,
        removeButton,
    );

    header.append(
        title,
        headerActions,
    );

    const mainFields =
        document.createElement(
            "div",
        );

    mainFields.className =
        "flex-box-start";

    const codeInput =
        createPlanningLhInput({
            field: "code",
            value: lh.code,
            placeholder: "Código do LH",
            ariaLabel:
                `Código do LH ${position}`,
        });

    const quantityInput =
        createPlanningLhInput({
            field: "quantity",
            value: lh.quantity,
            placeholder: "Qtd",
            ariaLabel:
                `Quantidade total do LH ${position}`,
            maxLength: 5,
        });

    quantityInput.inputMode =
        "numeric";

    quantityInput.pattern =
        "[0-9]*";

    const originInput =
        createPlanningLhInput({
            field: "origin",
            value: lh.origin,
            placeholder: "Origem do LH",
            ariaLabel:
                `Origem do LH ${position}`,
        });

    const segregateQuantityInput =
        createPlanningLhInput({
            field: "segregateQuantity",
            value: lh.segregateQuantity,
            placeholder: "Qtd a segregar",
            ariaLabel:
                `Quantidade a segregar do LH ${position}`,
            maxLength: 5,
        });

    segregateQuantityInput.className =
        "planning-lh-segregate-quantity";

    segregateQuantityInput.inputMode =
        "numeric";

    segregateQuantityInput.pattern =
        "[0-9]*";

    segregateQuantityInput.disabled =
        !lh.segregate;

    item.append(
        header,
        mainFields,
        originInput,
        segregateQuantityInput,
    );

    mainFields.append(
        codeInput,
        quantityInput,
    );

    return item;
}

/* VERIFICA SE O LH POSSUI INFORMAÇÕES */

function hasPlanningLhInformation(lh) {
    return (
        String(
            lh.code,
        ).trim() !== "" ||
        String(
            lh.origin,
        ).trim() !== "" ||
        lh.quantity !== null
    );
}

/* FORMATA UM VALOR DA PRÉVIA */

function formatPlanningPreviewValue(
    value,
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    if (
        typeof value === "number"
    ) {
        return planningNumberFormatter.format(
            value,
        );
    }

    return String(value);
}

/* CRIA UMA LINHA DA PRÉVIA */

function createPlanningPreviewRow(
    values,
) {
    const row =
        document.createElement(
            "tr",
        );

    values.forEach(
        function (value) {
            const cell =
                document.createElement(
                    "td",
                );

            cell.textContent =
                formatPlanningPreviewValue(
                    value,
                );

            row.append(
                cell,
            );
        },
    );

    return row;
}

/* CRIA UMA LINHA VAZIA */

function createPlanningEmptyRow(
    columnCount,
    message,
) {
    const row =
        document.createElement(
            "tr",
        );

    row.className =
        "planning-empty-row";

    const cell =
        document.createElement(
            "td",
        );

    cell.colSpan =
        columnCount;

    cell.textContent =
        message;

    row.append(
        cell,
    );

    return row;
}

/* RENDERIZA A TABELA PRINCIPAL DE LHS */

function renderPlanningLhPreview(lhs) {
    const filledLhs =
        lhs.filter(
            hasPlanningLhInformation,
        );

    if (
        filledLhs.length === 0
    ) {
        planningPreviewLhBody.replaceChildren(
            createPlanningEmptyRow(
                3,
                "Nenhum LH informado.",
            ),
        );

        return;
    }

    const rows =
        filledLhs.map(
            function (lh) {
                return createPlanningPreviewRow([
                    lh.code,
                    lh.origin,
                    lh.quantity,
                ]);
            },
        );

    planningPreviewLhBody.replaceChildren(
        ...rows,
    );
}

/* RENDERIZA OS LHS PARA SEGREGAR */

function renderPlanningSegregatedPreview(
    lhs,
) {
    const segregatedLhs =
        lhs.filter(
            function (lh) {
                return (
                    lh.segregate &&
                    hasPlanningLhInformation(
                        lh,
                    )
                );
            },
        );

    if (
        segregatedLhs.length === 0
    ) {
        planningPreviewSegregatedBody.replaceChildren(
            createPlanningEmptyRow(
                4,
                "Nenhum LH para segregar.",
            ),
        );

        return;
    }

    const rows =
        segregatedLhs.map(
            function (lh) {
                return createPlanningPreviewRow([
                    lh.code,
                    lh.origin,
                    lh.quantity,
                    lh.segregateQuantity,
                ]);
            },
        );

    planningPreviewSegregatedBody.replaceChildren(
        ...rows,
    );
}

/* ATUALIZA A PRÉVIA DO PLANEJAMENTO */

function renderPlanningPreview(state) {
    const estimatedVolume =
        state.lhs.reduce(
            function (
                total,
                lh,
            ) {
                return (
                    total +
                    (
                        Number.isFinite(
                            lh.quantity,
                        )
                            ? lh.quantity
                            : 0
                    )
                );
            },
            0,
        );

    planningEstimatedVolume.textContent =
        planningNumberFormatter.format(
            estimatedVolume,
        );

    renderPlanningLhPreview(
        state.lhs,
    );

    renderPlanningSegregatedPreview(
        state.lhs,
    );
}

/* RENDERIZA A LISTA DE LHS */

function renderPlanningLhList(lhs) {
    const lhElements =
        lhs.map(
            function (lh, index) {
                return createPlanningLhElement(
                    lh,
                    index + 1,
                );
            },
        );

    planningLhList.replaceChildren(
        ...lhElements,
    );
}

/* ADICIONA UM NOVO LH */

function handleAddPlanningLh() {
    const newLh =
        addPlanningLh();

    const newLhElement =
        planningLhList.querySelector(
            `[data-lh-id="${newLh.id}"]`,
        );

    newLhElement
        ?.querySelector(
            '[data-field="code"]',
        )
        ?.focus();
}

/* ATUALIZA UM CAMPO DE LH */

function handlePlanningLhInput(event) {
    const input =
        event.target instanceof HTMLInputElement
            ? event.target
            : null;

    if (!input) {
        return;
    }

    const item =
        input.closest(
            ".planning-lh-item",
        );

    const field =
        input.dataset.field;

    const lhId =
        Number(
            item?.dataset.lhId,
        );

    if (
        !item ||
        !field ||
        !Number.isInteger(lhId)
    ) {
        return;
    }

    if (
        field === "segregate"
    ) {
        const segregateQuantityInput =
            item.querySelector(
                '[data-field="segregateQuantity"]',
            );

        updatePlanningLh(
            lhId,
            field,
            input.checked,
        );

        if (
            segregateQuantityInput
        ) {
            segregateQuantityInput.disabled =
                !input.checked;

            if (
                !input.checked
            ) {
                segregateQuantityInput.value =
                    "";
            } else {
                segregateQuantityInput.focus();
            }
        }

        return;
    }

    if (
        field === "quantity" ||
        field === "segregateQuantity"
    ) {
        input.value =
            input.value
                .replace(
                    /\D/g,
                    "",
                )
                .slice(
                    0,
                    5,
                );
    }

    if (
        field === "segregateQuantity"
    ) {
        const totalQuantityInput =
            item.querySelector(
                '[data-field="quantity"]',
            );

        if (
            input.value !== "" &&
            totalQuantityInput?.value !== "" &&
            Number(input.value) >
                Number(
                    totalQuantityInput.value,
                )
        ) {
            input.value =
                totalQuantityInput.value;
        }
    }

    updatePlanningLh(
        lhId,
        field,
        input.value,
    );

    if (
        field === "quantity"
    ) {
        const segregateQuantityInput =
            item.querySelector(
                '[data-field="segregateQuantity"]',
            );

        if (
            segregateQuantityInput?.value !== "" &&
            (
                input.value === "" ||
                Number(
                    segregateQuantityInput.value,
                ) >
                    Number(
                        input.value,
                    )
            )
        ) {
            segregateQuantityInput.value =
                input.value;

            updatePlanningLh(
                lhId,
                "segregateQuantity",
                segregateQuantityInput.value,
            );
        }
    }
}
/* REMOVE UM LH */

function handlePlanningLhClick(event) {
    const eventTarget =
        event.target instanceof Element
            ? event.target
            : null;

    const removeButton =
        eventTarget?.closest(
            '[data-action="remove-lh"]',
        );

    if (!removeButton) {
        return;
    }

    const item =
        removeButton.closest(
            ".planning-lh-item",
        );

    const lhId =
        Number(
            item?.dataset.lhId,
        );

    if (
        !Number.isInteger(lhId)
    ) {
        return;
    }

    removePlanningLh(
        lhId,
    );

    planningAddLhButton.focus();
}

/* INICIALIZA A LISTA DE LHS */

function initializePlanningLhList() {
    planningLhList =
        document.getElementById(
            "planningLhList",
        );

    planningAddLhButton =
        document.getElementById(
            "planningAddLh",
        );

    planningEstimatedVolume =
        document.getElementById(
            "planningEstimatedVolume",
        );

    planningPreviewLhBody =
        document.getElementById(
            "planningPreviewLhBody",
        );

    planningPreviewSegregatedBody =
        document.getElementById(
            "planningPreviewSegregatedBody",
        );

    if (
        !planningLhList ||
        !planningAddLhButton ||
        !planningEstimatedVolume ||
        !planningPreviewLhBody ||
        !planningPreviewSegregatedBody
    ) {
        console.error(
            "Elementos do Planejamento não foram encontrados.",
        );

        return;
    }

    subscribePlanningState(
        function (
            state,
            change,
        ) {
            if (
                change.type !==
                "lh-updated"
            ) {
                renderPlanningLhList(
                    state.lhs,
                );
            }

            renderPlanningPreview(
                state,
            );
        },
    );

    planningAddLhButton.addEventListener(
        "click",
        handleAddPlanningLh,
    );

    planningLhList.addEventListener(
        "input",
        handlePlanningLhInput,
    );

    planningLhList.addEventListener(
        "click",
        handlePlanningLhClick,
    );

    const state =
        getPlanningState();

    if (
        state.lhs.length === 0
    ) {
        addPlanningLh();

        return;
    }

    renderPlanningLhList(
        state.lhs,
    );

    renderPlanningPreview(
        state,
    );
}

export {
    initializePlanningLhList,
};
