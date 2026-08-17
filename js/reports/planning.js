import {
    addPlanningLh,
    getPlanningState,
    removePlanningLh,
    subscribePlanningState,
    updatePlanningLh,
} from "./state.js";

/* ELEMENTOS DA LISTA DE LHS */

let planningLhList = null;
let planningAddLhButton = null;

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

    header.append(
        title,
        removeButton,
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
                `Quantidade do LH ${position}`,
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

    mainFields.append(
        codeInput,
        quantityInput,
    );

    item.append(
        header,
        mainFields,
        originInput,
    );

    return item;
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
        field === "quantity"
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

    updatePlanningLh(
        lhId,
        field,
        input.value,
    );
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

    if (
        !planningLhList ||
        !planningAddLhButton
    ) {
        console.error(
            "Elementos da lista de LHs não foram encontrados.",
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
}

export {
    initializePlanningLhList,
};
