import { DAMAGE_MONTH_NAMES, getDamageAndLossesState, getDamageAndLossesSummary } from "./state.js";
import { getLossesState, getLossesSummary } from "./losses-state.js";
import { getLossesRateState, getLossesRateMonthSummary } from "../losses-rate/state.js";

const CONSOLIDATED_ANALYSIS_PERIODS = Object.freeze([
    "today", "yesterday", "dayBeforeYesterday", "days3to7",
    "days8to14", "days15toMonthStart", "totalMonth",
]);

function alignAnalysisDays(days, latestDate) {
    // Os dois históricos usam a mesma data de referência nos períodos relativos.
    return latestDate && !days.some(day => day.date === latestDate)
        ? [...days, { date: latestDate }]
        : days;
}

function getConsolidatedSummary(
    damageState = getDamageAndLossesState(),
    lossesState = getLossesState(),
    rateState = getLossesRateState(),
    referenceDate = new Date(),
) {
    const currentKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}-`;
    const hasCurrentRecords = [...damageState.days, ...lossesState.days]
        .some(day => day.date.startsWith(currentKey) &&
            (day.hub > 0 || day.soc > 0 || day.underReview > 0 || day.confirmedLosses > 0));
    const period = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 12);
    if (!hasCurrentRecords) period.setMonth(period.getMonth() - 1);
    const monthIndex = period.getMonth();
    const year = period.getFullYear();
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
    const damageDays = damageState.days.filter(day => day.date.startsWith(monthKey));
    const lossesDays = lossesState.days.filter(day => day.date.startsWith(monthKey));
    const latestDate = [...damageDays, ...lossesDays].map(day => day.date).sort().at(-1);
    const damage = getDamageAndLossesSummary({
        ...damageState, days: alignAnalysisDays(damageDays, latestDate),
    });
    const losses = getLossesSummary({
        ...lossesState, days: alignAnalysisDays(lossesDays, latestDate),
    });
    const hasDamageData = Boolean(damageState.sourceFileName || damageState.days.length || damageState.history?.length);
    const hasLossesData = Boolean(lossesState.sourceFileName || lossesState.days.length || lossesState.history?.length);
    const hasData = hasDamageData || hasLossesData;
    const rate = rateState.year === year
        ? getLossesRateMonthSummary(monthIndex, rateState)?.lossRate
        : null;

    const composition = [losses.underReview, losses.confirmedLosses, damage.hub, damage.soc];
    const traditionalAnalysis = Object.fromEntries(CONSOLIDATED_ANALYSIS_PERIODS.map(key => [key, {
        hub: damage.traditionalAnalysis?.[key]?.hub ?? 0,
        soc: damage.traditionalAnalysis?.[key]?.soc ?? 0,
        underReview: losses.traditionalAnalysis?.[key]?.underReview ?? 0,
        confirmedLosses: losses.traditionalAnalysis?.[key]?.confirmedLosses ?? 0,
    }]));
    return {
        hasData,
        monthIndex,
        monthName: DAMAGE_MONTH_NAMES[monthIndex],
        year,
        fallbackUsed: hasData && !hasCurrentRecords,
        hasDamageData,
        hasLossesData,
        hub: damage.hub,
        soc: damage.soc,
        underReview: losses.underReview,
        confirmedLosses: losses.confirmedLosses,
        lossRate: hasData ? rate ?? null : null,
        composition,
        traditionalAnalysis,
        total: composition.reduce((sum, value) => sum + value, 0),
    };
}

export { CONSOLIDATED_ANALYSIS_PERIODS, getConsolidatedSummary };
