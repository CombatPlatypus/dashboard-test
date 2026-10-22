import { createDashboardChart } from "../../charts/standard.js";
import {
    DOUGHNUT_3D_PADDING, drawDoughnut3D, drawDoughnut3DCenterText,
} from "../core/doughnut-3d.js";

const projection = {
    id: "consolidated-composition-3d",
    beforeDatasetDraw(chart, args) {
        if (args.index !== 0) return;
        const dataset = chart.data.datasets[0];
        chart.$consolidatedGeometry = drawDoughnut3D({
            context: chart.ctx,
            area: chart.chartArea,
            values: dataset.data,
            colors: dataset.backgroundColor,
        });
        return false;
    },
};

const centerText = {
    id: "consolidatedCenterText",
    afterDraw(chart, args, options) {
        drawDoughnut3DCenterText(chart, chart.$consolidatedGeometry, options);
    },
};

function createConsolidatedCompositionChart(canvas) {
    return createDashboardChart(canvas, {
        type: "doughnut",
        data: {
            labels: ["Em Análise", "Lost", "Avarias do Hub", "Avarias do SOC"],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ["#2538a5", "#8B0000", "#007A48", "#f99400"],
                borderColor: "transparent",
                borderWidth: 0,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "66%",
            events: [],
            layout: { padding: { ...DOUGHNUT_3D_PADDING } },
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                consolidatedCenterText: { text: "—", label: "Ocorrências" },
            },
        },
        plugins: [projection, centerText],
    });
}

export { createConsolidatedCompositionChart };
