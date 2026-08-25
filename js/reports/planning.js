import {
    DEFAULT_PLANNING_AVERAGE_SPR,
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
    updatePlanningVehicleCount,
    resetPlanningLhs,
    resetPlanningReport,
} from "./state.js";

import {
    createReportImageBlob,
    copyReportBlob,
    downloadReportBlob,
} from "./export.js";

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
let planningPreviewCpBacklog = null;
let planningPreviewCpBulky = null;
let planningPreviewCpLhPool = null;
let planningSegregatedSection = null;    
let planningSegregatedTosSection = null;
let planningClearLhsButton = null;
let planningClearReportButton = null;
let planningPreviewCpErrors = null;
let planningPreviewCpAdded = null;
let planningPreviewCpRemoved = null;
let planningHeightResizeObserver = null;
let planningReportStatusIcon = null;
let planningReportStatusText = null;
let planningCopyReportButton = null;
let planningDownloadReportButton = null;
let planningReportExportArea = null;

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

/* RETORNA UMA QUANTIDADE DA COLLECTION POOL */

function getPlanningPoolQuantity(
    state,
    field,
) {
    const quantity =
        state.collectionPool[field];

    if (
        !Number.isFinite(
            quantity,
        )
    ) {
        return 0;
    }

    return quantity;
}

/* CALCULA A QUANTIDADE PRESENTE NOS LHS */

function getPlanningLhQuantity(
    lhs,
) {
    return lhs.reduce(
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
}

/* CALCULA O VOLUME ESTIMADO */

function calculatePlanningEstimatedVolume(
    state,
) {
    const lhQuantity =
        getPlanningLhQuantity(
            state.lhs,
        );

    const backlogPackages =
        getPlanningPoolQuantity(
            state,
            "backlogPackages",
        );

    const backlogBulky =
        getPlanningPoolQuantity(
            state,
            "backlogBulky",
        );

    return (
        lhQuantity +
        backlogPackages +
        backlogBulky
    );
}

/* CALCULA O TOTAL DE VEÍCULOS */

function getPlanningVehicleTotal(
    state,
) {
    return Object.values(
        state.vehicleCounts,
    ).reduce(
        function (
            total,
            quantity,
        ) {
            return (
                total +
                (
                    Number.isFinite(
                        quantity,
                    )
                        ? quantity
                        : 0
                )
            );
        },
        0,
    );
}

/* CALCULA O SPR MÉDIO UTILIZADO NO RELATÓRIO */

function calculatePlanningAverageSpr(
    state,
) {
    const fallbackAverageSpr =
        state.averageSpr ??
        DEFAULT_PLANNING_AVERAGE_SPR;

    const vehicleTotal =
        getPlanningVehicleTotal(
            state,
        );

    if (
        vehicleTotal <= 0
    ) {
        return fallbackAverageSpr;
    }

    const estimatedVolume =
        calculatePlanningEstimatedVolume(
            state,
        );

    if (
        estimatedVolume <= 0
    ) {
        return fallbackAverageSpr;
    }

    return Math.round(
        estimatedVolume /
        vehicleTotal,
    );
}

/* ATUALIZA A PRÉVIA DO PLANEJAMENTO */

function renderPlanningPreview(state) {
    const previewLhs =
        getPlanningPreviewLhs(
            state.lhs,
        );

    const lhQuantity =
        getPlanningLhQuantity(
            previewLhs,
        );

    const backlogPackages =
        getPlanningPoolQuantity(
            state,
            "backlogPackages",
        );

    const backlogBulky =
        getPlanningPoolQuantity(
            state,
            "backlogBulky",
        );

    const estimatedVolume =
        calculatePlanningEstimatedVolume(
            state,
        );

    const averageSpr =
        calculatePlanningAverageSpr(
            state,
        );

    planningEstimatedVolume.textContent =
        planningNumberFormatter.format(
            estimatedVolume,
        );

    planningPreviewAverageSpr.textContent =
        planningNumberFormatter.format(
            averageSpr,
        );

    planningPreviewDailyCapacity.textContent =
        planningNumberFormatter.format(
            state.dailyCapacity ?? 0,
        );

    planningPreviewCpBacklog.textContent =
        planningNumberFormatter.format(
            backlogPackages,
        );

    planningPreviewCpBulky.textContent =
        planningNumberFormatter.format(
            backlogBulky,
        );

    planningPreviewCpLhPool.textContent =
        planningNumberFormatter.format(
            lhQuantity,
        );

    planningPreviewCpAdded.textContent =
        planningNumberFormatter.format(
            state.collectionPool.added ?? 0,
        );

    planningPreviewCpRemoved.textContent =
        planningNumberFormatter.format(
            state.collectionPool.removed ?? 0,
        );

    planningPreviewCpErrors.textContent =
        planningNumberFormatter.format(
            state.collectionPool.errors ?? 0,
        );

    renderPlanningLhPreview(
        previewLhs,
    );

    renderPlanningSegregatedPreview(
        state.lhs,
    );

    renderPlanningSegregatedTosPreview(
        state.lhs,
    );
}

/* VERIFICA SE UM VALOR NUMÉRICO É VÁLIDO */

function isPlanningPositiveNumber(
    value,
) {
    return (
        Number.isFinite(
            value,
        ) &&
        value > 0
    );
}

/* VERIFICA SE UM LH POSSUI OS DADOS OBRIGATÓRIOS */

function isPlanningLhComplete(
    lh,
) {
    const hasCode =
        String(
            lh.code ?? "",
        ).trim() !== "";

    const hasOrigin =
        String(
            lh.origin ?? "",
        ).trim() !== "";

    return (
        hasCode &&
        hasOrigin
    );
}

/* VERIFICA SE O RELATÓRIO PODE SER EXPORTADO */

function canExportPlanningReport(
    state,
) {
    const hasCompleteLh =
        state.lhs.some(
            isPlanningLhComplete,
        );

    const hasAverageSpr =
        isPlanningPositiveNumber(
            calculatePlanningAverageSpr(
                state,
            ),
        );

    const hasDailyCapacity =
        isPlanningPositiveNumber(
            state.dailyCapacity,
        );

    return (
        hasCompleteLh &&
        hasAverageSpr &&
        hasDailyCapacity
    );
}

/* ATUALIZA O ESTADO DE EXPORTAÇÃO DO RELATÓRIO */

function renderPlanningReportStatus(
    state,
) {
    const canExport =
        canExportPlanningReport(
            state,
        );

    planningCopyReportButton.disabled =
        !canExport;

    planningDownloadReportButton.disabled =
        !canExport;

    planningReportStatusIcon.src =
        canExport
            ? "images/geral-icons/success-icon.svg"
            : "images/geral-icons/alert-icon.svg";

    planningReportStatusText.textContent =
        canExport
            ? "O relatório está pronto para exportação."
            : "O relatório ainda aguarda informações.";
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
                ? `O planejamento deve possuir pelo menos ${MINIMUM_PLANNING_LHS} LHs.`
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

/* ATUALIZA UMA QUANTIDADE DE VEÍCULOS */

function handlePlanningVehicleInput(
    event,
) {
    const input =
        event.target instanceof
        HTMLInputElement
            ? event.target
            : null;

    const field =
        input?.dataset
            .planningVehicleField;

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

    updatePlanningVehicleCount(
        field,
        input.value,
    );
}

/* ATUALIZA UMA QUANTIDADE DA COLLECTION POOL */

function handlePlanningPoolInput(event) {
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
        input.value,
    );
}

/* SINCRONIZA OS CONTROLES DOS INDICADORES */

function synchronizePlanningIndicatorControls(
    state,
) {
    const averageSpr =
        calculatePlanningAverageSpr(
            state,
        );

    planningGeneralControls
        .querySelectorAll(
            "[data-planning-field]",
        )
        .forEach(
            function (input) {
                const field =
                    input.dataset
                        .planningField;

                input.value =
                    field === "averageSpr"
                        ? averageSpr
                        : state[field] ?? "";
            },
        );

    planningGeneralControls
        .querySelectorAll(
            "[data-planning-vehicle-field]",
        )
        .forEach(
            function (input) {
                const field =
                    input.dataset
                        .planningVehicleField;

                input.value =
                    state
                        .vehicleCounts[field] ??
                    "";
            },
        );
}

/* SINCRONIZA OS CONTROLES DA COLLECTION POOL */

function synchronizePlanningPoolControls(
    state,
) {
    planningPoolControls
        .querySelectorAll(
            "[data-planning-pool-field]",
        )
        .forEach(
            function (input) {
                const field =
                    input.dataset
                        .planningPoolField;

                input.value =
                    state
                        .collectionPool[field] ??
                    "";
            },
        );
}

/* SINCRONIZA TODOS OS CONTROLES */

function synchronizePlanningControls(
    state,
) {
    synchronizePlanningIndicatorControls(
        state,
    );

    synchronizePlanningPoolControls(
        state,
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

/* REINICIA TODO O RELATÓRIO */

function handleResetPlanningReport() {
    const shouldReset =
        window.confirm(
            "Limpar todas as informações do relatório de planejamento?",
        );

    if (!shouldReset) {
        return;
    }

    resetPlanningReport();
}

/* CRIA O NOME DO ARQUIVO DO RELATÓRIO */

function createPlanningReportFileName() {
    const date =
        new Intl.DateTimeFormat(
            "pt-BR",
            {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            },
        )
            .format(
                new Date(),
            )
            .replace(
                /\//g,
                "-",
            );

    return (
        `planejamento-de-roteirizacao-${date}.png`
    );
}

/* COPIA O RELATÓRIO DE PLANEJAMENTO */

async function handleCopyPlanningReport() {
    const state =
        getPlanningState();

    if (
        !canExportPlanningReport(
            state,
        )
    ) {
        return;
    }

    const originalText =
        planningCopyReportButton
            .textContent;

    let copySucceeded =
        false;

    planningCopyReportButton.disabled =
        true;

    planningCopyReportButton.textContent =
        "Copiando...";

    planningCopyReportButton.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const reportBlob =
            await createReportImageBlob(
                planningReportExportArea,
            );

        await copyReportBlob(
            reportBlob,
        );

        copySucceeded =
            true;

        planningCopyReportButton.textContent =
            "Copiado!";
    } catch (error) {
        console.error(
            "Não foi possível copiar o relatório:",
            error,
        );

        window.alert(
            error instanceof Error
                ? error.message
                : "Não foi possível copiar a imagem do relatório.",
        );
    } finally {
        planningCopyReportButton.removeAttribute(
            "aria-busy",
        );

        if (copySucceeded) {
            window.setTimeout(
                function () {
                    planningCopyReportButton.textContent =
                        originalText;

                    renderPlanningReportStatus(
                        getPlanningState(),
                    );
                },
                1200,
            );
        } else {
            planningCopyReportButton.textContent =
                originalText;

            renderPlanningReportStatus(
                getPlanningState(),
            );
        }
    }
}

/* BAIXA O RELATÓRIO DE PLANEJAMENTO */

async function handleDownloadPlanningReport() {
    const state =
        getPlanningState();

    if (
        !canExportPlanningReport(
            state,
        )
    ) {
        return;
    }

    const originalText =
        planningDownloadReportButton
            .textContent;

    planningDownloadReportButton.disabled =
        true;

    planningDownloadReportButton.textContent =
        "Gerando...";

    planningDownloadReportButton.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const reportBlob =
            await createReportImageBlob(
                planningReportExportArea,
            );

        downloadReportBlob(
            reportBlob,
            createPlanningReportFileName(),
        );
    } catch (error) {
        console.error(
            "Não foi possível gerar o relatório:",
            error,
        );

        window.alert(
            "Não foi possível gerar a imagem do relatório.",
        );
    } finally {
        planningDownloadReportButton.textContent =
            originalText;

        planningDownloadReportButton.removeAttribute(
            "aria-busy",
        );

        renderPlanningReportStatus(
            getPlanningState(),
        );
    }
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

/* SINCRONIZA A ALTURA DOS CONTROLES COM A PRÉVIA */

function initializePlanningHeightSynchronization() {
    const planningControls =
        document.querySelector(
            "#planning .report-controls",
        );

    const planningSheet =
        document.querySelector(
            "#planning .planning-sheet-preview",
        );

    if (
        !planningControls ||
        !planningSheet ||
        !planningLhList
    ) {
        return;
    }

    requestAnimationFrame(
        function () {
            const basePreviewHeight =
                planningSheet
                    .getBoundingClientRect()
                    .height;

            const baseControlsHeight =
                planningControls
                    .getBoundingClientRect()
                    .height;

            const currentListHeight =
                planningLhList
                    .getBoundingClientRect()
                    .height;

            const fixedControlsHeight =
                baseControlsHeight -
                currentListHeight;

            const baseListMaxHeight =
                Math.max(
                    0,
                    basePreviewHeight -
                    fixedControlsHeight,
                );

            function synchronizePlanningHeight() {
                const currentPreviewHeight =
                    planningSheet
                        .getBoundingClientRect()
                        .height;

                const previewHeightDifference =
                    currentPreviewHeight -
                    basePreviewHeight;

                const newListMaxHeight =
                    Math.max(
                        0,
                        baseListMaxHeight +
                        previewHeightDifference,
                    );

                planningLhList.style.setProperty(
                    "--planning-lh-list-max-height",
                    `${Math.round(newListMaxHeight)}px`,
                );
            }

            planningHeightResizeObserver
                ?.disconnect();

            planningHeightResizeObserver =
                new ResizeObserver(
                    synchronizePlanningHeight,
                );

            planningHeightResizeObserver.observe(
                planningSheet,
            );

            synchronizePlanningHeight();
        },
    );
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

    planningPreviewAverageSpr =
        document.getElementById(
            "planningPreviewAverageSpr",
        );

    planningPreviewDailyCapacity =
        document.getElementById(
            "planningPreviewDailyCapacity",
        );  
        
    planningReportStatusIcon =
        document.getElementById(
            "planningReportStatusIcon",
        );

    planningReportStatusText =
        document.getElementById(
            "planningReportStatusText",
        );

    planningCopyReportButton =
        document.getElementById(
            "planningCopyReportButton",
        );

    planningDownloadReportButton =
        document.getElementById(
            "planningDownloadReportButton",
        );

    planningReportExportArea =
        document.getElementById(
            "planningReportExportArea",
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
        
    planningClearReportButton =
        document.getElementById(
            "planningClearReportButton",
        );   

    planningEstimatedVolume =
        document.getElementById(
            "planningEstimatedVolume",
        );

    planningPreviewLhBody =
        document.getElementById(
            "planningPreviewLhBody",
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
        !planningPreviewCpBacklog ||
        !planningPreviewCpBulky ||
        !planningPreviewCpLhPool ||
        !planningClearLhsButton ||
        !planningClearReportButton ||
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
        !planningPreviewDailyCapacity ||
        !planningReportExportArea ||
        !planningReportStatusIcon ||
        !planningReportStatusText ||
        !planningCopyReportButton ||
        !planningDownloadReportButton
        
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
                change.type === "lhs-reset" ||
                change.type === "planning-reset"
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
                change.type === "planning-reset" ||
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

            synchronizePlanningIndicatorControls(
                state,
            );

            if (
                change.type ===
                    "planning-reset" ||
                change.type ===
                    "collection-pool-updated"
            ) {
                synchronizePlanningPoolControls(
                    state,
                );
            }

            renderPlanningPreview(
                state,
            );

            renderPlanningReportStatus(
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

    planningClearReportButton.addEventListener(
        "click",
        handleResetPlanningReport,
    );

    planningCopyReportButton.addEventListener(
        "click",
        handleCopyPlanningReport,
    );

    planningDownloadReportButton.addEventListener(
        "click",
        handleDownloadPlanningReport,
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

    planningGeneralControls.addEventListener(
        "input",
        handlePlanningVehicleInput,
    );

    planningPoolControls.addEventListener(
        "input",
        handlePlanningPoolInput,
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

    renderPlanningReportStatus(
        state,
    );
    
    initializePlanningHeightSynchronization();
}

export {
    initializePlanningLhList,
};
