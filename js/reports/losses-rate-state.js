/* MESES DO RELATÓRIO */

const LOSSES_RATE_MONTHS =
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

/* CAMPOS ACEITOS */

const lossesRateIdentificationFields =
    new Set([
        "description",
        "hubCode",
        "subRegional",
    ]);

const lossesRateMonthFields =
    new Set([
        "moved",
        "possibleLosses",
        "lost",
        "damage",
    ]);

/* OUVINTES DO ESTADO */

const lossesRateStateListeners =
    new Set();

/* NORMALIZA UM TEXTO */

function normalizeLossesRateText(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(
        value,
    ).trim();
}

/* NORMALIZA UMA QUANTIDADE */

function normalizeLossesRateQuantity(
    value,
) {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value === "number"
    ) {
        return (
            Number.isSafeInteger(value) &&
            value >= 0
        )
            ? value
            : null;
    }

    const normalizedValue =
        String(value).trim();

    if (
        !/^\d+$/.test(
            normalizedValue,
        )
    ) {
        return null;
    }

    const numericValue =
        Number(normalizedValue);

    return Number.isSafeInteger(
        numericValue,
    )
        ? numericValue
        : null;
}

/* CRIA O REGISTRO DE UM MÊS */

function createLossesRateMonthRecord(
    values = {},
) {
    return {
        moved:
            normalizeLossesRateQuantity(
                values.moved,
            ),

        possibleLosses:
            normalizeLossesRateQuantity(
                values.possibleLosses,
            ),

        lost:
            normalizeLossesRateQuantity(
                values.lost,
            ),

        damage:
            normalizeLossesRateQuantity(
                values.damage,
            ),
    };
}

/* ESTADO DO RELATÓRIO */

const lossesRateState = {
    activeMonth:
        new Date().getMonth(),

    year:
        new Date().getFullYear(),

    identification: {
        description: "",
        hubCode: "",
        subRegional: "",
    },

    months:
        LOSSES_RATE_MONTHS.map(
            function () {
                return createLossesRateMonthRecord();
            },
        ),
};

/* VERIFICA O ÍNDICE DE UM MÊS */

function isValidLossesRateMonthIndex(
    monthIndex,
) {
    return (
        Number.isInteger(monthIndex) &&
        monthIndex >= 0 &&
        monthIndex < LOSSES_RATE_MONTHS.length
    );
}

/* CRIA UMA CÓPIA DO ESTADO */

function getLossesRateState() {
    return {
        activeMonth:
            lossesRateState.activeMonth,

        year:
            lossesRateState.year,

        identification: {
            ...lossesRateState.identification,
        },

        months:
            lossesRateState.months.map(
                function (month) {
                    return {
                        ...month,
                    };
                },
            ),
    };
}

/* NOTIFICA UMA ALTERAÇÃO NO ESTADO */

function notifyLossesRateState(
    change,
) {
    const stateSnapshot =
        getLossesRateState();

    lossesRateStateListeners.forEach(
        function (listener) {
            listener(
                stateSnapshot,
                change,
            );
        },
    );
}

/* ACOMPANHA ALTERAÇÕES NO ESTADO */

function subscribeLossesRateState(
    listener,
) {
    if (
        typeof listener !==
        "function"
    ) {
        return function () {};
    }

    lossesRateStateListeners.add(
        listener,
    );

    return function () {
        lossesRateStateListeners.delete(
            listener,
        );
    };
}

/* ALTERA O MÊS ATIVO */

function setActiveLossesRateMonth(
    monthIndex,
) {
    if (
        !isValidLossesRateMonthIndex(
            monthIndex,
        )
    ) {
        return false;
    }

    if (
        lossesRateState.activeMonth ===
        monthIndex
    ) {
        return true;
    }

    lossesRateState.activeMonth =
        monthIndex;

    notifyLossesRateState({
        type: "active-month-changed",
        monthIndex,
    });

    return true;
}

/* ATUALIZA UM CAMPO DE IDENTIFICAÇÃO */

function updateLossesRateIdentification(
    field,
    value,
) {
    if (
        !lossesRateIdentificationFields.has(
            field,
        )
    ) {
        return false;
    }

    const normalizedValue =
        normalizeLossesRateText(
            value,
        );

    if (
        lossesRateState
            .identification[field] ===
        normalizedValue
    ) {
        return true;
    }

    lossesRateState
        .identification[field] =
            normalizedValue;

    notifyLossesRateState({
        type: "identification-updated",
        field,
    });

    return true;
}

/* ATUALIZA UM CAMPO MENSAL */

function updateLossesRateMonthField(
    monthIndex,
    field,
    value,
) {
    if (
        !isValidLossesRateMonthIndex(
            monthIndex,
        ) ||
        !lossesRateMonthFields.has(
            field,
        )
    ) {
        return false;
    }

    const normalizedValue =
        normalizeLossesRateQuantity(
            value,
        );

    if (
        lossesRateState
            .months[monthIndex][field] ===
        normalizedValue
    ) {
        return true;
    }

    lossesRateState
        .months[monthIndex][field] =
            normalizedValue;

    notifyLossesRateState({
        type: "month-field-updated",
        monthIndex,
        field,
    });

    return true;
}

/* CALCULA OS RESULTADOS DE UM MÊS */

function getLossesRateMonthSummary(
    monthIndex =
        lossesRateState.activeMonth,
) {
    if (
        !isValidLossesRateMonthIndex(
            monthIndex,
        )
    ) {
        return null;
    }

    const month =
        lossesRateState.months[
            monthIndex
        ];

    const hasLosses =
        month.lost !== null ||
        month.damage !== null;

    const totalLosses =
        hasLosses
            ? (month.lost || 0) +
              (month.damage || 0)
            : null;

    const lossRate =
        month.moved !== null &&
        month.moved > 0 &&
        totalLosses !== null
            ? totalLosses /
              month.moved
            : null;

    return {
        ...month,
        totalLosses,
        lossRate,
    };
}

export {
    LOSSES_RATE_MONTHS,
    getLossesRateMonthSummary,
    getLossesRateState,
    setActiveLossesRateMonth,
    subscribeLossesRateState,
    updateLossesRateIdentification,
    updateLossesRateMonthField,
};