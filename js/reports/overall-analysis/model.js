import {
    getReceiptSummary,
} from "../receipt/state.js";

import {
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
    createParcelSummary,
} from "../parcel-sweeper/model.js";

import {
    createReverseSummary,
} from "../reverse/model.js";

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

    const returnedHasData =
        lossesHasData ||
        lossesSummary.returnedPackages > 0;

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

                    returnedPackages:
                        returnedHasData
                            ? lossesPeriod
                                ?.returnedPackages ?? 0
                            : null,
                };
            },
        );

    return {
        hasData:
            damageHasData ||
            returnedHasData,

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
    parcelState = null,
    reverseState = null,
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

    const parcelSummary =
        createParcelSummary(
            parcelState?.rows,
            parcelState?.operatorKindOverrides,
        );

    const reverseSummary =
        createReverseSummary(
            reverseState?.transfers,
        );

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

        damageAndLosses:
            damageAndLossesAnalysis,

        parcel: {
            hasData: parcelSummary.hasData,
            scannedCount: parcelSummary.scannedCount,
            backlogCount: parcelSummary.backlogCount,
            exceptionCount: parcelSummary.exceptionCount,
            missortedCount: parcelSummary.missortedCount,
            expectedTotalCount: parcelSummary.expectedTotalCount,
            expectedScannedCount: parcelSummary.expectedScannedCount,
            expectedUnscannedCount: parcelSummary.expectedUnscannedCount,
        },

        reverse: {
            hasData: reverseSummary.hasData,
            total: reverseSummary.total,
            quantities: reverseSummary.quantities,
        },
    };
}

export {
    createOverallAnalysisData,
};
