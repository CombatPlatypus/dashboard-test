import {
    REVERSE_TYPE_KEYS,
} from "../reverse/model.js";

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

const overallAnalysisCompositionRateFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            maximumFractionDigits: 0,
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

const overallAnalysisTraditionalPeriodKeys =
    Object.freeze([
        "today",
        "yesterday",
        "dayBeforeYesterday",
        "days3to7",
        "days8to14",
        "days15toMonthStart",
        "totalMonth",
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

    const parcelAndReverseElements = {};

    [
        "ParcelScanned", "ParcelBacklog", "ParcelException", "ParcelMissorted",
        "ParcelCoverageScanned", "ParcelCoverageUnscanned",
        "ReverseReturn", "ReverseMissorted", "ReverseLiquidate", "ReverseConfiscated",
        "ReverseCompositionReturn", "ReverseCompositionMissorted",
        "ReverseCompositionLiquidate", "ReverseCompositionConfiscated",
    ].forEach(function (suffix) {
        parcelAndReverseElements[suffix] =
            getElement(`overallAnalysis${suffix}`);
    });

    return {
        ...parcelAndReverseElements,
        date:
            getElement(
                "overallAnalysisDate",
            ),

        window:
            getElement(
                "overallAnalysisWindow",
            ),

        analyst:
            getElement(
                "overallAnalysisAnalyst",
            ),

        damageSoc: getElement("overallAnalysisDamageSoc"),
        damageHub: getElement("overallAnalysisDamageHub"),
        packagesUnderReview: getElement("overallAnalysisPackagesUnderReview"),
        confirmedLosses: getElement("overallAnalysisConfirmedLosses"),

        lossRate:
            getElement(
                "overallAnalysisLossRate",
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

        flowStatus:
            getElement(
                "overallAnalysisFlowStatus",
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

        damageAndLossesTable:
            getElement(
                "overallAnalysisDamageAndLossesTable",
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

function renderOverallDamageAndLossesTable(
    tableElement,
    analysis,
) {
    tableElement
        .querySelectorAll(
            "[data-overall-damage-losses-field]",
        )
        .forEach(
            function (rowElement) {
                const field =
                    rowElement.dataset
                        .overallDamageLossesField;

                const cells =
                    rowElement.querySelectorAll(
                        "td",
                    );

                overallAnalysisTraditionalPeriodKeys
                    .forEach(
                        function (
                            periodKey,
                            index,
                        ) {
                            const cell =
                                cells[index];

                            if (!cell) {
                                return;
                            }

                            cell.textContent =
                                formatOverallAnalysisQuantity(
                                    analysis
                                        ?.traditionalAnalysis
                                        ?.[periodKey]
                                        ?.[field],
                                );
                        },
                    );
            },
        );
}

/* RENDERIZAÇÃO */

function renderOverallParcelAndReverse(
    elements,
    parcel,
    reverse,
) {
    [
        ["ParcelScanned", "scannedCount"],
        ["ParcelBacklog", "backlogCount"],
        ["ParcelException", "exceptionCount"],
        ["ParcelMissorted", "missortedCount"],
    ].forEach(function ([elementKey, field]) {
        elements[elementKey].textContent =
            formatOverallAnalysisQuantity(
                parcel.hasData ? parcel[field] : null,
            );
    });

    [
        ["ParcelCoverageScanned", "expectedScannedCount"],
        ["ParcelCoverageUnscanned", "expectedUnscannedCount"],
    ].forEach(function ([elementKey, field]) {
        elements[elementKey].textContent =
            formatOverallAnalysisRate(
                parcel.expectedTotalCount > 0
                    ? parcel[field] / parcel.expectedTotalCount
                    : null,
            );
    });

    REVERSE_TYPE_KEYS.forEach(function (typeKey) {
        const suffix =
            `${typeKey[0].toUpperCase()}${typeKey.slice(1)}`;
        const quantity = reverse.quantities[typeKey];

        elements[`Reverse${suffix}`].textContent =
            formatOverallAnalysisQuantity(
                reverse.hasData ? quantity : null,
            );

        elements[`ReverseComposition${suffix}`].textContent =
            reverse.hasData
                ? `${formatOverallAnalysisQuantity(quantity)} (${overallAnalysisCompositionRateFormatter.format(
                    reverse.total > 0 ? quantity / reverse.total : 0,
                )})`
                : "—";
    });
}

function renderOverallAnalysisView(
    data,
    elements = overallAnalysisViewElements,
    date = new Date(),
) {
    if (!elements) {
        return false;
    }

    elements.date.textContent =
        formatOverallAnalysisDate(date);

    elements.window.textContent =
        data.context?.window || "—";

    elements.analyst.textContent =
        data.context?.analyst || "—";

    elements.damageSoc.textContent = formatOverallAnalysisQuantity(data.cards.damage.soc);
    elements.damageHub.textContent = formatOverallAnalysisQuantity(data.cards.damage.hub);
    elements.packagesUnderReview.textContent = formatOverallAnalysisQuantity(data.cards.packagesAnalysis.value);
    elements.confirmedLosses.textContent = formatOverallAnalysisQuantity(data.cards.packagesAnalysis.confirmedLosses);

    elements.lossRate.textContent =
        formatOverallAnalysisLossRate(
            data.cards.lossesRate.rate,
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

    elements.flowStatus.textContent =
        data.flow.gap === null
            ? "—"
            : data.flow.gap === 0
                ? "Piso zerado"
                : (
                    `${formatOverallAnalysisQuantity(data.flow.planned)} Pacotes foram planejados para essa janela, ` +
                    `mas somente ${formatOverallAnalysisQuantity(data.flow.expedited)} foram expedidos, ` +
                    `temos um gap de ${formatOverallAnalysisQuantity(data.flow.gap)} ${data.flow.gap === 1 ? "pacote" : "pacotes"}.`
                );

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

    renderOverallDamageAndLossesTable(
        elements.damageAndLossesTable,
        data.damageAndLosses,
    );

    renderOverallParcelAndReverse(
        elements,
        data.parcel,
        data.reverse,
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
    getOverallAnalysisViewElements,
    initializeOverallAnalysisView,
    renderOverallAnalysisView,
};
