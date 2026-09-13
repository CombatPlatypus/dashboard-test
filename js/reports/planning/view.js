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
    updatePlanningVehicleCount,
    resetPlanningLhs,
    resetPlanningReport,
} from "./state.js";

import {
    calculatePlanningAverageSpr,
    calculatePlanningEstimatedVolume,
    canExportPlanningReport,
    getPlanningLhQuantity,
    getPlanningLhSegregatedQuantity,
    getPlanningPoolQuantity,
    getPlanningPreviewLhs,
    hasPlanningToInformation,
} from "./calculations.js";

import {
    createReportImageBlob,
    copyReportBlob,
    downloadReportBlob,
} from "../export.js";

import {
    setReportNotification,
} from "../report-notifications.js";

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
let planningCopyReportButton = null;
let planningDownloadReportButton = null;
let planningReportExportArea = null;
let planningPanel = null;
let planningNotificationObserver = null;
let planningReportHasActivity = false;

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

    headerActions.append(
        segregateLabel,
    );

    if (
        position >
        MINIMUM_PLANNING_LHS
    ) {
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
            removeButton,
        );
    }

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

    segregateTosLabel.hidden =
        !lh.segregate;

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

    if (
        !planningPanel.classList.contains(
            "is-active",
        )
        || !planningReportHasActivity
    ) {
        return;
    }

    setReportNotification({
        reportId: "planning",

        type:
            canExport
                ? "success"
                : "warning",

        message:
            canExport
                ? "O relatório de planejamento está pronto para exportação."
                : "O relatório de planejamento ainda aguarda informações.",
    });
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

    planningPanel
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

        const segregateTosLabel =
            segregateTosCheckbox
                ?.closest(
                    ".planning-lh-segregate-to-toggle",
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

        if (segregateTosLabel) {
            segregateTosLabel.hidden =
                !input.checked;
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

function getPlanningElementById(id) {
    return planningPanel
        ?.querySelector(
            `#${id}`,
        ) || null;
}

function initializePlanningHeightSynchronization() {
    const planningControls =
        planningPanel.querySelector(
            ".report-controls",
        );

    const planningSheet =
        getPlanningElementById(
            "planningSheetPreview",
        );

    const planningLhListElement =
        getPlanningElementById(
            "planningLhList",
        );

    if (
        !planningControls ||
        !planningSheet ||
        !planningLhListElement
    ) {
        console.error(
            "Não foi possível sincronizar as alturas.",
            {
                planningControls,
                planningSheet,
                planningLhListElement,
            },
        );

        return;
    }

    requestAnimationFrame(
        function () {
            const controlsHeight =
                planningControls
                    .getBoundingClientRect()
                    .height;

            const listHeight =
                planningLhListElement
                    .getBoundingClientRect()
                    .height;

            const fixedControlsHeight =
                controlsHeight -
                listHeight;

            function synchronizePlanningHeight() {
                const previewHeight =
                    planningSheet
                        .getBoundingClientRect()
                        .height;

                const newListMaxHeight =
                    Math.max(
                        0,
                        previewHeight -
                        fixedControlsHeight,
                    );

                planningLhListElement.style.setProperty(
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

function initializePlanningView(
    rootElement =
        document.getElementById(
            "planning",
        ),
) {
    planningPanel =
        rootElement instanceof HTMLElement
            ? rootElement
            : null;

    planningGeneralControls =
        getPlanningElementById(
            "planningGeneralControls",
        );

    planningPoolControls =
        getPlanningElementById(
            "planningPoolControls",
        );

    planningPreviewAverageSpr =
        getPlanningElementById(
            "planningPreviewAverageSpr",
        );

    planningPreviewDailyCapacity =
        getPlanningElementById(
            "planningPreviewDailyCapacity",
        );

    planningCopyReportButton =
        getPlanningElementById(
            "planningCopyReportButton",
        );

    planningDownloadReportButton =
        getPlanningElementById(
            "planningDownloadReportButton",
        );

    planningReportExportArea =
        getPlanningElementById(
            "planningReportExportArea",
        );

    planningLhList =
        getPlanningElementById(
            "planningLhList",
        );

    planningAddLhButton =
        getPlanningElementById(
            "planningAddLh",
        );

    planningClearLhsButton =
        getPlanningElementById(
            "planningClearLhs",
        );

    planningClearReportButton =
        getPlanningElementById(
            "planningClearReportButton",
        );

    planningEstimatedVolume =
        getPlanningElementById(
            "planningEstimatedVolume",
        );

    planningPreviewLhBody =
        getPlanningElementById(
            "planningPreviewLhBody",
        );

    planningPreviewCpBacklog =
        getPlanningElementById(
            "planningPreviewCpBacklog",
        );

    planningPreviewCpBulky =
        getPlanningElementById(
            "planningPreviewCpBulky",
        );

    planningPreviewCpLhPool =
        getPlanningElementById(
            "planningPreviewCpLhPool",
        );

    planningPreviewCpErrors =
        getPlanningElementById(
            "planningPreviewCpErrors",
        );

    planningPreviewCpAdded =
        getPlanningElementById(
            "planningPreviewCpAdded",
        );

    planningPreviewCpRemoved =
        getPlanningElementById(
            "planningPreviewCpRemoved",
        );

    planningPreviewSegregatedBody =
        getPlanningElementById(
            "planningPreviewSegregatedBody",
        );

    planningPreviewSegregatedTosBody =
        getPlanningElementById(
            "planningPreviewSegregatedTosBody",
        );

    planningToGroups =
        getPlanningElementById(
            "planningToGroups",
        );

    planningToEmpty =
        getPlanningElementById(
            "planningToEmpty",
        );

    planningSegregatedTosTab =
        getPlanningElementById(
            "planningSegregatedTosTab",
        );

    planningLhTabLink =
        planningPanel?.querySelector(
            '#planningTabs a[href="#lhs-list"]',
        );

    planningSegregatedSection =
        getPlanningElementById(
            "planningSegregatedSection",
        );

    planningSegregatedTosSection =
        getPlanningElementById(
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
        !planningPanel ||
        !planningCopyReportButton ||
        !planningDownloadReportButton
        
    ) {
        console.error(
            "Elementos do Planejamento não foram encontrados.",
        );

        return false;
    }

    ensureMinimumPlanningLhs();

    planningNotificationObserver
        ?.disconnect();

    planningNotificationObserver =
        new MutationObserver(
            function () {
                if (
                    planningPanel.classList.contains(
                        "is-active",
                    )
                ) {
                    renderPlanningReportStatus(
                        getPlanningState(),
                    );
                }
            },
        );

    planningNotificationObserver.observe(
        planningPanel,
        {
            attributes: true,
            attributeFilter: [
                "class",
            ],
        },
    );

    subscribePlanningState(
        function (
            state,
            change,
        ) {
            planningReportHasActivity =
                true;

            if (
                change.type === "lh-added" ||
                change.type === "lh-removed" ||
                change.type === "lhs-replaced" ||
                change.type === "lhs-minimum-restored" ||
                change.type === "lhs-reset" ||
                change.type === "planning-reset" ||
                change.type === "planning-session-imported"
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
                change.type === "planning-session-imported" ||
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
                    "planning-session-imported" ||
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

    planningPanel.addEventListener(
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

    renderPlanningReport();

    initializePlanningHeightSynchronization();

    return true;
}

/* RENDERIZA TODO O MÓDULO */

function renderPlanningReport(
    state = getPlanningState(),
) {
    if (
        !planningLhList ||
        !planningToGroups ||
        !planningGeneralControls ||
        !planningPoolControls
    ) {
        return false;
    }

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

    return true;
}

export {
    canExportPlanningReport,
    initializePlanningView,
    renderPlanningReport,
};
