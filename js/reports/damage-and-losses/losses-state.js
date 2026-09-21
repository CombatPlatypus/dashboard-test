import {
    DAMAGE_MONTH_NAMES,
} from "./state.js";

const lossesStateListeners =
    new Set();

function normalizeLossesCount(value) {
    const numericValue =
        Number(value);

    return Number.isFinite(numericValue) &&
        numericValue >= 0
        ? Math.trunc(numericValue)
        : 0;
}

function normalizeLossesMoney(value) {
    const numericValue =
        Number(value);

    return Number.isFinite(numericValue) &&
        numericValue >= 0
        ? numericValue
        : 0;
}

function normalizeLossesDateKey(value) {
    const dateKey =
        String(value ?? "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        return "";
    }

    const [year, month, day] =
        dateKey.split("-").map(Number);

    const date =
        new Date(year, month - 1, day, 12);

    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
        ? dateKey
        : "";
}

function createLossesDayRecord(values = {}) {
    const date =
        normalizeLossesDateKey(values.date);

    if (!date) {
        return null;
    }

    return {
        date,
        underReview:
            normalizeLossesCount(values.underReview),
        confirmedLosses:
            normalizeLossesCount(values.confirmedLosses),
        savedAwaitingTicket:
            normalizeLossesCount(values.savedAwaitingTicket),
        emptyAwaitingTicket:
            normalizeLossesCount(values.emptyAwaitingTicket),
        recoveryYes:
            normalizeLossesCount(values.recoveryYes),
        recoveryNo:
            normalizeLossesCount(values.recoveryNo),
        recoveryUnknown:
            normalizeLossesCount(values.recoveryUnknown),
        confirmedValue:
            normalizeLossesMoney(values.confirmedValue),
        underReviewValue:
            normalizeLossesMoney(values.underReviewValue),
        confirmedValueRecords:
            normalizeLossesCount(values.confirmedValueRecords),
        underReviewValueRecords:
            normalizeLossesCount(values.underReviewValueRecords),
    };
}

function createInitialLossesState() {
    const now = new Date();

    return {
        monthIndex: now.getMonth(),
        monthName:
            DAMAGE_MONTH_NAMES[now.getMonth()],
        year: now.getFullYear(),
        sourceFileName: "",
        sourceSheetName: "",
        days: [],
    };
}

const lossesState =
    createInitialLossesState();

function getLossesState() {
    return {
        monthIndex: lossesState.monthIndex,
        monthName: lossesState.monthName,
        year: lossesState.year,
        sourceFileName:
            lossesState.sourceFileName,
        sourceSheetName:
            lossesState.sourceSheetName,
        days: lossesState.days.map(
            function (day) {
                return { ...day };
            },
        ),
    };
}

function notifyLossesState(change) {
    const snapshot =
        getLossesState();

    lossesStateListeners.forEach(
        function (listener) {
            listener(snapshot, change);
        },
    );
}

function subscribeLossesState(listener) {
    if (typeof listener !== "function") {
        return function () {};
    }

    lossesStateListeners.add(listener);

    return function () {
        lossesStateListeners.delete(listener);
    };
}

function replaceLossesData(values = {}) {
    if (
        !values ||
        typeof values !== "object" ||
        Array.isArray(values) ||
        !Array.isArray(values.days)
    ) {
        throw new TypeError(
            "Os dados de perdas são inválidos.",
        );
    }

    const monthIndex =
        Number(values.monthIndex);
    const year =
        Number(values.year);

    if (
        !Number.isInteger(monthIndex) ||
        monthIndex < 0 ||
        monthIndex > 11 ||
        !Number.isInteger(year) ||
        year < 2000
    ) {
        throw new TypeError(
            "O período das perdas é inválido.",
        );
    }

    const daysByDate =
        new Map();

    values.days.forEach(
        function (receivedDay) {
            const day =
                createLossesDayRecord(receivedDay);

            if (!day) {
                return;
            }

            const date =
                new Date(`${day.date}T12:00:00`);

            if (
                date.getMonth() !== monthIndex ||
                date.getFullYear() !== year
            ) {
                return;
            }

            const current =
                daysByDate.get(day.date) ||
                createLossesDayRecord({
                    date: day.date,
                });

            Object.keys(day).forEach(
                function (field) {
                    if (field !== "date") {
                        current[field] += day[field];
                    }
                },
            );

            daysByDate.set(day.date, current);
        },
    );

    lossesState.monthIndex = monthIndex;
    lossesState.monthName =
        DAMAGE_MONTH_NAMES[monthIndex];
    lossesState.year = year;
    lossesState.sourceFileName =
        String(values.sourceFileName ?? "").trim();
    lossesState.sourceSheetName =
        String(values.sourceSheetName ?? "").trim();
    lossesState.days =
        Array.from(daysByDate.values()).sort(
            function (first, second) {
                return first.date.localeCompare(
                    second.date,
                );
            },
        );

    notifyLossesState({
        type: "losses-data-replaced",
    });

    return true;
}

function createLossesDateKey(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function createLossesDateRange(
    daysByDate,
    startDate,
    endDate,
) {
    if (
        !(startDate instanceof Date) ||
        !(endDate instanceof Date) ||
        startDate > endDate
    ) {
        return [];
    }

    const days = [];
    const currentDate =
        new Date(startDate);

    while (currentDate <= endDate) {
        const dateKey =
            createLossesDateKey(currentDate);

        days.push(
            createLossesDayRecord(
                daysByDate.get(dateKey) || {
                    date: dateKey,
                },
            ),
        );

        currentDate.setDate(
            currentDate.getDate() + 1,
        );
    }

    return days;
}

function createLossesMetrics(days) {
    const metrics = {
        underReview: 0,
        confirmedLosses: 0,
        savedAwaitingTicket: 0,
        emptyAwaitingTicket: 0,
        recoveryYes: 0,
        recoveryNo: 0,
        recoveryUnknown: 0,
        confirmedValue: 0,
        underReviewValue: 0,
        confirmedValueRecords: 0,
        underReviewValueRecords: 0,
    };

    (Array.isArray(days) ? days : [])
        .forEach(
            function (day) {
                metrics.underReview +=
                    normalizeLossesCount(day.underReview);
                metrics.confirmedLosses +=
                    normalizeLossesCount(day.confirmedLosses);
                metrics.savedAwaitingTicket +=
                    normalizeLossesCount(day.savedAwaitingTicket);
                metrics.emptyAwaitingTicket +=
                    normalizeLossesCount(day.emptyAwaitingTicket);
                metrics.recoveryYes +=
                    normalizeLossesCount(day.recoveryYes);
                metrics.recoveryNo +=
                    normalizeLossesCount(day.recoveryNo);
                metrics.recoveryUnknown +=
                    normalizeLossesCount(day.recoveryUnknown);
                metrics.confirmedValue +=
                    normalizeLossesMoney(day.confirmedValue);
                metrics.underReviewValue +=
                    normalizeLossesMoney(day.underReviewValue);
                metrics.confirmedValueRecords +=
                    normalizeLossesCount(day.confirmedValueRecords);
                metrics.underReviewValueRecords +=
                    normalizeLossesCount(day.underReviewValueRecords);
            },
        );

    metrics.total =
        metrics.underReview +
        metrics.confirmedLosses;
    metrics.packRecoveryTotal =
        metrics.recoveryYes +
        metrics.recoveryNo +
        metrics.recoveryUnknown;
    metrics.valueCompositionTotal =
        metrics.confirmedValue +
        metrics.underReviewValue;
    metrics.informedValueRecords =
        metrics.confirmedValueRecords +
        metrics.underReviewValueRecords;

    return metrics;
}

function createLossesChartPeriod(
    id,
    title,
    daysByDate,
    startDate,
    endDate,
) {
    const days =
        createLossesDateRange(
            daysByDate,
            startDate,
            endDate,
        );

    const metrics =
        createLossesMetrics(days);

    return {
        id,
        title,
        days,
        ...metrics,
        dailyAverage:
            days.length > 0
                ? metrics.total / days.length
                : 0,
    };
}

function getLossesSummary(
    state = getLossesState(),
) {
    const days =
        Array.isArray(state.days)
            ? state.days
                .map(createLossesDayRecord)
                .filter(Boolean)
                .sort(
                    function (first, second) {
                        return first.date.localeCompare(
                            second.date,
                        );
                    },
                )
            : [];

    const monthMetrics =
        createLossesMetrics(days);
    const daysByDate =
        new Map(
            days.map(
                function (day) {
                    return [day.date, day];
                },
            ),
        );
    const latestDay =
        days.length > 0
            ? days[days.length - 1]
            : null;
    const chartPeriods = [];
    let traditionalAnalysis = null;

    if (latestDay) {
        const latestDate =
            new Date(`${latestDay.date}T12:00:00`);
        const monthStart =
            new Date(
                latestDate.getFullYear(),
                latestDate.getMonth(),
                1,
                12,
            );
        const createOffsetDate =
            function (offset) {
                const date = new Date(latestDate);
                date.setDate(latestDate.getDate() - offset);
                return date;
            };
        const clampToMonthStart =
            function (date) {
                return date < monthStart
                    ? new Date(monthStart)
                    : date;
            };

        chartPeriods.push(
            createLossesChartPeriod(
                "last7",
                "Últimos 7 Dias",
                daysByDate,
                clampToMonthStart(createOffsetDate(6)),
                latestDate,
            ),
            createLossesChartPeriod(
                "days8to14",
                "De 8 a 14 Dias Atrás",
                daysByDate,
                clampToMonthStart(createOffsetDate(13)),
                createOffsetDate(7),
            ),
            createLossesChartPeriod(
                "monthStart",
                "De 15 Dias Atrás Até o Começo do Mês",
                daysByDate,
                monthStart,
                createOffsetDate(14),
            ),
            createLossesChartPeriod(
                "totalMonth",
                "Total do Mês",
                daysByDate,
                monthStart,
                latestDate,
            ),
        );

        const createTraditionalMetrics =
            function (startDate, endDate) {
                return createLossesMetrics(
                    createLossesDateRange(
                        daysByDate,
                        clampToMonthStart(startDate),
                        endDate,
                    ),
                );
            };

        traditionalAnalysis = {
            today:
                createTraditionalMetrics(
                    latestDate,
                    latestDate,
                ),
            yesterday:
                createTraditionalMetrics(
                    createOffsetDate(1),
                    createOffsetDate(1),
                ),
            dayBeforeYesterday:
                createTraditionalMetrics(
                    createOffsetDate(2),
                    createOffsetDate(2),
                ),
            days3to7:
                createTraditionalMetrics(
                    createOffsetDate(7),
                    createOffsetDate(3),
                ),
            days8to14:
                createTraditionalMetrics(
                    createOffsetDate(14),
                    createOffsetDate(8),
                ),
            days15toMonthStart:
                createTraditionalMetrics(
                    monthStart,
                    createOffsetDate(15),
                ),
            totalMonth: monthMetrics,
        };
    }

    return {
        hasData: monthMetrics.total > 0,
        ...monthMetrics,
        estimatedLoss:
            monthMetrics.confirmedValue,
        chartDays:
            chartPeriods[0]?.days || [],
        chartPeriods,
        traditionalAnalysis,
        dailyAverage:
            chartPeriods[0]?.dailyAverage || 0,
    };
}

function restoreLossesState(sessionState) {
    try {
        return replaceLossesData(sessionState);
    } catch (error) {
        return false;
    }
}

function resetLossesState() {
    Object.assign(
        lossesState,
        createInitialLossesState(),
    );

    notifyLossesState({
        type: "losses-report-reset",
    });

    return true;
}

export {
    getLossesState,
    getLossesSummary,
    replaceLossesData,
    resetLossesState,
    restoreLossesState,
    subscribeLossesState,
};
