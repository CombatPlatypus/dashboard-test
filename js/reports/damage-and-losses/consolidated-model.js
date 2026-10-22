import { DAMAGE_MONTH_NAMES, getDamageAndLossesState, getDamageAndLossesSummary } from "./state.js";
import { getLossesState, getLossesSummary } from "./losses-state.js";
import { getLossesRateState, getLossesRateMonthSummary } from "../losses-rate/state.js";

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
    const damage = getDamageAndLossesSummary({
        ...damageState, days: damageState.days.filter(day => day.date.startsWith(monthKey)),
    });
    const losses = getLossesSummary({
        ...lossesState, days: lossesState.days.filter(day => day.date.startsWith(monthKey)),
    });
    const hasDamageData = Boolean(damageState.sourceFileName || damageState.days.length || damageState.history?.length);
    const hasLossesData = Boolean(lossesState.sourceFileName || lossesState.days.length || lossesState.history?.length);
    const hasData = hasDamageData || hasLossesData;
    const rate = rateState.year === year
        ? getLossesRateMonthSummary(monthIndex, rateState)?.lossRate
        : null;

    // A composição da planilha considera as avarias do Hub, sem as do SOC.
    const composition = [losses.underReview, losses.confirmedLosses, damage.hub];
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
        total: composition.reduce((sum, value) => sum + value, 0),
    };
}

export { getConsolidatedSummary };
