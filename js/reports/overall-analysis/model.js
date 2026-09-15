import {
    getReceiptSummary,
} from "../receipt/state.js";

import {
    getExpeditionOperatorRanking,
    getExpeditionSummary,
} from "../expedition/state.js";

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

    return {
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
