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

const OVERALL_ANALYSIS_CAPACITY =
    20000;

const OVERALL_ANALYSIS_LOSS_RATE_LIMIT =
    0.0003;

/* NORMALIZA O NOME EXIBIDO NOS DESTAQUES */

function getOverallAnalysisPersonName(
    value,
) {
    const receivedValue =
        String(value ?? "")
            .trim();

    if (!receivedValue) {
        return null;
    }

    const closingBracketIndex =
        receivedValue.lastIndexOf(
            "]",
        );

    const name =
        closingBracketIndex !== -1
            ? receivedValue.slice(
                closingBracketIndex + 1,
            )
            : receivedValue;

    const firstName =
        name
            .trim()
            .split(/\s+/)[0]
            ?.toLocaleLowerCase(
                "pt-BR",
            ) || "";

    if (!firstName) {
        return null;
    }

    return (
        firstName
            .charAt(0)
            .toLocaleUpperCase(
                "pt-BR",
            ) +
        firstName.slice(1)
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
                ?.packagesReceived ??
            null,
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

/* CRIA UMA VISÃO DERIVADA DOS RELATÓRIOS DE ORIGEM */

function createOverallAnalysisData(
    receiptState,
    expeditionState,
    lossesRateState,
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

    const capacityUsed =
        expectedVolume;

    const capacityUsageRate =
        capacityUsed !== null
            ? capacityUsed /
                OVERALL_ANALYSIS_CAPACITY
            : null;

    const capacityBalance =
        capacityUsed !== null
            ? OVERALL_ANALYSIS_CAPACITY -
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

    return {
        cards: {
            capacity: {
                limit:
                    OVERALL_ANALYSIS_CAPACITY,

                used:
                    capacityUsed,

                usageRate:
                    capacityUsageRate,

                balance:
                    capacityBalance,
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
                expectedVolume,

            processed:
                receivedVolume,

            expedited:
                hasExpeditionData
                    ? expeditionSummary
                        .volumeChecked
                    : null,

            floor:
                floorVolume,
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
    };
}

export {
    createOverallAnalysisData,
    getOverallAnalysisPersonName,
};
