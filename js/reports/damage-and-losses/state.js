const DAMAGE_MONTH_NAMES =
    Object.freeze([
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
    ]);

const damageAndLossesStateListeners =
    new Set();

function normalizeDamageQuantity(
    value,
) {
    const numericValue =
        Number(value);

    return (
        Number.isSafeInteger(
            numericValue,
        ) &&
        numericValue >= 0
    )
        ? numericValue
        : 0;
}

function normalizeDamageDateKey(
    value,
) {
    const dateKey =
        String(value ?? "")
            .trim();

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            dateKey,
        )
    ) {
        return "";
    }

    const [
        year,
        month,
        day,
    ] = dateKey
        .split("-")
        .map(Number);

    const date =
        new Date(
            year,
            month - 1,
            day,
            12,
        );

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    )
        ? dateKey
        : "";
}

function createDamageDayRecord(
    values = {},
) {
    const date =
        normalizeDamageDateKey(
            values.date,
        );

    if (!date) {
        return null;
    }

    return {
        date,

        hub:
            normalizeDamageQuantity(
                values.hub,
            ),

        soc:
            normalizeDamageQuantity(
                values.soc,
            ),

        solid:
            normalizeDamageQuantity(
                values.solid,
            ),

        liquid:
            normalizeDamageQuantity(
                values.liquid,
            ),

        glass:
            normalizeDamageQuantity(
                values.glass,
            ),
    };
}

function createDamageSocStationRecord(
    values = {},
) {
    const name =
        String(values.name ?? "")
            .replace(/\s+/g, " ")
            .trim();

    if (!name) {
        return null;
    }

    const count =
        normalizeDamageQuantity(
            values.count,
        );

    return count > 0
        ? {
            name,
            count,
        }
        : null;
}

function createInitialDamageState() {
    const now = new Date();

    return {
        monthIndex:
            now.getMonth(),

        monthName:
            DAMAGE_MONTH_NAMES[
                now.getMonth()
            ],

        year:
            now.getFullYear(),

        sourceFileName: "",
        sourceSheetName: "",
        days: [],
        socStations: [],
    };
}

const damageAndLossesState =
    createInitialDamageState();

function getDamageAndLossesState() {
    return {
        monthIndex:
            damageAndLossesState
                .monthIndex,

        monthName:
            damageAndLossesState
                .monthName,

        year:
            damageAndLossesState
                .year,

        sourceFileName:
            damageAndLossesState
                .sourceFileName,

        sourceSheetName:
            damageAndLossesState
                .sourceSheetName,

        days:
            damageAndLossesState
                .days
                .map(
                    function (day) {
                        return {
                            ...day,
                        };
                    },
                ),

        socStations:
            damageAndLossesState
                .socStations
                .map(
                    function (station) {
                        return {
                            ...station,
                        };
                    },
                ),
    };
}

function notifyDamageAndLossesState(
    change,
) {
    const snapshot =
        getDamageAndLossesState();

    damageAndLossesStateListeners
        .forEach(
            function (listener) {
                listener(
                    snapshot,
                    change,
                );
            },
        );
}

function subscribeDamageAndLossesState(
    listener,
) {
    if (typeof listener !== "function") {
        return function () {};
    }

    damageAndLossesStateListeners.add(
        listener,
    );

    return function () {
        damageAndLossesStateListeners
            .delete(
                listener,
            );
    };
}

function replaceDamageAndLossesData(
    values = {},
) {
    if (
        !values ||
        typeof values !== "object" ||
        Array.isArray(values) ||
        !Array.isArray(values.days)
    ) {
        throw new TypeError(
            "Os dados de avarias são inválidos.",
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
            "O período das avarias é inválido.",
        );
    }

    const daysByDate =
        new Map();

    const socStationsByName =
        new Map();

    values.days.forEach(
        function (valuesForDay) {
            const day =
                createDamageDayRecord(
                    valuesForDay,
                );

            if (!day) {
                return;
            }

            const date =
                new Date(
                    `${day.date}T12:00:00`,
                );

            if (
                date.getMonth() !==
                    monthIndex ||
                date.getFullYear() !== year
            ) {
                return;
            }

            const current =
                daysByDate.get(
                    day.date,
                ) || {
                    date: day.date,
                    hub: 0,
                    soc: 0,
                    solid: 0,
                    liquid: 0,
                    glass: 0,
                };

            current.hub += day.hub;
            current.soc += day.soc;
            current.solid += day.solid;
            current.liquid += day.liquid;
            current.glass += day.glass;

            daysByDate.set(
                day.date,
                current,
            );
        },
    );

    const receivedSocStations =
        Array.isArray(
            values.socStations,
        )
            ? values.socStations
            : [];

    receivedSocStations.forEach(
        function (receivedStation) {
            const station =
                createDamageSocStationRecord(
                    receivedStation,
                );

            if (!station) {
                return;
            }

            const stationKey =
                station.name
                    .toLocaleLowerCase(
                        "pt-BR",
                    );

            const current =
                socStationsByName.get(
                    stationKey,
                );

            if (current) {
                current.count +=
                    station.count;
                return;
            }

            socStationsByName.set(
                stationKey,
                station,
            );
        },
    );

    damageAndLossesState.monthIndex =
        monthIndex;
    damageAndLossesState.monthName =
        DAMAGE_MONTH_NAMES[
            monthIndex
        ];
    damageAndLossesState.year =
        year;
    damageAndLossesState.sourceFileName =
        String(
            values.sourceFileName ?? "",
        ).trim();
    damageAndLossesState.sourceSheetName =
        String(
            values.sourceSheetName ?? "",
        ).trim();
    damageAndLossesState.days =
        Array.from(
            daysByDate.values(),
        ).sort(
            function (first, second) {
                return first.date.localeCompare(
                    second.date,
                );
            },
        );
    damageAndLossesState.socStations =
        Array.from(
            socStationsByName.values(),
        ).sort(
            function (first, second) {
                return second.count -
                    first.count ||
                    first.name.localeCompare(
                        second.name,
                        "pt-BR",
                    );
            },
        );

    notifyDamageAndLossesState({
        type: "damage-data-replaced",
    });

    return true;
}

function createDateKey(
    date,
) {
    return [
        date.getFullYear(),
        String(
            date.getMonth() + 1,
        ).padStart(2, "0"),
        String(
            date.getDate(),
        ).padStart(2, "0"),
    ].join("-");
}

function getDamageAndLossesSummary(
    state = getDamageAndLossesState(),
) {
    const days =
        Array.isArray(state.days)
            ? state.days
            : [];

    const hub =
        days.reduce(
            function (total, day) {
                return total +
                    normalizeDamageQuantity(
                        day.hub,
                    );
            },
            0,
        );

    const soc =
        days.reduce(
            function (total, day) {
                return total +
                    normalizeDamageQuantity(
                        day.soc,
                    );
            },
            0,
        );

    const solid =
        days.reduce(
            function (total, day) {
                return total +
                    normalizeDamageQuantity(
                        day.solid,
                    );
            },
            0,
        );

    const liquid =
        days.reduce(
            function (total, day) {
                return total +
                    normalizeDamageQuantity(
                        day.liquid,
                    );
            },
            0,
        );

    const glass =
        days.reduce(
            function (total, day) {
                return total +
                    normalizeDamageQuantity(
                        day.glass,
                    );
            },
            0,
        );

    const daysByDate =
        new Map(
            days.map(
                function (day) {
                    return [
                        day.date,
                        day,
                    ];
                },
            ),
        );

    const latestDay =
        days.length > 0
            ? days[days.length - 1]
            : null;

    const chartDays = [];

    if (latestDay) {
        const latestDate =
            new Date(
                `${latestDay.date}T12:00:00`,
            );

        for (
            let offset = 6;
            offset >= 0;
            offset -= 1
        ) {
            const date =
                new Date(latestDate);

            date.setDate(
                latestDate.getDate() -
                    offset,
            );

            const dateKey =
                createDateKey(date);

            const receivedDay =
                daysByDate.get(
                    dateKey,
                );

            chartDays.push({
                date: dateKey,

                hub:
                    receivedDay?.hub || 0,

                soc:
                    receivedDay?.soc || 0,
            });
        }
    }

    const chartTotal =
        chartDays.reduce(
            function (total, day) {
                return total +
                    day.hub +
                    day.soc;
            },
            0,
        );

    const socStations =
        (
            Array.isArray(
                state.socStations,
            )
                ? state.socStations
                : []
        )
            .map(
                createDamageSocStationRecord,
            )
            .filter(Boolean)
            .sort(
                function (first, second) {
                    return second.count -
                        first.count ||
                        first.name.localeCompare(
                            second.name,
                            "pt-BR",
                        );
                },
            );

    return {
        hasData:
            hub + soc > 0,

        total:
            hub + soc,

        hub,
        soc,
        solid,
        liquid,
        glass,

        compositionTotal:
            solid +
            liquid +
            glass,

        socStations,

        chartDays,

        dailyAverage:
            chartDays.length > 0
                ? chartTotal /
                    chartDays.length
                : 0,
    };
}

function restoreDamageAndLossesState(
    sessionState,
) {
    try {
        return replaceDamageAndLossesData(
            sessionState,
        );
    } catch (error) {
        return false;
    }
}

function resetDamageAndLossesState() {
    const initialState =
        createInitialDamageState();

    Object.assign(
        damageAndLossesState,
        initialState,
    );

    notifyDamageAndLossesState({
        type: "damage-report-reset",
    });

    return true;
}

export {
    DAMAGE_MONTH_NAMES,
    getDamageAndLossesState,
    getDamageAndLossesSummary,
    replaceDamageAndLossesData,
    resetDamageAndLossesState,
    restoreDamageAndLossesState,
    subscribeDamageAndLossesState,
};
