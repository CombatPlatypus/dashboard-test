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
    updatePlanningBacklogField,
    updatePlanningCollectionPoolField,
    updatePlanningGeneralField,
    updatePlanningLh,
    updatePlanningTo,
    updatePlanningVehicleCount,
    resetPlanningReport,
} from "./state.js";

import {
    calculatePlanningAverageSpr,
    calculatePlanningEstimatedVolume,
    canExportPlanningReport,
    getPlanningLhQuantity,
    getPlanningLhSegregatedQuantity,
    getPlanningBacklogTotal,
    getPlanningPoolQuantity,
    getPlanningPreviewLhs,
    hasPlanningExportInputChanged,
    hasPlanningLhListChanged,
    hasPlanningVolumeChanged,
    hasPlanningToInformation,
} from "./calculations.js";

import {
    bindReportImageExportButton,
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
let planningRemoveLhButton = null;
let planningEstimatedVolume = null;
let planningPreviewLhBody = null;
let planningPreviewSegregatedBody = null;
let planningPreviewSegregatedTosBody = null;
let planningPreviewAverageSpr = null;
let planningPreviewDailyCapacity = null;
let planningToList = null;
let planningAddToButton = null;
let planningRemoveToButton = null;
let planningSegregatedTosTab = null;
let planningLhTabLink = null;
let planningPreviewCpBacklog = null;
let planningPreviewCpBulky = null;
let planningPreviewCpLhPool = null;
let planningSegregatedSection = null;    
let planningSegregatedTosSection = null;
let planningClearReportButton = null;
let planningPreviewCpErrors = null;
let planningPreviewCpAdded = null;
let planningPreviewCpRemoved = null;
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
    const ordinalNames = [
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

    const item =
        document.createElement(
            "div",
        );

    item.className =
        "planning-lh-item";

    item.dataset.lhId =
        String(lh.id);

    const header =
        document.createElement(
            "div",
        );

    header.className =
        "flex-box-between";

    const title =
        document.createElement(
            "h4",
        );

    title.textContent =
        `${ordinalNames[position - 1] ?? `${position}º`} LH`;

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

    header.append(
        title,
        headerActions,
    );

    const mainFields =
        document.createElement(
            "div",
        );

    mainFields.className =
        "lhs-inputs";

    const codeInput =
        createPlanningLhInput({
            field: "code",
            value: lh.code,
            placeholder: "Código",
            ariaLabel:
                `Código do LH ${position}`,
        });

    const originInput =
        createPlanningLhInput({
            field: "origin",
            value: lh.origin,
            placeholder: "Origem",
            ariaLabel:
                `Origem do LH ${position}`,
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

    item.append(
        header,
        mainFields,
    );

    mainFields.append(
        codeInput,
        originInput,
        quantityInput,
    );

    return item;
}

/* CRIA O ELEMENTO VISUAL DE UMA TO */

function createPlanningToElement(
    to,
    lhId,
    position,
) {
    const ordinalNames = [
        "Primeira",
        "Segunda",
        "Terceira",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sétima",
        "Oitava",
        "Nona",
    ];

    const item =
        document.createElement(
            "div",
        );

    item.dataset.lhId =
        String(lhId);

    item.dataset.toId =
        String(to.id);

    const title =
        document.createElement(
            "h4",
        );

    title.textContent =
        `${ordinalNames[position - 1] ?? `${position}ª`} TO`;

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
            placeholder: "Código",
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
        title,
        fields,
    );

    return item;
}

/* RETORNA AS TOS NA ORDEM EM QUE FORAM ADICIONADAS */

function getPlanningTosWithLh(lhs) {
    return lhs
        .filter(
            function (lh) {
                return (
                    lh.segregate &&
                    lh.segregateTos
                );
            },
        )
        .flatMap(
            function (lh) {
                return lh.tos.map(
                    function (to) {
                        return {
                            lhId: lh.id,
                            to,
                        };
                    },
                );
            },
        )
        .sort(
            function (first, second) {
                return first.to.id - second.to.id;
            },
        );
}

/* RENDERIZA A LISTA DE TOS */

function renderPlanningToList(lhs) {
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

    planningAddToButton.disabled =
        !hasLhsWithTos;

    const tosWithLh =
        getPlanningTosWithLh(
            lhs,
        );

    const toElements =
        tosWithLh.map(
            function (entry, index) {
                return createPlanningToElement(
                    entry.to,
                    entry.lhId,
                    index + 1,
                );
            },
        );

    planningToList.replaceChildren(
        ...toElements,
    );

    const lastEntry =
        tosWithLh.at(-1);

    const lastEntryLh =
        lhsWithTos.find(
            function (lh) {
                return lh.id ===
                    lastEntry?.lhId;
            },
        );

    planningRemoveToButton.disabled =
        !lastEntry ||
        !lastEntryLh ||
        lastEntryLh.tos.length <=
            MINIMUM_PLANNING_TOS_PER_LH;
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

function renderPlanningPreview(state, change) {
    const { type, field } = change ?? {};
    const listChanged = hasPlanningLhListChanged(change);
    const volumeChanged = hasPlanningVolumeChanged(change);
    const lhChanged = type === "lh-updated";
    const toChanged = ["to-added", "to-updated", "to-removed"].includes(type);
    const affectedLh = lhChanged || toChanged ? state.lhs.find(lh => lh.id === (change.id ?? change.lhId)) : null;
    const reset = !change || ["planning-reset", "planning-session-imported"].includes(type);
    const backlogChanged = reset || type === "backlog-updated";
    const poolFieldChanged = key => backlogChanged || (type === "collection-pool-updated" && field === key);
    const format = value => planningNumberFormatter.format(value);

    if (volumeChanged) {
        planningEstimatedVolume.textContent = format(calculatePlanningEstimatedVolume(state));
    }
    if (volumeChanged || type === "vehicle-count-updated" || field === "averageSpr") {
        planningPreviewAverageSpr.textContent = format(calculatePlanningAverageSpr(state));
    }
    if (reset || field === "dailyCapacity") {
        planningPreviewDailyCapacity.textContent = format(state.dailyCapacity ?? 0);
    }

    if (poolFieldChanged("backlogPackages")) {
        planningPreviewCpBacklog.textContent = format(getPlanningPoolQuantity(state, "backlogPackages"));
    }
    if (poolFieldChanged("backlogBulky")) {
        planningPreviewCpBulky.textContent = format(getPlanningPoolQuantity(state, "backlogBulky"));
    }
    if (poolFieldChanged("added")) {
        planningPreviewCpAdded.textContent = format(getPlanningPoolQuantity(state, "added"));
    }
    if (reset || (type === "collection-pool-updated" && field === "removed")) {
        planningPreviewCpRemoved.textContent = format(state.collectionPool.removed ?? 0);
    }
    if (reset || (type === "collection-pool-updated" && field === "errors")) {
        planningPreviewCpErrors.textContent = format(state.collectionPool.errors ?? 0);
    }

    if (listChanged || (lhChanged && field === "quantity")) {
        planningPreviewCpLhPool.textContent = format(getPlanningLhQuantity(state.lhs));
    }
    if (listChanged || (lhChanged && ["code", "origin", "quantity"].includes(field))) {
        renderPlanningLhPreview(getPlanningPreviewLhs(state.lhs));
    }
    if (listChanged || (lhChanged && (field === "segregate" || affectedLh?.segregate)) ||
        (toChanged && affectedLh?.segregateTos && field !== "code")) {
        renderPlanningSegregatedPreview(state.lhs);
    }
    if (listChanged || (lhChanged && ["code", "segregate", "segregateTos"].includes(field)) ||
        (toChanged && affectedLh?.segregateTos)) {
        renderPlanningSegregatedTosPreview(state.lhs);
    }
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

    planningRemoveLhButton.disabled =
        lhs.length <=
            MINIMUM_PLANNING_LHS;
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

    if (field === "averageSpr") {
        return;
    }

    updatePlanningGeneralField(
        field,
        input.value,
    );
}

/* CONFIRMA O SPR APÓS A EDIÇÃO DO CAMPO */

function handlePlanningGeneralChange(
    event,
) {
    const input =
        event.target instanceof
        HTMLInputElement
            ? event.target
            : null;

    if (
        input?.dataset
            .planningField !==
        "averageSpr"
    ) {
        return;
    }

    updatePlanningGeneralField(
        "averageSpr",
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
        input.readOnly ||
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

/* ATUALIZA UMA LISTA DE BRS DO BACKLOG */

function handlePlanningBacklogInput(event) {
    const textarea =
        event.target instanceof
        HTMLTextAreaElement
            ? event.target
            : null;

    const field =
        textarea?.dataset
            .planningBacklogField;

    if (
        !textarea ||
        !field
    ) {
        return;
    }

    updatePlanningBacklogField(
        field,
        textarea.value,
    );
}

/* SINCRONIZA OS CONTROLES DOS INDICADORES */

function synchronizePlanningIndicatorControls(state, change) {
    const { type, field } = change ?? {};
    const reset = !change || ["planning-reset", "planning-session-imported"].includes(type);
    if (hasPlanningVolumeChanged(change) || type === "vehicle-count-updated" || field === "averageSpr") {
        const input = planningPanel.querySelector('[data-planning-field="averageSpr"]');
        input.value = calculatePlanningAverageSpr(state);
    }
    if (reset || field === "dailyCapacity") {
        const input = planningPanel.querySelector('[data-planning-field="dailyCapacity"]');
        input.value = state.dailyCapacity ?? "";
    }
    if (reset || type === "vehicle-count-updated" || change?.vehicleCountsCleared) {
        for (const input of planningPanel.querySelectorAll("[data-planning-vehicle-field]")) {
            const vehicle = input.dataset.planningVehicleField;
            if (reset || change.vehicleCountsCleared || vehicle === field) {
                input.value = state.vehicleCounts[vehicle] ?? "";
            }
        }
    }
}

/* SINCRONIZA OS CONTROLES DA COLLECTION POOL */

function synchronizePlanningPoolControls(
    state,
) {
    const backlogTotal =
        getPlanningBacklogTotal(
            state,
        );

    planningPanel
        .querySelectorAll(
            "[data-planning-pool-field]",
        )
        .forEach(
            function (input) {
                const field =
                    input.dataset
                        .planningPoolField;

                const isCalculatedAdded =
                    field === "added" &&
                    backlogTotal > 0;

                input.value =
                    isCalculatedAdded
                        ? backlogTotal
                        : state
                            .collectionPool[field] ??
                            "";

                input.readOnly =
                    isCalculatedAdded;

                input.setAttribute(
                    "aria-readonly",
                    String(
                        isCalculatedAdded,
                    ),
                );
            },
        );
}

/* SINCRONIZA AS LISTAS DE BRS DO BACKLOG */

function synchronizePlanningBacklogControls(
    state,
) {
    planningPanel
        .querySelectorAll(
            "[data-planning-backlog-field]",
        )
        .forEach(
            function (textarea) {
                const field =
                    textarea.dataset
                        .planningBacklogField;

                textarea.value =
                    state.backlog?.[field] ??
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

    synchronizePlanningBacklogControls(
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

/* REMOVE O ÚLTIMO LH ADICIONADO */

function handleRemovePlanningLh() {
    const lastLh =
        getPlanningState()
            .lhs
            .at(-1);

    if (
        !lastLh ||
        planningRemoveLhButton.disabled
    ) {
        return;
    }

    if (
        removePlanningLh(
            lastLh.id,
        )
    ) {
        planningAddLhButton.focus();
    }
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

    const originalTitle =
        planningCopyReportButton.title;

    const originalAriaLabel =
        planningCopyReportButton.getAttribute(
            "aria-label",
        );

    planningCopyReportButton.disabled =
        true;

    planningCopyReportButton.title =
        "Copiando relatório...";

    planningCopyReportButton.setAttribute(
        "aria-label",
        "Copiando relatório de planejamento",
    );

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

        setReportNotification({
            reportId: "planning",
            type: "success",
            message: "Relatório de planejamento copiado.",
        });
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

        setReportNotification({
            reportId: "planning",
            type: "error",
            message: "Não foi possível copiar o relatório de planejamento.",
        });
    } finally {
        planningCopyReportButton.removeAttribute(
            "aria-busy",
        );

        planningCopyReportButton.title =
            originalTitle;

        if (originalAriaLabel) {
            planningCopyReportButton.setAttribute(
                "aria-label",
                originalAriaLabel,
            );
        }

        planningCopyReportButton.disabled =
            !canExportPlanningReport(
                getPlanningState(),
            );
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

    const originalTitle =
        planningDownloadReportButton.title;

    const originalAriaLabel =
        planningDownloadReportButton.getAttribute(
            "aria-label",
        );

    planningDownloadReportButton.disabled =
        true;

    planningDownloadReportButton.title =
        "Gerando relatório...";

    planningDownloadReportButton.setAttribute(
        "aria-label",
        "Gerando relatório de planejamento",
    );

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

        setReportNotification({
            reportId: "planning",
            type: "success",
            message: "Relatório de planejamento baixado.",
        });
    } catch (error) {
        console.error(
            "Não foi possível gerar o relatório:",
            error,
        );

        window.alert(
            "Não foi possível gerar a imagem do relatório.",
        );

        setReportNotification({
            reportId: "planning",
            type: "error",
            message: "Não foi possível baixar o relatório de planejamento.",
        });
    } finally {
        planningDownloadReportButton.title =
            originalTitle;

        if (originalAriaLabel) {
            planningDownloadReportButton.setAttribute(
                "aria-label",
                originalAriaLabel,
            );
        }

        planningDownloadReportButton.removeAttribute(
            "aria-busy",
        );

        planningDownloadReportButton.disabled =
            !canExportPlanningReport(
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
        updatePlanningLh(
            lhId,
            field,
            input.checked,
        );

        if (
            input.checked
        ) {
            updatePlanningLh(
                lhId,
                "segregateTos",
                true,
            );
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

    const item =
        input.closest(
            "[data-to-id]",
        );

    const field =
        input.dataset.field;

    const lhId =
        Number(
            item?.dataset.lhId,
        );

    const toId =
        Number(
            item?.dataset.toId,
        );

    if (
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

/* ADICIONA UMA TO AO ÚLTIMO LH SEGREGADO */

function handleAddPlanningTo() {
    const targetLh =
        getPlanningState()
            .lhs
            .filter(
                function (lh) {
                    return (
                        lh.segregate &&
                        lh.segregateTos
                    );
                },
            )
            .at(-1);

    if (!targetLh) {
        return;
    }

    const newTo =
        addPlanningTo(
            targetLh.id,
        );

    if (!newTo) {
        return;
    }

    planningToList
        .querySelector(
            `[data-to-id="${newTo.id}"] ` +
            '[data-field="code"]',
        )
        ?.focus();
}

/* REMOVE A ÚLTIMA TO ADICIONADA */

function handleRemovePlanningTo() {
    if (planningRemoveToButton.disabled) {
        return;
    }

    const lastEntry =
        getPlanningTosWithLh(
            getPlanningState().lhs,
        )
            .at(-1);

    if (!lastEntry) {
        return;
    }

    if (
        removePlanningTo(
            lastEntry.lhId,
            lastEntry.to.id,
        )
    ) {
        planningAddToButton.focus();
    }
}

/* SINCRONIZA A ALTURA DOS CONTROLES COM A PRÉVIA */

function getPlanningElementById(id) {
    return planningPanel
        ?.querySelector(
            `#${id}`,
        ) || null;
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
        planningCopyReportButton;

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

    planningRemoveLhButton =
        getPlanningElementById(
            "planningRemoveLh",
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

    planningToList =
        getPlanningElementById(
            "planningToList",
        );

    planningAddToButton =
        getPlanningElementById(
            "planningAddTo",
        );

    planningRemoveToButton =
        getPlanningElementById(
            "planningRemoveTo",
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
        !planningRemoveLhButton ||
        !planningEstimatedVolume ||
        !planningPreviewLhBody ||
        !planningPreviewCpBacklog ||
        !planningPreviewCpBulky ||
        !planningPreviewCpLhPool ||
        !planningClearReportButton ||
        !planningPreviewCpErrors ||
        !planningPreviewCpAdded ||
        !planningPreviewCpRemoved ||
        !planningPreviewSegregatedBody ||
        !planningPreviewSegregatedTosBody ||
        !planningSegregatedSection ||
        !planningSegregatedTosSection ||
        !planningToList ||
        !planningAddToButton ||
        !planningRemoveToButton ||
        !planningSegregatedTosTab ||
        !planningLhTabLink ||
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

    subscribePlanningState((state, change) => {
        const { type, field } = change;
        const renderStatus = !planningReportHasActivity || hasPlanningExportInputChanged(change);
        planningReportHasActivity = true;
        const listChanged = hasPlanningLhListChanged(change);
        const reset = ["planning-reset", "planning-session-imported"].includes(type);
        if (listChanged) {
            renderPlanningLhList(state.lhs);
        }
        if (listChanged || ["to-added", "to-removed"].includes(type) ||
            (type === "lh-updated" && ["code", "segregate", "segregateTos"].includes(field))) {
            renderPlanningToList(state.lhs);
        }

        synchronizePlanningIndicatorControls(state, change);
        if (reset || ["collection-pool-updated", "backlog-updated"].includes(type)) {
            synchronizePlanningPoolControls(state);
        }
        if (reset) {
            synchronizePlanningBacklogControls(state);
        }
        renderPlanningPreview(state, change);
        if (renderStatus) {
            renderPlanningReportStatus(state);
        }
    });

    planningAddLhButton.addEventListener(
        "click",
        handleAddPlanningLh,
    );

    planningRemoveLhButton.addEventListener(
        "click",
        handleRemovePlanningLh,
    );

    planningAddToButton.addEventListener(
        "click",
        handleAddPlanningTo,
    );

    planningRemoveToButton.addEventListener(
        "click",
        handleRemovePlanningTo,
    );

    planningClearReportButton.addEventListener(
        "click",
        handleResetPlanningReport,
    );

    bindReportImageExportButton(
        planningCopyReportButton,
        {
            onCopy:
                handleCopyPlanningReport,
            onDownload:
                handleDownloadPlanningReport,
        },
    );

    planningLhList.addEventListener(
        "input",
        handlePlanningLhInput,
    );

    planningToList.addEventListener(
        "input",
        handlePlanningToInput,
    );

    planningPanel.addEventListener(
        "input",
        handlePlanningGeneralInput,
    );

    planningPanel.addEventListener(
        "change",
        handlePlanningGeneralChange,
    );

    planningPanel.addEventListener(
        "input",
        handlePlanningVehicleInput,
    );

    planningPanel.addEventListener(
        "input",
        handlePlanningPoolInput,
    );

    planningPanel.addEventListener(
        "input",
        handlePlanningBacklogInput,
    );

    renderPlanningReport();

    return true;
}

/* RENDERIZA TODO O MÓDULO */

function renderPlanningReport(
    state = getPlanningState(),
) {
    if (
        !planningLhList ||
        !planningToList
    ) {
        return false;
    }

    synchronizePlanningControls(
        state,
    );

    renderPlanningLhList(
        state.lhs,
    );

    renderPlanningToList(
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
