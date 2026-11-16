import {
    DEFAULT_PLANNING_AVERAGE_SPR,
    MINIMUM_PLANNING_LHS,
} from "./state.js";

function hasPlanningLhListChanged(change) {
    return !change || [
        "lh-added", "lh-removed", "lhs-replaced", "lhs-minimum-restored",
        "lhs-reset", "planning-reset", "planning-session-imported",
    ].includes(change.type);
}

function hasPlanningVolumeChanged(change) {
    return hasPlanningLhListChanged(change) || change.type === "backlog-updated" ||
        (change.type === "lh-updated" && change.field === "quantity") ||
        (change.type === "collection-pool-updated" && ["backlogPackages", "backlogBulky"].includes(change.field));
}

function hasPlanningExportInputChanged(change) {
    return hasPlanningVolumeChanged(change) || change.type === "vehicle-count-updated" ||
        change.type === "general-field-updated" ||
        (change.type === "lh-updated" && ["code", "origin"].includes(change.field));
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

/* RETORNA UMA QUANTIDADE DA COLLECTION POOL */

function getPlanningPoolQuantity(
    state,
    field,
) {
    const { packages: backlogPackages, bulky: backlogBulky } = getPlanningBacklogLists(state);

    const hasBacklogCodes =
        backlogPackages.length > 0 ||
        backlogBulky.length > 0;

    if (
        field === "backlogPackages" &&
        hasBacklogCodes
    ) {
        return backlogPackages.length;
    }

    if (
        field === "backlogBulky" &&
        hasBacklogCodes
    ) {
        return backlogBulky.length;
    }

    if (
        field === "added" &&
        hasBacklogCodes
    ) {
        return (
            backlogPackages.length +
            backlogBulky.length
        );
    }

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

/* NORMALIZA OS CÓDIGOS COLADOS NO BACKLOG */

function parsePlanningBacklogCodes(value) {
    const receivedCodes =
        String(
            value ?? "",
        )
        .split(/[\s,;]+/)
        .map(
            function (code) {
                return code.trim();
            },
        )
        .filter(Boolean);

    const uniqueCodes = [];
    const seenCodes = new Set();

    receivedCodes.forEach(
        function (code) {
            const comparisonCode =
                code.toUpperCase();

            if (
                seenCodes.has(
                    comparisonCode,
                )
            ) {
                return;
            }

            seenCodes.add(
                comparisonCode,
            );

            uniqueCodes.push(
                code,
            );
        },
    );

    return uniqueCodes;
}

/* RETORNA OS CÓDIGOS DE UM TIPO DE BACKLOG */

let planningBacklogCache = null;

function getPlanningBacklogLists(state) {
    const packagesText = state?.backlog?.packages;
    const bulkyText = state?.backlog?.bulky;
    if (planningBacklogCache && planningBacklogCache.packagesText === packagesText &&
        planningBacklogCache.bulkyText === bulkyText) {
        return planningBacklogCache;
    }

    const packages = parsePlanningBacklogCodes(packagesText);
    const packageCodes = new Set(packages.map(code => code.toUpperCase()));
    const bulky = parsePlanningBacklogCodes(bulkyText).filter(code => !packageCodes.has(code.toUpperCase()));
    planningBacklogCache = { packagesText, bulkyText, packages, bulky };
    return planningBacklogCache;
}

function getPlanningBacklogCodes(state, field) {
    return field === "packages" || field === "bulky"
        ? getPlanningBacklogLists(state)[field].slice()
        : parsePlanningBacklogCodes(state?.backlog?.[field]);
}

/* RETORNA A QUANTIDADE DE BRS INFORMADOS */

function getPlanningBacklogTotal(state) {
    const { packages, bulky } = getPlanningBacklogLists(state);
    return packages.length + bulky.length;
}

/* CALCULA A QUANTIDADE PRESENTE NOS LHS */

function getPlanningLhQuantity(lhs) {
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

function getPlanningVehicleTotal(state) {
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

function calculatePlanningAverageSpr(state) {
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

/* VERIFICA SE UM VALOR NUMÉRICO É VÁLIDO */

function isPlanningPositiveNumber(value) {
    return (
        Number.isFinite(
            value,
        ) &&
        value > 0
    );
}

/* VERIFICA SE UM LH POSSUI OS DADOS OBRIGATÓRIOS */

function isPlanningLhComplete(lh) {
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

function canExportPlanningReport(state) {
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

export {
    calculatePlanningAverageSpr,
    calculatePlanningEstimatedVolume,
    canExportPlanningReport,
    getPlanningLhQuantity,
    getPlanningLhSegregatedQuantity,
    getPlanningBacklogCodes,
    getPlanningBacklogTotal,
    getPlanningPoolQuantity,
    getPlanningPreviewLhs,
    hasPlanningExportInputChanged,
    hasPlanningLhListChanged,
    hasPlanningToInformation,
    hasPlanningVolumeChanged,
    parsePlanningBacklogCodes,
};
