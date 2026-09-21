import {
    getReceiptSummary,
} from "../receipt/state.js";

import {
    getExpeditionOperatorRanking,
    getExpeditionSummary,
} from "../expedition/state.js";

import {
    getLossesRateMonthSummary,
} from "../losses-rate/state.js";

import {
    getDamageAndLossesSummary,
} from "../damage-and-losses/state.js";

import {
    getLossesSummary,
} from "../damage-and-losses/losses-state.js";

import {
    formatReportPersonFirstName,
} from "../core/person-name.js";

const OVERALL_ANALYSIS_CAPACITY =
    20000;

const OVERALL_ANALYSIS_LOSS_RATE_LIMIT =
    0.0003;

const OVERALL_ANALYSIS_PERIOD_KEYS =
    Object.freeze([
        "today",
        "yesterday",
        "dayBeforeYesterday",
        "days3to7",
        "days8to14",
        "days15toMonthStart",
        "totalMonth",
    ]);

function getOverallAnalysisContextQuantity(
    value,
) {
    return Number.isSafeInteger(
        value,
    ) && value >= 0
        ? value
        : null;
}

/* NORMALIZA O NOME EXIBIDO NOS DESTAQUES */

function getOverallAnalysisPersonName(
    value,
) {
    return formatReportPersonFirstName(
        value,
        null,
    );
}

/* OBTÉM O DESTAQUE DO RANK DE RECEBEDORES */

function getReceiptHighlights(
    state,
) {
    const topVolumeOperator =
        (
            Array.isArray(
                state?.operators,
            )
                ? state.operators
                : []
        )
            .filter(
                function (operator) {
                    return (
                        operator.selected !==
                            false &&
                        operator.packagesReceived !==
                            null &&
                        operator.packagesReceived !==
                            undefined
                    );
                },
            )
            .slice()
            .sort(
                function (
                    first,
                    second,
                ) {
                    return (
                        Number(
                            second.packagesReceived,
                        ) -
                        Number(
                            first.packagesReceived,
                        )
                    );
                },
            )[0] || null;

    return {
        fastestReceiver:
            topVolumeOperator
                ? getOverallAnalysisPersonName(
                    topVolumeOperator.receiver,
                )
                : null,

        mostPackages:
            topVolumeOperator
                ? getOverallAnalysisPersonName(
                    topVolumeOperator.receiver,
                )
                : null,
    };
}

/* OBTÉM OS DESTAQUES DO RANK DE CONFERENTES */

function getExpeditionHighlights(
    state,
) {
    const operators =
        getExpeditionOperatorRanking(
            state,
        ).filter(
            function (operator) {
                return operator.selected !==
                    false;
            },
        );

    const topRoutesOperator =
        operators
            .slice()
            .sort(
                function (
                    first,
                    second,
                ) {
                    return (
                        second.routesChecked -
                            first.routesChecked ||

                        first.operator.localeCompare(
                            second.operator,
                            "pt-BR",
                        )
                    );
                },
            )[0] || null;

    const fastestOperator =
        operators
            .filter(
                function (operator) {
                    return (
                        operator.averageDurationSeconds !==
                        null
                    );
                },
            )
            .slice()
            .sort(
                function (
                    first,
                    second,
                ) {
                    return (
                        first.averageDurationSeconds -
                            second.averageDurationSeconds ||

                        second.routesChecked -
                            first.routesChecked ||

                        first.operator.localeCompare(
                            second.operator,
                            "pt-BR",
                        )
                    );
                },
            )[0] || null;

    return {
        fastestChecker:
            fastestOperator
                ? getOverallAnalysisPersonName(
                    fastestOperator.operator,
                )
                : null,

        mostRoutesChecker:
            topRoutesOperator
                ? getOverallAnalysisPersonName(
                    topRoutesOperator.operator,
                )
                : null,
    };
}

/* REÚNE AVARIAS E PERDAS NOS MESMOS PERÍODOS DA TABELA */

function getOverallDamageAndLossesAnalysis(
    damageState,
    lossesState,
) {
    const damageSummary =
        getDamageAndLossesSummary(
            damageState,
        );

    const lossesSummary =
        getLossesSummary(
            lossesState,
        );

    const damageHasData =
        damageSummary.hasData;

    const lossesHasData =
        lossesSummary.hasData;

    const traditionalAnalysis = {};

    OVERALL_ANALYSIS_PERIOD_KEYS
        .forEach(
            function (periodKey) {
                const damagePeriod =
                    damageSummary
                        .traditionalAnalysis
                        ?.[periodKey];

                const lossesPeriod =
                    lossesSummary
                        .traditionalAnalysis
                        ?.[periodKey];

                traditionalAnalysis[
                    periodKey
                ] = {
                    hub:
                        damageHasData
                            ? damagePeriod
                                ?.hub ?? 0
                            : null,

                    soc:
                        damageHasData
                            ? damagePeriod
                                ?.soc ?? 0
                            : null,

                    underReview:
                        lossesHasData
                            ? lossesPeriod
                                ?.underReview ?? 0
                            : null,

                    confirmedLosses:
                        lossesHasData
                            ? lossesPeriod
                                ?.confirmedLosses ?? 0
                            : null,

                    savedAwaitingTicket:
                        lossesHasData
                            ? lossesPeriod
                                ?.savedAwaitingTicket ?? 0
                            : null,

                    emptyAwaitingTicket:
                        lossesHasData
                            ? lossesPeriod
                                ?.emptyAwaitingTicket ?? 0
                            : null,
                };
            },
        );

    return {
        hasData:
            damageHasData ||
            lossesHasData,

        damageHasData,
        lossesHasData,

        lossesTotal:
            lossesHasData
                ? lossesSummary.total
                : null,

        packagesUnderReview:
            lossesHasData
                ? lossesSummary
                    .underReview
                : null,

        traditionalAnalysis,
    };
}

/* CRIA UMA VISÃO DERIVADA DOS RELATÓRIOS DE ORIGEM */

function createOverallAnalysisData(
    receiptState,
    expeditionState,
    lossesRateState,
    reportContext = {},
    damageState = null,
    lossesState = null,
) {
    const receiptSummary =
        getReceiptSummary(
            receiptState,
        );

    const expeditionSummary =
        getExpeditionSummary(
            expeditionState,
        );

    const expectedVolume =
        receiptState?.expectedVolume ??
        null;

    const receivedVolume =
        receiptSummary.receivedVolume;

    const totalErrors =
        receiptSummary.totalErrors;

    const errorRate =
        totalErrors !== null &&
        receivedVolume !== null &&
        receivedVolume > 0
            ? totalErrors /
                receivedVolume
            : null;

    const processingGap =
        expectedVolume !== null &&
        receivedVolume !== null
            ? Math.max(
                expectedVolume -
                    receivedVolume,
                0,
            )
            : null;

    const hasExpeditionData =
        expeditionSummary.hasData;

    const floorVolume =
        expeditionSummary.floorVolume;

    const plannedVolume =
        getOverallAnalysisContextQuantity(
            reportContext.plannedVolume,
        );

    const expeditedVolume =
        hasExpeditionData
            ? expeditionSummary
                .volumeChecked
            : null;

    const planningGap =
        plannedVolume !== null &&
        expeditedVolume !== null
            ? Math.max(
                plannedVolume -
                    expeditedVolume,
                0,
            )
            : null;

    const configuredCapacity =
        getOverallAnalysisContextQuantity(
            reportContext.shiftCapacity,
        );

    const capacityLimit =
        configuredCapacity !== null &&
        configuredCapacity > 0
            ? configuredCapacity
            : OVERALL_ANALYSIS_CAPACITY;

    const capacityUsed =
        plannedVolume;

    const capacityUsageRate =
        capacityUsed !== null
            ? capacityUsed /
                capacityLimit
            : null;

    const capacityBalance =
        capacityUsed !== null
            ? capacityLimit -
                capacityUsed
            : null;

    const lossesRateSummary =
        lossesRateState
            ? getLossesRateMonthSummary(
                lossesRateState.activeMonth,
                lossesRateState,
            )
            : null;

    const lossRate =
        lossesRateSummary?.lossRate ??
        null;

    const lossRateDifference =
        lossRate !== null
            ? Math.abs(
                OVERALL_ANALYSIS_LOSS_RATE_LIMIT -
                    lossRate,
            ) * 100
            : null;

    const damageAndLossesAnalysis =
        getOverallDamageAndLossesAnalysis(
            damageState,
            lossesState,
        );

    const packagesAnalysisRate =
        damageAndLossesAnalysis
            .packagesUnderReview !== null &&
        damageAndLossesAnalysis
            .lossesTotal > 0
            ? damageAndLossesAnalysis
                .packagesUnderReview /
                damageAndLossesAnalysis
                    .lossesTotal
            : null;

    return {
        context: {
            window:
                String(
                    reportContext.window ??
                    "",
                ).trim(),

            analyst:
                String(
                    reportContext.analyst ??
                    "",
                ).trim(),

            plannedVolume,

            collaboratorCount:
                getOverallAnalysisContextQuantity(
                    reportContext.collaboratorCount,
                ),

            shiftCapacity:
                configuredCapacity,
        },

        cards: {
            capacity: {
                limit:
                    capacityLimit,

                used:
                    capacityUsed,

                usageRate:
                    capacityUsageRate,

                balance:
                    capacityBalance,
            },

            packagesAnalysis: {
                value:
                    damageAndLossesAnalysis
                        .packagesUnderReview,

                total:
                    damageAndLossesAnalysis
                        .lossesTotal,

                rate:
                    packagesAnalysisRate,
            },

            lossesRate: {
                rate:
                    lossRate,

                limit:
                    OVERALL_ANALYSIS_LOSS_RATE_LIMIT,

                differencePercentagePoints:
                    lossRateDifference,

                withinLimit:
                    lossRate !== null
                        ? lossRate <=
                            OVERALL_ANALYSIS_LOSS_RATE_LIMIT
                        : null,
            },
        },

        flow: {
            planned:
                plannedVolume,

            processed:
                receivedVolume,

            expedited:
                expeditedVolume,

            floor:
                planningGap,

            gap:
                planningGap,
        },

        processing: {
            expectedVolume,
            receivedVolume,
            totalErrors,
            errorRate,
            gap:
                processingGap,
        },

        expedition: {
            routesChecked:
                hasExpeditionData
                    ? expeditionSummary
                        .validatedRoutes
                    : null,

            volumeChecked:
                hasExpeditionData
                    ? expeditionSummary
                        .volumeChecked
                    : null,

            floorVolume,

            durationSeconds:
                expeditionSummary
                    .expeditionDurationSeconds,
        },

        highlights: {
            ...getReceiptHighlights(
                receiptState,
            ),

            ...getExpeditionHighlights(
                expeditionState,
            ),
        },

        damageAndLosses:
            damageAndLossesAnalysis,
    };
}

export {
    createOverallAnalysisData,
    getOverallAnalysisPersonName,
};
