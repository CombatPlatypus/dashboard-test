const overallAnalysisNumberFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

const overallAnalysisRateFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

const overallAnalysisCapacityRateFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        },
    );

const overallAnalysisLossRateFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        },
    );

const overallAnalysisPercentagePointFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        },
    );

const overallAnalysisWeekdays =
    Object.freeze([
        "Domingo",
        "Segunda Feira",
        "Terça Feira",
        "Quarta Feira",
        "Quinta Feira",
        "Sexta Feira",
        "Sábado",
    ]);

let overallAnalysisViewElements =
    null;

let overallAnalysisDateTimer =
    null;

/* FORMATAÇÕES */

function formatOverallAnalysisQuantity(
    value,
) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value),
        )
    ) {
        return "—";
    }

    return overallAnalysisNumberFormatter
        .format(
            Number(value),
        );
}

function formatOverallAnalysisRate(
    value,
) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value),
        )
    ) {
        return "—";
    }

    return overallAnalysisRateFormatter
        .format(
            Number(value),
        );
}

function formatOverallAnalysisCapacityRate(
    value,
) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value),
        )
    ) {
        return "—";
    }

    return overallAnalysisCapacityRateFormatter
        .format(
            Number(value),
        );
}

function formatOverallAnalysisLossRate(
    value,
) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value),
        )
    ) {
        return "—";
    }

    return overallAnalysisLossRateFormatter
        .format(
            Number(value),
        );
}

function formatOverallAnalysisPercentagePoints(
    value,
) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value),
        )
    ) {
        return "—";
    }

    return overallAnalysisPercentagePointFormatter
        .format(
            Number(value),
        );
}

function formatOverallAnalysisDuration(
    value,
) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value),
        )
    ) {
        return "—";
    }

    const totalSeconds =
        Math.max(
            Math.round(
                Number(value),
            ),
            0,
        );

    const hours =
        Math.floor(
            totalSeconds / 3600,
        );

    const minutes =
        Math.floor(
            (
                totalSeconds % 3600
            ) / 60,
        );

    const seconds =
        totalSeconds % 60;

    const formattedMinutes =
        String(minutes).padStart(
            2,
            "0",
        );

    const formattedSeconds =
        String(seconds).padStart(
            2,
            "0",
        );

    if (hours === 0) {
        return (
            `${formattedMinutes}:` +
            formattedSeconds
        );
    }

    return (
        `${String(hours).padStart(
            2,
            "0",
        )}:` +
        `${formattedMinutes}:` +
        formattedSeconds
    );
}

function formatOverallAnalysisDate(
    date = new Date(),
) {
    const day =
        String(date.getDate())
            .padStart(
                2,
                "0",
            );

    const month =
        String(
            date.getMonth() + 1,
        ).padStart(
            2,
            "0",
        );

    return (
        `Dia ${day} / ${month} / ` +
        `${date.getFullYear()} - ` +
        overallAnalysisWeekdays[
            date.getDay()
        ]
    );
}

/* ELEMENTOS */

function getOverallAnalysisViewElements(
    rootElement,
) {
    const getElement =
        function (id) {
            return rootElement.querySelector(
                `#${id}`,
            );
        };

    return {
        date:
            getElement(
                "overallAnalysisDate",
            ),

        capacityUsage:
            getElement(
                "overallAnalysisCapacityUsage",
            ),

        capacityStatus:
            getElement(
                "overallAnalysisCapacityStatus",
            ),

        lossRate:
            getElement(
                "overallAnalysisLossRate",
            ),

        lossRateStatus:
            getElement(
                "overallAnalysisLossRateStatus",
            ),

        planned:
            getElement(
                "overallAnalysisPlanned",
            ),

        processed:
            getElement(
                "overallAnalysisProcessed",
            ),

        expedited:
            getElement(
                "overallAnalysisExpedited",
            ),

        floor:
            getElement(
                "overallAnalysisFloor",
            ),

        fastestReceiver:
            getElement(
                "overallAnalysisFastestReceiver",
            ),

        mostPackages:
            getElement(
                "overallAnalysisMostPackages",
            ),

        fastestChecker:
            getElement(
                "overallAnalysisFastestChecker",
            ),

        mostRoutesChecker:
            getElement(
                "overallAnalysisMostRoutesChecker",
            ),

        expectedVolume:
            getElement(
                "overallAnalysisExpectedVolume",
            ),

        receivedVolume:
            getElement(
                "overallAnalysisReceivedVolume",
            ),

        receiptErrors:
            getElement(
                "overallAnalysisReceiptErrors",
            ),

        receiptErrorRate:
            getElement(
                "overallAnalysisReceiptErrorRate",
            ),

        routesChecked:
            getElement(
                "overallAnalysisRoutesChecked",
            ),

        volumeChecked:
            getElement(
                "overallAnalysisVolumeChecked",
            ),

        floorVolume:
            getElement(
                "overallAnalysisFloorVolume",
            ),

        expeditionTime:
            getElement(
                "overallAnalysisExpeditionTime",
            ),
    };
}

function hasOverallAnalysisViewElements(
    elements,
) {
    return Object.values(
        elements,
    ).every(
        function (element) {
            return element instanceof
                HTMLElement;
        },
    );
}

/* DATA DO RELATÓRIO */

function renderOverallAnalysisDate() {
    if (!overallAnalysisViewElements) {
        return;
    }

    overallAnalysisViewElements
        .date
        .textContent =
            formatOverallAnalysisDate();
}

function scheduleOverallAnalysisDateUpdate() {
    if (
        overallAnalysisDateTimer !==
        null
    ) {
        window.clearTimeout(
            overallAnalysisDateTimer,
        );
    }

    const now = new Date();

    const nextDay =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
        );

    overallAnalysisDateTimer =
        window.setTimeout(
            function () {
                renderOverallAnalysisDate();
                scheduleOverallAnalysisDateUpdate();
            },
            nextDay.getTime() -
                now.getTime() +
                1000,
        );
}

/* RENDERIZAÇÃO */

function renderOverallAnalysisView(
    data,
) {
    if (!overallAnalysisViewElements) {
        return false;
    }

    const elements =
        overallAnalysisViewElements;

    renderOverallAnalysisDate();

    elements.capacityUsage.textContent =
        formatOverallAnalysisCapacityRate(
            data.cards.capacity.usageRate,
        );

    if (
        data.cards.capacity.balance ===
        null
    ) {
        elements.capacityStatus.textContent =
            "Folga de — Pacotes";
    } else if (
        data.cards.capacity.balance >= 0
    ) {
        elements.capacityStatus.textContent =
            "Folga de " +
            formatOverallAnalysisQuantity(
                data.cards.capacity.balance,
            ) +
            " Pacotes";
    } else {
        elements.capacityStatus.textContent =
            "Excesso de " +
            formatOverallAnalysisQuantity(
                Math.abs(
                    data.cards.capacity.balance,
                ),
            ) +
            " Pacotes";
    }

    elements.lossRate.textContent =
        formatOverallAnalysisLossRate(
            data.cards.lossesRate.rate,
        );

    elements.lossRateStatus.textContent =
        data.cards.lossesRate.rate ===
            null
            ? "—"
            : (
                formatOverallAnalysisPercentagePoints(
                    data.cards.lossesRate
                        .differencePercentagePoints,
                ) +
                " p.p " +
                (
                    data.cards.lossesRate
                        .withinLimit
                        ? "Abaixo"
                        : "Acima"
                ) +
                " do Limite"
            );

    elements.planned.textContent =
        formatOverallAnalysisQuantity(
            data.flow.planned,
        );

    elements.processed.textContent =
        formatOverallAnalysisQuantity(
            data.flow.processed,
        );

    elements.expedited.textContent =
        formatOverallAnalysisQuantity(
            data.flow.expedited,
        );

    elements.floor.textContent =
        formatOverallAnalysisQuantity(
            data.flow.floor,
        );

    elements.fastestReceiver.textContent =
        data.highlights.fastestReceiver ||
        "—";

    elements.mostPackages.textContent =
        data.highlights.mostPackages !==
            null
            ? (
                formatOverallAnalysisQuantity(
                    data.highlights
                        .mostPackages,
                ) +
                " Pacotes"
            )
            : "—";

    elements.fastestChecker.textContent =
        data.highlights.fastestChecker ||
        "—";

    elements.mostRoutesChecker.textContent =
        data.highlights
            .mostRoutesChecker ||
        "—";

    elements.expectedVolume.textContent =
        formatOverallAnalysisQuantity(
            data.processing.expectedVolume,
        );

    elements.receivedVolume.textContent =
        formatOverallAnalysisQuantity(
            data.processing.receivedVolume,
        );

    elements.receiptErrors.textContent =
        formatOverallAnalysisQuantity(
            data.processing.totalErrors,
        );

    elements.receiptErrorRate.textContent =
        formatOverallAnalysisRate(
            data.processing.errorRate,
        );

    elements.routesChecked.textContent =
        formatOverallAnalysisQuantity(
            data.expedition.routesChecked,
        );

    elements.volumeChecked.textContent =
        formatOverallAnalysisQuantity(
            data.expedition.volumeChecked,
        );

    elements.floorVolume.textContent =
        formatOverallAnalysisQuantity(
            data.expedition.floorVolume,
        );

    elements.expeditionTime.textContent =
        formatOverallAnalysisDuration(
            data.expedition.durationSeconds,
        );

    return true;
}

function initializeOverallAnalysisView(
    rootElement,
) {
    const elements =
        getOverallAnalysisViewElements(
            rootElement,
        );

    if (
        !hasOverallAnalysisViewElements(
            elements,
        )
    ) {
        console.error(
            "Os elementos da Análise Geral não foram encontrados.",
        );

        return false;
    }

    overallAnalysisViewElements =
        elements;

    renderOverallAnalysisDate();
    scheduleOverallAnalysisDateUpdate();

    return true;
}

export {
    formatOverallAnalysisDate,
    formatOverallAnalysisDuration,
    formatOverallAnalysisQuantity,
    initializeOverallAnalysisView,
    renderOverallAnalysisView,
};
