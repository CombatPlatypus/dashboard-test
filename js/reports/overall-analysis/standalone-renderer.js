import { CHART_COLORS, CHART_TEXT_COLOR, CHART_VALUE_FONT, getChartEmptyColor } from "../../charts/theme.js";
import { createDashboardChart } from "../../charts/standard.js";
import { getHorizontalBarLabelPosition } from "../core/horizontal-bars-3d.js";
import { DOUGHNUT_3D_PADDING, drawDoughnut3D, drawDoughnut3DCenterText } from "../core/doughnut-3d.js";
import { REVERSE_TYPE_KEYS, REVERSE_TYPE_DEFINITIONS } from "../reverse/model.js";
import { getOverallAnalysisViewElements, renderOverallAnalysisView, formatOverallAnalysisQuantity } from "./view.js";

// O modelo mantém seus próprios IDs; as mesmas regras da Análise Geral
// preenchem os campos por este adaptador, sem alterar os IDs do documento.
const FIELD_IDS = {
    Date: "Date", Window: "Window", Analyst: "WindowAnalyst",
    PackagesAnalysisValue: "PackagesValue", PackagesAnalysisStatus: "PackagesStatus",
    DamageAndLossesTable: "-LossesTable",
    ParcelCoverageScanned: "-ParcelCoverageScanned",
    ParcelCoverageUnscanned: "-ParcelCoverageUnscanned",
    ReverseCompositionReturn: "-ReverseReturn",
    ReverseCompositionMissorted: "-ReverseMissorted",
    ReverseCompositionLiquidate: "-ReverseLiquidate",
    ReverseCompositionConfiscated: "-ReverseConfiscated",
};

function fillStandaloneFields(data, snapshot, root) {
    const adapter = {
        querySelector(selector) {
            const suffix = selector.replace(/^#overallAnalysis/, "");
            return root.querySelector(`#finalReport${FIELD_IDS[suffix] ?? suffix}`);
        },
    };
    const elements = getOverallAnalysisViewElements(adapter);
    if (Object.values(elements).some(element => !element)) {
        throw new Error("Um dos campos do modelo não foi encontrado.");
    }
    renderOverallAnalysisView(data, elements, new Date(snapshot.generatedAt));
    // O destinatário pode estar em outro fuso; preserva a data da geração.
    elements.date.textContent = snapshot.dateLabel;
}

function createProgressChart(canvas, progress, color, label) {
    const ratio = Math.max(0, Math.min(progress ?? 0, 1));
    return createDashboardChart(canvas, {
        type: "doughnut",
        data: {
            labels: [label, "Restante até o limite"],
            datasets: [{ data: [ratio, 1 - ratio], backgroundColor: context => context.dataIndex === 0 ? color : getChartEmptyColor(), borderWidth: 0 }],
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: "72%", animation: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
    });
}

const barValues = {
    id: "standaloneBarValues",
    afterDatasetsDraw(chart) {
        const context = chart.ctx;
        context.save();
        context.letterSpacing = "1px";
        context.font = CHART_VALUE_FONT;
        context.fillStyle = CHART_TEXT_COLOR;
        context.textBaseline = "middle";
        chart.getDatasetMeta(0).data.forEach((bar, index) => {
            const position = getHorizontalBarLabelPosition(bar);
            context.fillText(formatOverallAnalysisQuantity(chart.data.datasets[0].data[index]), position.x, position.y);
        });
        context.restore();
    },
};

function createBarChart(canvas, labels, values, colors) {
    return createDashboardChart(canvas, {
        type: "bar",
        data: { labels, datasets: [{ label: "Pacotes", data: values, backgroundColor: colors }] },
        plugins: [barValues],
        options: {
            indexAxis: "y", responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { beginAtZero: true, grace: "15%", ticks: { precision: 0,
                    callback: formatOverallAnalysisQuantity },
                    title: { display: true, text: "Quantidade de pacotes" } },
                y: { ticks: { autoSkip: false } },
            },
        },
    });
}

function createCompositionChart(canvas, labels, values, colors, centerText, centerLabel) {
    const projection = {
        id: "standaloneComposition3D",
        beforeDatasetDraw(chart, args) {
            if (args.index !== 0) return;
            const dataset = chart.data.datasets[0];
            chart.$composition = drawDoughnut3D({
                context: chart.ctx, area: chart.chartArea,
                values: dataset.data.map((value, index) => chart.getDataVisibility(index) ? value : 0),
                colors: dataset.backgroundColor,
            });
            return false;
        },
        afterDraw(chart) {
            drawDoughnut3DCenterText(chart, chart.$composition, { text: centerText, label: centerLabel });
        },
    };
    const chart = createDashboardChart(canvas, {
        type: "doughnut",
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] },
        plugins: [projection],
        options: {
            responsive: true, maintainAspectRatio: false, cutout: "66%", animation: false,
            events: [], layout: { padding: { ...DOUGHNUT_3D_PADDING } },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
    });
    // As legendas do modelo são HTML; também funcionam pelo teclado.
    const legendItems = canvas.closest(".chart").querySelectorAll(".chart-label .type");
    legendItems.forEach((item, index) => {
        item.tabIndex = 0;
        item.setAttribute("role", "button");
        item.setAttribute("aria-label", `Mostrar ou ocultar ${labels[index]}`);
        item.setAttribute("aria-pressed", "true");
        item.style.cursor = "pointer";
        function toggle() {
            chart.toggleDataVisibility(index);
            const visible = chart.getDataVisibility(index);
            item.setAttribute("aria-pressed", String(visible));
            item.style.opacity = visible ? "1" : "0.45";
            chart.update("none");
        }
        item.addEventListener("click", toggle);
        item.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggle();
            }
        });
    });
    return chart;
}

async function renderStandaloneReport(snapshot, root = document) {
    const data = snapshot.report;
    fillStandaloneFields(data, snapshot, root);
    if (document.fonts?.load) {
        await Promise.all([400, 600, 800].map(weight =>
            document.fonts.load(`${weight} 14px "Open Sans"`, "Ação Expedição 0123456789")));
        await document.fonts.ready;
    }
    window.Chart.defaults.font.family = '"Open Sans", sans-serif';
    window.Chart.defaults.font.size = 14;
    window.Chart.defaults.color = CHART_TEXT_COLOR;
    const canvas = id => {
        const element = root.querySelector(`#${id}`);
        if (!element) throw new Error(`Gráfico ${id} não encontrado no modelo.`);
        return element;
    };
    const capacity = data.cards.capacity;
    const loss = data.cards.lossesRate;
    const charts = [
        createProgressChart(canvas("finalReportCapacityChart"), capacity.usageRate,
            capacity.usageRate > 1 ? CHART_COLORS.red : CHART_COLORS.green, "Uso da capacidade"),
        createProgressChart(canvas("finalReportPackagesChart"), data.cards.packagesAnalysis.rate,
            CHART_COLORS.yellow, "Pacotes em análise"),
        createProgressChart(canvas("finalReportLossRateChart"), loss.rate / loss.limit,
            loss.rate > loss.limit ? CHART_COLORS.red : loss.rate >= 0.00025 ? CHART_COLORS.yellow : CHART_COLORS.green,
            "Uso do limite de perdas"),
        createBarChart(canvas("finalReportReceiptChart"), ["Volume Esperado", "Volume Recebido", "Gap"],
            [data.processing.expectedVolume, data.processing.receivedVolume, data.processing.gap],
            ["#bdbdbd", CHART_COLORS.green, CHART_COLORS.yellow]),
        createBarChart(canvas("finalReportExpeditionChart"), ["Volume Expedido", "Volume no Piso"],
            [data.expedition.volumeChecked, data.expedition.floorVolume], [CHART_COLORS.green, CHART_COLORS.yellow]),
        createCompositionChart(canvas("finalReport-ParcelChart"), ["Escaneados", "Não escaneados"],
            [data.parcel.expectedScannedCount, data.parcel.expectedUnscannedCount], [CHART_COLORS.blue, "#e4e6eb"],
            data.parcel.expectedTotalCount > 0 ? new Intl.NumberFormat("pt-BR", {
                style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2,
            }).format(data.parcel.expectedScannedCount / data.parcel.expectedTotalCount) : "—", "Bipados"),
        createCompositionChart(canvas("finalReport-ReverseChart"),
            REVERSE_TYPE_KEYS.map(key => REVERSE_TYPE_DEFINITIONS[key].label),
            REVERSE_TYPE_KEYS.map(key => data.reverse.quantities[key]),
            REVERSE_TYPE_KEYS.map(key => REVERSE_TYPE_DEFINITIONS[key].color),
            formatOverallAnalysisQuantity(data.reverse.hasData ? data.reverse.total : null), "Pacotes"),
    ];
    window.addEventListener("beforeprint", () => charts.forEach(chart => chart.resize()));
    window.addEventListener("afterprint", () => charts.forEach(chart => chart.resize()));
    document.documentElement.dataset.finalReportState = "ready";
    return charts;
}

function startStandaloneReport() {
    Promise.resolve().then(() => {
        const snapshot = JSON.parse(document.getElementById("finalReportData").textContent);
        return renderStandaloneReport(snapshot);
    }).catch(error => {
        console.error("Não foi possível abrir o relatório final:", error);
        document.documentElement.dataset.finalReportState = "error";
        const warning = document.createElement("p");
        warning.setAttribute("role", "alert");
        warning.textContent = "Não foi possível carregar o relatório. Gere o arquivo novamente no dashboard.";
        document.body.prepend(warning);
    });
}

export { renderStandaloneReport, startStandaloneReport };
