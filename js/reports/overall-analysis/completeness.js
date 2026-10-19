const PERIOD_KEYS = [
    "today", "yesterday", "dayBeforeYesterday", "days3to7",
    "days8to14", "days15toMonthStart", "totalMonth",
];

const OCCURRENCE_KEYS = [
    "hub", "soc", "underReview", "confirmedLosses", "returnedPackages",
];

function isQuantity(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

// A completude considera os campos exibidos na Análise Geral. Taxas sem
// denominador (por exemplo, nenhum pacote esperado no Parcel) são não aplicáveis.
function getOverallAnalysisMissingSections(data) {
    const requirements = [
        ["Identificação do turno", Boolean(data?.context?.analyst?.trim()) &&
            ["AM", "PM1", "PM2"].includes(data?.context?.window)],
        ["Planejamento e capacidade", isQuantity(data?.flow?.planned) &&
            isQuantity(data?.cards?.capacity?.used) && data?.cards?.capacity?.limit > 0],
        ["Processamento", ["expectedVolume", "receivedVolume", "totalErrors"]
            .every(key => isQuantity(data?.processing?.[key]))],
        ["Expedição", ["routesChecked", "volumeChecked", "floorVolume", "durationSeconds"]
            .every(key => isQuantity(data?.expedition?.[key]))],
        ["Avarias e perdas", PERIOD_KEYS.every(period => OCCURRENCE_KEYS.every(key =>
            isQuantity(data?.damageAndLosses?.traditionalAnalysis?.[period]?.[key])))],
        ["Taxa de perdas", isQuantity(data?.cards?.lossesRate?.rate)],
        ["Parcel Sweeper", data?.parcel?.hasData === true],
        ["Reversa", data?.reverse?.hasData === true],
    ];

    return requirements.filter(([, complete]) => !complete).map(([label]) => label);
}

function isOverallAnalysisComplete(data) {
    return getOverallAnalysisMissingSections(data).length === 0;
}

export { getOverallAnalysisMissingSections, isOverallAnalysisComplete };
