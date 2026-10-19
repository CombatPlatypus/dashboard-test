/* PADRÃO COMPARTILHADO POR TODOS OS GRÁFICOS, ATUAIS E FUTUROS */

(function configureDashboardChartFonts() {
    const chartLibrary = window.Chart;

    if (!chartLibrary?.defaults?.font) {
        return;
    }

    chartLibrary.defaults.font.family = "'Open Sans', sans-serif";
    chartLibrary.defaults.font.size = 14;
    chartLibrary.defaults.devicePixelRatio = function () {
        return Math.max(Number(window.devicePixelRatio) || 1, 2);
    };
    chartLibrary.defaults.color = "#e4e6eb";

    const tooltip = chartLibrary.defaults.plugins?.tooltip;
    if (tooltip) {
        tooltip.enabled = false;
        tooltip.titleColor = "#e4e6eb";
        tooltip.bodyColor = "#e4e6eb";
        tooltip.footerColor = "#e4e6eb";
    }

    const fonts = document.fonts;

    if (!fonts?.load) {
        return;
    }

    let redrawFrame = null;

    function redrawChartsAfterFontLoad() {
        if (redrawFrame !== null) {
            return;
        }

        redrawFrame = window.requestAnimationFrame(function () {
            redrawFrame = null;

            Object.values(chartLibrary.instances ?? {}).forEach(function (chart) {
                chart.update("none");
            });
        });
    }

    // O canvas não se redesenha automaticamente após o font-display: swap.
    fonts.addEventListener?.("loadingdone", redrawChartsAfterFontLoad);

    Promise.all([400, 600, 800].map(function (weight) {
        return fonts.load(`${weight} 14px 'Open Sans'`, "Ação Expedição Ocorrências 0123456789");
    }))
        .then(function () { return fonts.ready; })
        .then(redrawChartsAfterFontLoad)
        .catch(function () {
            console.warn("Não foi possível carregar a Open Sans local para os gráficos; usando sans-serif como alternativa.");
        });
})();
