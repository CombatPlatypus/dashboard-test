const parcelHorizontalQuantityFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
});

const parcelHorizontalTextStyle = {
    id: "parcelHorizontalTextStyle",
    beforeLayout(chart) {
        if ("letterSpacing" in chart.ctx) {
            chart.ctx.letterSpacing = "0px";
        }
    },
    beforeDraw(chart) {
        this.beforeLayout(chart);
    },
};

const parcelHorizontalTracks = {
    id: "parcelHorizontalTracks",
    beforeDatasetsDraw(chart) {
        const area = chart.chartArea;
        if (!area) return;

        const context = chart.ctx;
        context.save();
        context.fillStyle = "rgba(82, 82, 82, 0.34)";
        chart.getDatasetMeta(0).data.forEach(bar => {
            const { y, height } = bar.getProps(["y", "height"], true);
            context.fillRect(area.left, y - height / 2, area.right - area.left, height);
        });
        context.restore();
    },
};

const parcelHorizontalValues = {
    id: "parcelHorizontalValues",
    afterDatasetsDraw(chart) {
        const area = chart.chartArea;
        if (!area) return;

        const context = chart.ctx;
        context.save();
        context.font = '600 14px "Open Sans", Arial, sans-serif';
        context.fillStyle = "#e4e6eb";
        context.textAlign = "left";
        context.textBaseline = "middle";
        chart.getDatasetMeta(0).data.forEach((bar, index) => {
            const { y } = bar.getProps(["y"], true);
            const value = chart.data.datasets[0].data[index];
            context.fillText(chart.$parcelHasDistribution
                ? parcelHorizontalQuantityFormatter.format(value)
                : "—", area.right + 12, y);
        });
        context.restore();
    },
};

function getParcelHorizontalChartHeight(categoryCount) {
    return Math.max(220, categoryCount * 40 + 16);
}

function createParcelHorizontalChart(canvas, color) {
    return new window.Chart(canvas, {
        type: "bar",
        data: {
            labels: ["—"],
            datasets: [{
                label: "Pacotes",
                data: [0],
                backgroundColor: color,
                borderWidth: 0,
                borderRadius: 3,
                barThickness: 24,
            }],
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            events: [],
            layout: { padding: { right: 52 } },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
            },
            scales: {
                x: { beginAtZero: true, display: false, suggestedMax: 1 },
                y: {
                    ticks: {
                        color: "#e4e6eb",
                        font: { size: 14 },
                        padding: 12,
                        autoSkip: false,
                    },
                    grid: { display: false },
                    border: { display: false },
                },
            },
        },
        plugins: [parcelHorizontalTextStyle, parcelHorizontalTracks, parcelHorizontalValues],
    });
}

function updateParcelHorizontalChart(chart, distribution, { title, color, height }) {
    const labels = distribution.map(item => item.label);
    const values = distribution.map(item => item.count);
    const maximum = Math.max(0, ...values);
    const quantityText = parcelHorizontalQuantityFormatter.format(maximum);
    const container = chart.canvas.parentElement;

    if (container && container.style.height !== `${height}px`) {
        container.style.height = `${height}px`;
        chart.resize();
    }
    chart.$parcelHasDistribution = distribution.length > 0;
    chart.data.labels = labels.length > 0 ? labels : ["—"];
    chart.data.datasets[0].data = values.length > 0 ? values : [0];
    chart.data.datasets[0].backgroundColor = labels.length > 0
        ? labels.map(label => label === "-" ? "#a8a9ad" : color)
        : ["#a8a9ad"];
    chart.options.scales.x.suggestedMax = maximum > 0 ? Math.ceil(maximum * 1.15) : 1;
    chart.options.layout.padding.right = Math.max(52, quantityText.length * 9 + 16);
    chart.canvas.setAttribute("aria-label", `${title}: ${distribution.length > 0
        ? distribution.map(item => `${item.label}: ${parcelHorizontalQuantityFormatter.format(item.count)}`).join("; ")
        : "sem pacotes importados"}.`);
    chart.update();
}

export { createParcelHorizontalChart, getParcelHorizontalChartHeight, updateParcelHorizontalChart };
