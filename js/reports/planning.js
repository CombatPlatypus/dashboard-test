import {
    MINIMUM_PLANNING_LHS,
    MINIMUM_PLANNING_TOS_PER_LH,
    ensureMinimumPlanningLhs,
    addPlanningLh,
    addPlanningTo,
    getPlanningState,
    removePlanningLh,
    removePlanningTo,
    subscribePlanningState,
    updatePlanningCollectionPoolField,
    updatePlanningGeneralField,
    updatePlanningLh,
    updatePlanningTo,
    resetPlanningLhs,
    updatePlanningCollectionPoolSummaryField,
} from "./state.js";

/* ELEMENTOS DO PLANEJAMENTO */

let planningLhList = null;
let planningAddLhButton = null;
let planningEstimatedVolume = null;
let planningPreviewLhBody = null;
let planningPreviewSegregatedBody = null;
let planningPreviewSegregatedTosBody = null;
let planningGeneralControls = null;
let planningPoolControls = null;
let planningPreviewAverageSpr = null;
let planningPreviewDailyCapacity = null;
let planningToGroups = null;
let planningToEmpty = null;
let planningSegregatedTosTab = null;
let planningLhTabLink = null;
let planningPreviewPoolLhBody = null;
let planningPreviewCpTotal = null;
let planningPreviewCpBacklog = null;
let planningPreviewCpBulky = null;
let planningPreviewCpLhPool = null;
let planningPoolPreviewCells = new Map();
let planningPoolQuantityPreviewCells = new Map();
let planningSegregatedSection = null;    
let planningSegregatedTosSection = null;
let planningClearLhsButton = null;
let planningCpSummaryControls = null;
let planningPreviewCpErrors = null;
let planningPreviewCpAdded = null;
let planningPreviewCpRemoved = null;

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

    const segregateTosLabel =
        document.createElement(
            "label",
        );

    segregateTosLabel.className =
        "planning-lh-segregate-to-toggle";

    const segregateTosCheckbox =
        document.createElement(
            "input",
        );

    segregateTosCheckbox.type =
        "checkbox";

    segregateTosCheckbox.dataset.field =
        "segregateTos";

    segregateTosCheckbox.checked =
        lh.segregateTos;

    segregateTosCheckbox.disabled =
        !lh.segregate;

    segregateTosCheckbox.setAttribute(
        "aria-label",
        `Segregar TOs do LH ${position}`,
    );

    const segregateTosText =
        document.createElement(
            "span",
        );

    segregateTosText.textContent =
        "Segregar TO";

    segregateTosLabel.append(
        segregateTosCheckbox,
        segregateTosText,
    );

    item.append(
        header,
        mainFields,
        originInput,
        segregateTosLabel,
    );

    mainFields.append(
        codeInput,
        quantityInput,
    );

    return item;
}

/* CRIA O ELEMENTO VISUAL DE UMA TO */

function createPlanningToElement(
    to,
    position,
    canRemove,
) {
    const item =
        document.createElement(
            "div",
        );

    item.className =
        "planning-to-item";

    item.dataset.toId =
        String(to.id);

    const header =
        document.createElement(
            "div",
        );

    header.className =
        "planning-to-item-header flex-box-between";

    const title =
        document.createElement(
            "h4",
        );

    title.textContent =
        `TO ${position}`;

    const removeButton =
        document.createElement(
            "button",
        );

    removeButton.type =
        "button";

    removeButton.className =
        "button planning-to-remove";

    removeButton.dataset.action =
        "remove-to";

    removeButton.textContent =
        "Remover";

    removeButton.setAttribute(
        "aria-label",
        `Remover TO ${position}`,
    );

    removeButton.disabled =
        !canRemove;

    removeButton.title =
        canRemove
            ? "Remover TO"
            : "É necessário manter pelo menos uma TO para este LH.";

    header.append(
        title,
        removeButton,
    );

    const fields =
        document.createElement(
            "div",
        );

    fields.className =
        "flex-box-start";

    const codeInput =
        createPlanningLhInput({
            field: "code",
            value: to.code,
            placeholder: "Código da TO",
            ariaLabel:
                `Código da TO ${position}`,
        });

    const quantityInput =
        createPlanningLhInput({
            field: "quantity",
            value: to.quantity,
            placeholder: "Qtd",
            ariaLabel:
                `Quantidade da TO ${position}`,
            maxLength: 5,
        });

    quantityInput.inputMode =
        "numeric";

    quantityInput.pattern =
        "[0-9]*";

    fields.append(
        codeInput,
        quantityInput,
    );

    item.append(
        header,
        fields,
    );

    return item;
}

/* CRIA O GRUPO DE TOS DE UM LH */

function createPlanningToGroup(
    lh,
    position,
) {
    const group =
        document.createElement(
            "div",
        );

    group.className =
        "planning-to-group";

    group.dataset.lhId =
        String(lh.id);

    const header =
        document.createElement(
            "div",
        );

    header.className =
        "planning-to-group-header flex-box-between";

    const title =
        document.createElement(
            "h4",
        );

    const lhName =
        String(lh.code).trim() ||
        `LH ${position}`;

    title.textContent =
        `TOs do ${lhName}`;

    const addButton =
        document.createElement(
            "button",
        );

    addButton.type =
        "button";

    addButton.className =
        "button";

    addButton.dataset.action =
        "add-to";

    addButton.textContent =
        "Adicionar TO";

    addButton.setAttribute(
        "aria-label",
        `Adicionar TO ao ${lhName}`,
    );

    header.append(
        title,
        addButton,
    );

    const list =
        document.createElement(
            "div",
        );

    list.className =
        "planning-to-list flex-box-column";

    const canRemoveTos =
        lh.tos.length >
            MINIMUM_PLANNING_TOS_PER_LH;

    const toElements =
        lh.tos.map(
            function (to, index) {
                return createPlanningToElement(
                    to,
                    index + 1,
                    canRemoveTos,
                );
            },
        );

    list.replaceChildren(
        ...toElements,
    );

    group.append(
        header,
        list,
    );

    return group;
}

/* RENDERIZA OS GRUPOS DE TOS */

function renderPlanningToGroups(lhs) {
    const lhsWithTos =
        lhs.filter(
            function (lh) {
                return (
                    lh.segregate &&
                    lh.segregateTos
                );
            },
        );

    const hasLhsWithTos =
        lhsWithTos.length > 0;

    if (
        !hasLhsWithTos &&
        planningSegregatedTosTab.classList.contains(
            "is-active",
        )
    ) {
        planningLhTabLink.click();
    }

    planningSegregatedTosTab.hidden =
        !hasLhsWithTos;

    planningToEmpty.hidden =
        hasLhsWithTos;

    planningToGroups.hidden =
        !hasLhsWithTos;

    if (!hasLhsWithTos) {
        planningToGroups.replaceChildren();

        return;
    }

    const groups =
        lhsWithTos.map(
            function (lh) {
                const position =
                    lhs.findIndex(
                        function (currentLh) {
                            return currentLh.id === lh.id;
                        },
                    ) + 1;

                return createPlanningToGroup(
                    lh,
                    position,
                );
            },
        );

    planningToGroups.replaceChildren(
        ...groups,
    );
}

/* RETORNA OS LHS EXIBIDOS NA PRÉVIA */

function getPlanningPreviewLhs(lhs) {
    const previewLhs =
        [...lhs];

    while (
        previewLhs.length <
        MINIMUM_PLANNING_LHS
    ) {
        previewLhs.push({
            code: "",
            origin: "",
            quantity: null,
        });
    }

    return previewLhs;
}

/* VERIFICA SE A TO POSSUI INFORMAÇÕES */

function hasPlanningToInformation(to) {
    return (
        String(
            to.code,
        ).trim() !== "" ||
        to.quantity !== null
    );
}

/* CALCULA A QUANTIDADE SEGREGADA DE UM LH */

function getPlanningLhSegregatedQuantity(lh) {
    if (
        !lh.segregateTos
    ) {
        return lh.quantity;
    }

    const hasDefinedToQuantity =
        lh.tos.some(
            function (to) {
                return Number.isFinite(
                    to.quantity,
                );
            },
        );

    if (
        !hasDefinedToQuantity
    ) {
        return "?";
    }

    return lh.tos.reduce(
        function (
            total,
            to,
        ) {
            return (
                total +
                (
                    Number.isFinite(
                        to.quantity,
                    )
                        ? to.quantity
                        : 0
                )
            );
        },
        0,
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

function renderPlanningLhPreview(
    previewLhs,
) {
    const rows =
        previewLhs.map(
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

/* RENDERIZA OS MESMOS LHS NA TABELA DA POOL */

function renderPlanningPoolLhPreview(
    previewLhs,
) {
    const rows =
        previewLhs.map(
            function (lh) {
                return createPlanningPreviewRow([
                    lh.code,
                    lh.quantity,
                ]);
            },
        );

    planningPreviewPoolLhBody.replaceChildren(
        ...rows,
    );
}

/* RENDERIZA OS LHS PARA SEGREGAR */

function renderPlanningSegregatedPreview(lhs) {
    const segregatedLhs =
        lhs.filter(
            function (lh) {
                return lh.segregate;
            },
        );

    const hasSegregatedLhs =
        segregatedLhs.length > 0;

    planningSegregatedSection.hidden =
        !hasSegregatedLhs;

    if (!hasSegregatedLhs) {
        planningPreviewSegregatedBody.replaceChildren();

        return;
    }

    const rows =
        segregatedLhs.map(
            function (lh) {
                return createPlanningPreviewRow([
                    lh.code,
                    lh.origin,
                    lh.quantity,
                    getPlanningLhSegregatedQuantity(
                        lh,
                    ),
                ]);
            },
        );

    planningPreviewSegregatedBody.replaceChildren(
        ...rows,
    );
}

/* RENDERIZA AS TOS PARA SEGREGAR */

function renderPlanningSegregatedTosPreview(lhs) {
    const lhsWithSegregatedTos =
        lhs.filter(
            function (lh) {
                return (
                    lh.segregate &&
                    lh.segregateTos
                );
            },
        );

    const hasSegregatedTos =
        lhsWithSegregatedTos.length > 0;

    planningSegregatedTosSection.hidden =
        !hasSegregatedTos;

    if (!hasSegregatedTos) {
        planningPreviewSegregatedTosBody.replaceChildren();

        return;
    }

    const rows =
        lhsWithSegregatedTos.flatMap(
            function (lh) {
                return lh.tos
                    .filter(
                        hasPlanningToInformation,
                    )
                    .map(
                        function (to) {
                            return createPlanningPreviewRow([
                                to.code,
                                lh.code,
                                to.quantity,
                            ]);
                        },
                    );
            },
        );

    if (
        rows.length === 0
    ) {
        planningPreviewSegregatedTosBody.replaceChildren(
            createPlanningEmptyRow(
                3,
                "Nenhuma TO para segregar.",
            ),
        );

        return;
    }

    planningPreviewSegregatedTosBody.replaceChildren(
        ...rows,
    );
}

/* RETORNA UMA QUANTIDADE ATIVA DA COLLECTION POOL */

function getPlanningPoolQuantity(
    state,
    field,
) {
    const poolItem =
        state.collectionPool[field];

    if (
        !poolItem?.enabled ||
        !Number.isFinite(
            poolItem.quantity,
        )
    ) {
        return 0;
    }

    return poolItem.quantity;
}

/* ATUALIZA A PRÉVIA DO PLANEJAMENTO */

function renderPlanningPreview(state) {
    const previewLhs =
        getPlanningPreviewLhs(
            state.lhs,
        );

    const estimatedVolume =
        previewLhs.reduce(
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

    const backlogQuantity =
        getPlanningPoolQuantity(
            state,
            "backlog",
        );

    const bulkyQuantity =
        getPlanningPoolQuantity(
            state,
            "bulky",
        );

    planningEstimatedVolume.textContent =
        planningNumberFormatter.format(
            estimatedVolume,
        );

    planningPreviewAverageSpr.textContent =
        planningNumberFormatter.format(
            state.averageSpr ?? 0,
        );

    planningPreviewDailyCapacity.textContent =
        planningNumberFormatter.format(
            state.dailyCapacity ?? 0,
        );

    planningPoolPreviewCells.forEach(
        function (
            cell,
            field,
        ) {
            const poolItem =
                state.collectionPool[field];

            cell.textContent =
                poolItem?.enabled
                    ? "SIM"
                    : "NÃO";
        },
    );

    planningPoolQuantityPreviewCells.forEach(
        function (
            cell,
            field,
        ) {
            cell.textContent =
                planningNumberFormatter.format(
                    getPlanningPoolQuantity(
                        state,
                        field,
                    ),
                );
        },
    );

    planningPreviewCpBacklog.textContent =
        planningNumberFormatter.format(
            backlogQuantity,
        );

    planningPreviewCpBulky.textContent =
        planningNumberFormatter.format(
            bulkyQuantity,
        );

    planningPreviewCpLhPool.textContent =
        planningNumberFormatter.format(
            estimatedVolume,
        );

    planningPreviewCpTotal.textContent =
        planningNumberFormatter.format(
            estimatedVolume +
            backlogQuantity,
        );

    planningPreviewCpErrors.textContent =
        planningNumberFormatter.format(
            state.collectionPoolSummary.errors ?? 0,
        );

    planningPreviewCpAdded.textContent =
        planningNumberFormatter.format(
            state.collectionPoolSummary.added ?? 0,
        );

    planningPreviewCpRemoved.textContent =
        planningNumberFormatter.format(
            state.collectionPoolSummary.removed ?? 0,
        );


    renderPlanningLhPreview(
        previewLhs,
    );

    renderPlanningPoolLhPreview(
        previewLhs,
    );

    renderPlanningSegregatedPreview(
        state.lhs,
    );

    renderPlanningSegregatedTosPreview(
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

    const removeDisabled =
    lhs.length <= MINIMUM_PLANNING_LHS;

    planningLhList
        .querySelectorAll('[data-action="remove-lh"]')
        .forEach(function(button) {
            button.disabled = removeDisabled;

            button.title = removeDisabled
                ? "O planejamento deve possuir pelo menos três LHs."
                : "Remover LH";
        });
}

/* ATUALIZA UM CAMPO GERAL */

function handlePlanningGeneralInput(event) {
    const input =
        event.target instanceof HTMLInputElement
            ? event.target
            : null;

    const field =
        input?.dataset.planningField;

    if (
        !input ||
        !field
    ) {
        return;
    }

    input.value =
        input.value
            .replace(
                /\D/g,
                "",
            )
            .slice(
                0,
                input.maxLength,
            );

    updatePlanningGeneralField(
        field,
        input.value,
    );
}

/* ATUALIZA O STATUS DA COLLECTION POOL */

function handlePlanningPoolChange(event) {
    const input =
        event.target instanceof HTMLInputElement
            ? event.target
            : null;

    const field =
        input?.dataset.planningPoolField;

    if (
        !input ||
        !field
    ) {
        return;
    }

    updatePlanningCollectionPoolField(
        field,
        "enabled",
        input.checked,
    );

    const quantityInput =
        planningPoolControls.querySelector(
            `[data-planning-pool-quantity="${field}"]`,
        );

    if (
        quantityInput instanceof
        HTMLInputElement
    ) {
        quantityInput.disabled =
            !input.checked;
    }
}

/* ATUALIZA UMA QUANTIDADE DA COLLECTION POOL */

function handlePlanningPoolInput(event) {
    const input =
        event.target instanceof HTMLInputElement
            ? event.target
            : null;

    const field =
        input?.dataset.planningPoolQuantity;

    if (
        !input ||
        !field
    ) {
        return;
    }

    input.value =
        input.value
            .replace(
                /\D/g,
                "",
            )
            .slice(
                0,
                input.maxLength,
            );

    updatePlanningCollectionPoolField(
        field,
        "quantity",
        input.value,
    );
}

/* ATUALIZA O RESUMO DA COLLECTION POOL */

function handlePlanningCpSummaryInput(event) {
    const input =
        event.target instanceof HTMLInputElement
            ? event.target
            : null;

    const field =
        input?.dataset.planningCpSummaryField;

    if (
        !input ||
        !field
    ) {
        return;
    }

    input.value =
        input.value
            .replace(
                /\D/g,
                "",
            )
            .slice(
                0,
                input.maxLength,
            );

    updatePlanningCollectionPoolSummaryField(
        field,
        input.value,
    );
}

/* SINCRONIZA OS CONTROLES */

function synchronizePlanningControls(
    state,
) {
    planningGeneralControls
        .querySelectorAll(
            "[data-planning-field]",
        )
        .forEach(
            function (input) {
                const field =
                    input.dataset.planningField;

                input.value =
                    state[field] ?? "";
            },
        );

    planningPoolControls
        .querySelectorAll(
            "[data-planning-pool-field]",
        )
        .forEach(
            function (input) {
                const field =
                    input.dataset.planningPoolField;

                input.checked =
                    Boolean(
                        state.collectionPool[field]
                            ?.enabled,
                    );
            },
        );

    planningPoolControls
        .querySelectorAll(
            "[data-planning-pool-quantity]",
        )
        .forEach(
            function (input) {
                const field =
                    input.dataset.planningPoolQuantity;

                const poolItem =
                    state.collectionPool[field];

                input.value =
                    poolItem?.quantity ?? "";

                input.disabled =
                    !poolItem?.enabled;
            },
        );

    planningCpSummaryControls
        .querySelectorAll(
            "[data-planning-cp-summary-field]",
        )
        .forEach(
            function (input) {
                const field =
                    input.dataset.planningCpSummaryField;

                input.value =
                    state.collectionPoolSummary[field] ?? "";
            },
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

/* REINICIA A LISTA DE LHS */

function handleResetPlanningLhs() {
    const shouldReset =
        window.confirm(
            "Limpar todos os LHs e TOs informados?",
        );

    if (!shouldReset) {
        return;
    }

    resetPlanningLhs();

    planningAddLhButton.focus();
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
        const segregateTosCheckbox =
            item.querySelector(
                '[data-field="segregateTos"]',
            );

        updatePlanningLh(
            lhId,
            field,
            input.checked,
        );

        if (
            segregateTosCheckbox
        ) {
            segregateTosCheckbox.disabled =
                !input.checked;

            if (
                !input.checked
            ) {
                segregateTosCheckbox.checked =
                    false;
            }
        }

        return;
    }

    if (
        field === "segregateTos"
    ) {
        updatePlanningLh(
            lhId,
            field,
            input.checked,
        );

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

/* ATUALIZA UM CAMPO DE TO */

function handlePlanningToInput(event) {
    const input =
        event.target instanceof HTMLInputElement
            ? event.target
            : null;

    if (!input) {
        return;
    }

    const group =
        input.closest(
            ".planning-to-group",
        );

    const item =
        input.closest(
            ".planning-to-item",
        );

    const field =
        input.dataset.field;

    const lhId =
        Number(
            group?.dataset.lhId,
        );

    const toId =
        Number(
            item?.dataset.toId,
        );

    if (
        !group ||
        !item ||
        !field ||
        !Number.isInteger(lhId) ||
        !Number.isInteger(toId)
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

    updatePlanningTo(
        lhId,
        toId,
        field,
        input.value,
    );
}

/* ADICIONA OU REMOVE UMA TO */

function handlePlanningToClick(event) {
    const eventTarget =
        event.target instanceof Element
            ? event.target
            : null;

    const actionButton =
        eventTarget?.closest(
            "[data-action]",
        );

    const group =
        actionButton?.closest(
            ".planning-to-group",
        );

    const lhId =
        Number(
            group?.dataset.lhId,
        );

    if (
        !actionButton ||
        !group ||
        !Number.isInteger(lhId)
    ) {
        return;
    }

    if (
        actionButton.dataset.action ===
            "add-to"
    ) {
        const newTo =
            addPlanningTo(
                lhId,
            );

        if (!newTo) {
            return;
        }

        planningToGroups
            .querySelector(
                `[data-lh-id="${lhId}"] ` +
                `[data-to-id="${newTo.id}"] ` +
                '[data-field="code"]',
            )
            ?.focus();

        return;
    }

    if (
        actionButton.dataset.action ===
            "remove-to"
    ) {
        const item =
            actionButton.closest(
                ".planning-to-item",
            );

        const toId =
            Number(
                item?.dataset.toId,
            );

        if (
            !Number.isInteger(toId)
        ) {
            return;
        }

        removePlanningTo(
            lhId,
            toId,
        );
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
    planningGeneralControls =
        document.getElementById(
            "planningGeneralControls",
        );

    planningPoolControls =
        document.getElementById(
            "planningPoolControls",
        );

    planningCpSummaryControls =
        document.getElementById(
            "planningCpSummaryControls",
        );

    planningPreviewAverageSpr =
        document.getElementById(
            "planningPreviewAverageSpr",
        );

    planningPreviewDailyCapacity =
        document.getElementById(
            "planningPreviewDailyCapacity",
        );

    planningPoolPreviewCells =
        new Map(
            Array.from(
                document.querySelectorAll(
                    "[data-planning-pool-preview]",
                ),
            ).map(
                function (cell) {
                    return [
                        cell.dataset.planningPoolPreview,
                        cell,
                    ];
                },
            ),
        );

    planningPoolQuantityPreviewCells =
        new Map(
            Array.from(
                document.querySelectorAll(
                    "[data-planning-pool-quantity-preview]",
                ),
            ).map(
                function (cell) {
                    return [
                        cell.dataset.planningPoolQuantityPreview,
                        cell,
                    ];
                },
            ),
        );    
    
    planningLhList =
        document.getElementById(
            "planningLhList",
        );

    planningAddLhButton =
        document.getElementById(
            "planningAddLh",
        );

    planningClearLhsButton =
        document.getElementById(
            "planningClearLhs",
        );    

    planningEstimatedVolume =
        document.getElementById(
            "planningEstimatedVolume",
        );

    planningPreviewLhBody =
        document.getElementById(
            "planningPreviewLhBody",
        );

    planningPreviewPoolLhBody =
        document.getElementById(
            "planningPreviewPoolLhBody",
        );

    planningPreviewCpTotal =
        document.getElementById(
            "planningPreviewCpTotal",
        );

    planningPreviewCpBacklog =
        document.getElementById(
            "planningPreviewCpBacklog",
        );

    planningPreviewCpBulky =
        document.getElementById(
            "planningPreviewCpBulky",
        );

    planningPreviewCpLhPool =
        document.getElementById(
            "planningPreviewCpLhPool",
        );   

    planningPreviewCpErrors =
        document.getElementById(
            "planningPreviewCpErrors",
        );

    planningPreviewCpAdded =
        document.getElementById(
            "planningPreviewCpAdded",
        );

    planningPreviewCpRemoved =
        document.getElementById(
            "planningPreviewCpRemoved",
        );

    planningPreviewSegregatedBody =
        document.getElementById(
            "planningPreviewSegregatedBody",
        );

    planningPreviewSegregatedTosBody =
        document.getElementById(
            "planningPreviewSegregatedTosBody",
        );

    planningToGroups =
        document.getElementById(
            "planningToGroups",
        );

    planningToEmpty =
        document.getElementById(
            "planningToEmpty",
        );    

    planningSegregatedTosTab =
        document.getElementById(
            "planningSegregatedTosTab",
        );

    planningLhTabLink =
        document.querySelector(
            '#planning-choice a[href="#lhs-list"]',
        );

    planningSegregatedSection =
        document.getElementById(
            "planningSegregatedSection",
        );

    planningSegregatedTosSection =
        document.getElementById(
            "planningSegregatedTosSection",
        );   

    if (
        !planningLhList ||
        !planningAddLhButton ||
        !planningEstimatedVolume ||
        !planningPreviewLhBody ||
        !planningPreviewPoolLhBody ||
        !planningPreviewCpTotal ||
        !planningPreviewCpBacklog ||
        !planningPreviewCpBulky ||
        !planningPreviewCpLhPool ||
        !planningClearLhsButton ||
        !planningCpSummaryControls ||
        !planningPreviewCpErrors ||
        !planningPreviewCpAdded ||
        !planningPreviewCpRemoved ||
        !planningPreviewSegregatedBody ||
        !planningPreviewSegregatedTosBody ||
        !planningSegregatedSection ||
        !planningSegregatedTosSection ||
        !planningToGroups ||
        !planningToEmpty ||
        !planningSegregatedTosTab ||
        !planningLhTabLink ||
        !planningGeneralControls ||
        !planningPoolControls ||
        !planningPreviewAverageSpr ||
        !planningPreviewDailyCapacity
    ) {
        console.error(
            "Elementos do Planejamento não foram encontrados.",
        );

        return;
    }

    ensureMinimumPlanningLhs();

    subscribePlanningState(
        function (
            state,
            change,
        ) {
            if (
                change.type === "lh-added" ||
                change.type === "lh-removed" ||
                change.type === "lhs-replaced" ||
                change.type === "lhs-minimum-restored" ||
                change.type === "lhs-reset"
            ) {
                renderPlanningLhList(
                    state.lhs,
                );
            }

            if (
                change.type === "lh-added" ||
                change.type === "lh-removed" ||
                change.type === "lhs-replaced" ||
                change.type === "lhs-minimum-restored" ||
                change.type === "lhs-reset" ||
                change.type === "to-added" ||
                change.type === "to-removed" ||
                (
                    change.type === "lh-updated" &&
                    (
                        change.field === "code" ||
                        change.field === "segregate" ||
                        change.field === "segregateTos"
                    )
                )
            ) {
                renderPlanningToGroups(
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

    planningClearLhsButton.addEventListener(
        "click",
        handleResetPlanningLhs,
    );

    planningLhList.addEventListener(
        "input",
        handlePlanningLhInput,
    );

    planningLhList.addEventListener(
        "click",
        handlePlanningLhClick,
    );

    planningToGroups.addEventListener(
        "input",
        handlePlanningToInput,
    );

    planningToGroups.addEventListener(
        "click",
        handlePlanningToClick,
    );

    planningGeneralControls.addEventListener(
        "input",
        handlePlanningGeneralInput,
    );

    planningPoolControls.addEventListener(
        "change",
        handlePlanningPoolChange,
    );

    planningPoolControls.addEventListener(
        "input",
        handlePlanningPoolInput,
    );

    planningCpSummaryControls.addEventListener(
        "input",
        handlePlanningCpSummaryInput,
    );

    const state =
        getPlanningState();

    synchronizePlanningControls(
        state,
    );

    renderPlanningLhList(
        state.lhs,
    );

    renderPlanningToGroups(
        state.lhs,
    );

    renderPlanningPreview(
        state,
    );
}

export {
    initializePlanningLhList,
};
