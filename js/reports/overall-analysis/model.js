import {
    getReceiptSummary,
} from "../receipt/state.js";

import {
    createExpeditionDerivations,
} from "../expedition/state.js";

import {
    getLossesRateChartData,
    getLossesRateMonthSummary,
} from "../losses-rate/state.js";

import {
    getDamageAndLossesSummary,
} from "../damage-and-losses/state.js";

import {
    getLossesSummary,
} from "../damage-and-losses/losses-state.js";

import { getConsolidatedSummary } from "../damage-and-losses/consolidated-model.js";

import {
    getParcelStateSummary,
} from "../parcel-sweeper/state.js";

import {
    getReverseStateTotals,
} from "../reverse/state.js";

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

function createOverallAnalysisContext(reportContext) {
    return {
        window: String(reportContext.window ?? "").trim(),
        analyst: String(reportContext.analyst ?? "").trim(),
        plannedVolume: getOverallAnalysisContextQuantity(reportContext.plannedVolume),
        collaboratorCount: getOverallAnalysisContextQuantity(reportContext.collaboratorCount),
        shiftCapacity: getOverallAnalysisContextQuantity(reportContext.shiftCapacity),
    };
}

function getOverallAnalysisGap(expected, actual) {
    return expected !== null && actual !== null ? Math.max(expected - actual, 0) : null;
}

function getOverallAnalysisCapacity({ plannedVolume, shiftCapacity }) {
    const limit = shiftCapacity > 0 ? shiftCapacity : OVERALL_ANALYSIS_CAPACITY;
    return {
        limit,
        used: plannedVolume,
        usageRate: plannedVolume === null ? null : plannedVolume / limit,
        balance: plannedVolume === null ? null : limit - plannedVolume,
    };
}

function updateOverallAnalysisContext(data, reportContext) {
    const context = createOverallAnalysisContext(reportContext);
    if (Object.keys(context).every(field => context[field] === data.context[field])) {
        return data;
    }

    const updatedData = { ...data, context };
    const plannedVolumeChanged = context.plannedVolume !== data.context.plannedVolume;
    if (plannedVolumeChanged) {
        const planned = context.plannedVolume;
        const gap = getOverallAnalysisGap(planned, data.flow.expedited);
        updatedData.flow = { ...data.flow, planned, gap, floor: gap };
        updatedData.processing = {
            ...data.processing,
            expectedVolume: planned,
            gap: getOverallAnalysisGap(planned, data.processing.receivedVolume),
        };
    }

    if (plannedVolumeChanged || context.shiftCapacity !== data.context.shiftCapacity) {
        updatedData.cards = { ...data.cards, capacity: getOverallAnalysisCapacity(context) };
    }
    return updatedData;
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
        damageSummary.hasData ||
        Boolean(damageSummary.traditionalAnalysis &&
            damageState?.days?.some(day =>
                Number.isFinite(day.hub) || Number.isFinite(day.soc)));

    const lossesHasData =
        lossesSummary.hasData ||
        Boolean(lossesSummary.traditionalAnalysis &&
            lossesState?.days?.some(day =>
                Number.isFinite(day.underReview) || Number.isFinite(day.confirmedLosses)));

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

function getOverallProcessing(state) {
    const { receivedVolume, totalErrors } = getReceiptSummary(state);
    const expectedVolume = state?.expectedVolume ?? null;

    return {
        expectedVolume,
        receivedVolume,
        totalErrors,
        errorRate: totalErrors !== null && receivedVolume > 0
            ? totalErrors / receivedVolume
            : null,
        gap: getOverallAnalysisGap(expectedVolume, receivedVolume),
    };
}

function getOverallExpedition(summary) {
    return {
        routesChecked: summary.hasData ? summary.validatedRoutes : null,
        volumeChecked: summary.hasData ? summary.volumeChecked : null,
        floorVolume: summary.floorVolume,
        durationSeconds: summary.expeditionDurationSeconds,
    };
}

function getOverallExpeditionErrors(errors, streets) {
    return {
        sortingErrors: errors.sortingErrors,
        labelingErrors: errors.labelingErrors,
        totalErrors: errors.totalErrors,
        errorRate: errors.errorRate,
        totalRevertedErrors: errors.totalRevertedErrors,
        revertedRate: errors.revertedRate,
        finalErrors: errors.finalErrors,
        finalRate: errors.finalRate,
        streets,
    };
}

function getOverallOccurrenceCards(analysis) {
    const { packagesUnderReview, lossesTotal, traditionalAnalysis, damageHasData } = analysis;
    const { confirmedLosses, hub, soc } = traditionalAnalysis.totalMonth;
    return {
        packagesAnalysis: {
            value: packagesUnderReview,
            total: lossesTotal,
            rate: packagesUnderReview !== null && lossesTotal !== null
                ? (lossesTotal === 0 ? 0 : packagesUnderReview / lossesTotal)
                : null,
            confirmedLosses,
        },
        damage: { hub, soc, total: damageHasData ? hub + soc : null },
    };
}

function getOverallLossesRateCard(state, referenceDate) {
    const summary = state?.year === referenceDate.getFullYear()
        ? getLossesRateMonthSummary(referenceDate.getMonth(), state)
        : null;
    const rate = summary?.lossRate ?? null;

    return {
        moved: summary?.moved ?? null,
        totalLosses: summary?.totalLosses ?? null,
        rate,
        limit: OVERALL_ANALYSIS_LOSS_RATE_LIMIT,
        differencePercentagePoints: rate === null ? null : Math.abs(OVERALL_ANALYSIS_LOSS_RATE_LIMIT - rate) * 100,
        withinLimit: rate === null ? null : rate <= OVERALL_ANALYSIS_LOSS_RATE_LIMIT,
    };
}

function getOverallParcel(state) {
    const summary = getParcelStateSummary(state ?? {});
    return {
        hasData: summary.hasData,
        scannedCount: summary.scannedCount,
        backlogCount: summary.backlogCount,
        exceptionCount: summary.exceptionCount,
        missortedCount: summary.missortedCount,
        expectedTotalCount: summary.expectedTotalCount,
        expectedScannedCount: summary.expectedScannedCount,
        expectedUnscannedCount: summary.expectedUnscannedCount,
    };
}

function getOverallReverse(state) {
    return getReverseStateTotals(state ?? {});
}

/* ATUALIZA AS SEÇÕES QUE CONSOMEM AS FONTES ALTERADAS */

function updateOverallAnalysisSources(data, sources, referenceDate = new Date()) {
    const next = { ...data };
    if ("receipt" in sources) {
        next.processing = getOverallProcessing(sources.receipt);
    }
    if (sources.expeditionSummary || sources.expeditionErrors) {
        const derived = sources.expeditionDerived ?? createExpeditionDerivations(sources.expedition);
        const streets = sources.expeditionSummary
            ? derived.getStreets().map(({ name, missingOrders, totalErrors, errorRate }) => ({ name, missingOrders, totalErrors, errorRate }))
            : data.expeditionErrors.streets;
        next.expeditionErrors = getOverallExpeditionErrors(derived.getErrors(), streets);
        if (sources.expeditionSummary) {
            next.expedition = getOverallExpedition(derived.getSummary());
        }
    }
    if (sources.expeditionFloor && !sources.expeditionSummary) {
        next.expedition = { ...data.expedition, floorVolume: sources.expedition.floorVolume };
    }
    if (next.processing?.receivedVolume !== data.flow.processed ||
        next.expedition?.volumeChecked !== data.flow.expedited) {
        const { planned } = data.flow;
        const processed = next.processing.receivedVolume;
        const expedited = next.expedition.volumeChecked;
        const gap = getOverallAnalysisGap(planned, expedited);
        next.flow = { planned, processed, expedited, floor: gap, gap };
    }

    if (sources.occurrences) {
        const { damage, losses } = sources.occurrences;
        const analysis = getOverallDamageAndLossesAnalysis(damage, losses);
        const { composition, total, hasData, hasDamageData, hasLossesData, monthIndex, monthName, year } =
            getConsolidatedSummary(damage, losses, null, referenceDate);
        next.damageAndLosses = analysis;
        next.damageAndLossesComposition = { composition, total, hasData, hasDamageData, hasLossesData, monthIndex, monthName, year };
        next.cards = { ...data.cards, ...getOverallOccurrenceCards(analysis) };
    }
    if ("lossesRate" in sources) {
        const rate = sources.lossesRate;
        const { monthlyRates } = getLossesRateChartData(rate);
        next.cards = { ...next.cards, lossesRate: getOverallLossesRateCard(rate, referenceDate) };
        next.lossesRateHistory = { monthlyRates, year: rate?.year ?? null, activeMonth: null };
    }
    if (sources.occurrences || "lossesRate" in sources) {
        const { hasData, monthIndex, year } = next.damageAndLossesComposition;
        const history = next.lossesRateHistory;
        const activeMonth = hasData && history.year === year ? monthIndex : null;
        if (history.activeMonth !== activeMonth) {
            next.lossesRateHistory = { ...history, activeMonth };
        }
    }

    if ("parcel" in sources) {
        next.parcel = getOverallParcel(sources.parcel);
    }
    if ("reverse" in sources) {
        next.reverse = getOverallReverse(sources.reverse);
    }
    return next;
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
    referenceDate = new Date(),
) {
    const context = createOverallAnalysisContext(reportContext);
    return updateOverallAnalysisSources({
        context,
        cards: { capacity: getOverallAnalysisCapacity(context) },
        flow: { planned: context.plannedVolume },
    }, {
        receipt: receiptState,
        expedition: expeditionState,
        expeditionSummary: true,
        occurrences: { damage: damageState, losses: lossesState },
        lossesRate: lossesRateState,
        parcel: parcelState,
        reverse: reverseState,
    }, referenceDate);
}

export {
    createOverallAnalysisData,
    updateOverallAnalysisContext,
    updateOverallAnalysisSources,
};
