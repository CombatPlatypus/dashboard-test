import {
    DEFAULT_PLANNING_AVERAGE_SPR,
    MINIMUM_PLANNING_LHS,
} from "./state.js";

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
    getPlanningPoolQuantity,
    getPlanningPreviewLhs,
    hasPlanningToInformation,
};
