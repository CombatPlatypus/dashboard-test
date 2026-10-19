import {
    reportManager,
} from "../core/report-manager.js";

import {
    getReportContext,
    restoreReportContext,
} from "../core/report-context.js";

import {
    bindReportImageExportButton,
    copyReportBlob,
    createReportImageBlob,
    downloadReportBlob,
} from "../export.js";

import {
    resetReportNotification,
    setReportNotification,
} from "../report-notifications.js";

import { getOverallAnalysisMissingSections, isOverallAnalysisComplete } from "./completeness.js";
import {
    createStandaloneOverallAnalysisHtml,
    createStandaloneOverallAnalysisFileName,
} from "./standalone-export.js";

const OVERALL_ANALYSIS_SOURCE_REPORT_IDS =
    Object.freeze([
        "planning",
        "receipt",
        "expedition",
        "damage-and-losses",
        "losses-rate",
        "parcel",
        "reverse",
    ]);

let overallAnalysisActionsInitialized =
    false;

let overallAnalysisExportBusy =
    false;

let overallAnalysisHasExportableData =
    false;

let overallAnalysisCopyButton = null;
let overallAnalysisClearButton = null;
let overallAnalysisExportArea = null;
let overallAnalysisHtmlButton = null;
let overallAnalysisCurrentData = null;

/* IDENTIFICA SE EXISTE ALGUMA INFORMAÇÃO PARA LIMPAR */

function hasOverallAnalysisContextData() {
    const context =
        getReportContext();

    return (
        context.analyst !== "" ||
        context.plannedVolume !== null ||
        context.collaboratorCount !== null ||
        context.shiftCapacity !== null ||
        context.window !== "AM"
    );
}

function canClearOverallAnalysisSources() {
    if (
        overallAnalysisHasExportableData ||
        hasOverallAnalysisContextData()
    ) {
        return true;
    }

    return OVERALL_ANALYSIS_SOURCE_REPORT_IDS
        .some(
            function (reportId) {
                const report =
                    reportManager.get(
                        reportId,
                    );

                return (
                    report &&
                    typeof report.canExport ===
                        "function" &&
                    report.canExport()
                );
            },
        );
}

/* ATUALIZA OS BOTÕES */

function renderOverallAnalysisActions(
    hasExportableData,
    data = overallAnalysisCurrentData,
) {
    overallAnalysisCurrentData = data;
    overallAnalysisHasExportableData =
        Boolean(
            hasExportableData,
        );

    if (
        !(
            overallAnalysisCopyButton instanceof
                HTMLButtonElement
        ) ||
        !(
            overallAnalysisClearButton instanceof
                HTMLButtonElement
        ) ||
        !(
            overallAnalysisHtmlButton instanceof
                HTMLButtonElement
        )
    ) {
        return false;
    }

    overallAnalysisCopyButton.disabled =
        overallAnalysisExportBusy ||
        !overallAnalysisHasExportableData;

    overallAnalysisClearButton.disabled =
        overallAnalysisExportBusy ||
        !canClearOverallAnalysisSources();

    const missing = getOverallAnalysisMissingSections(data);
    overallAnalysisHtmlButton.disabled = overallAnalysisExportBusy || missing.length > 0;
    overallAnalysisHtmlButton.title = overallAnalysisExportBusy
        ? "Gerando relatório..."
        : missing.length
            ? `Complete a análise geral. Falta: ${missing.join("; ")}.`
            : "Baixar resumo HTML interativo";

    return true;
}

/* BAIXA O RETRATO COMPLETO DA JANELA EM UM ÚNICO HTML */

async function runOverallAnalysisHtmlExport() {
    if (overallAnalysisExportBusy || !isOverallAnalysisComplete(overallAnalysisCurrentData)) {
        return false;
    }

    overallAnalysisExportBusy = true;
    overallAnalysisHtmlButton.setAttribute("aria-busy", "true");
    renderOverallAnalysisActions(overallAnalysisHasExportableData);
    const generatedAt = new Date();

    try {
        const html = await createStandaloneOverallAnalysisHtml(overallAnalysisCurrentData, { generatedAt });
        downloadReportBlob(new Blob([html], { type: "text/html;charset=utf-8" }),
            createStandaloneOverallAnalysisFileName(generatedAt));
        setReportNotification({
            reportId: "overall-analysis", type: "success",
            message: "Resumo HTML interativo baixado.",
        });
        return true;
    } catch (error) {
        console.error("Não foi possível gerar o resumo HTML:", error);
        setReportNotification({
            reportId: "overall-analysis", type: "error",
            message: "Não foi possível gerar o resumo HTML. Tente novamente.",
        });
        return false;
    } finally {
        overallAnalysisExportBusy = false;
        overallAnalysisHtmlButton.removeAttribute("aria-busy");
        renderOverallAnalysisActions(overallAnalysisHasExportableData);
    }
}

/* EXPORTA A ANÁLISE GERAL */

function createOverallAnalysisFileName() {
    const date =
        new Intl.DateTimeFormat(
            "pt-BR",
        )
            .format(new Date())
            .replace(/\//g, "-");

    return `relatorio-de-analise-geral-${date}.png`;
}

async function runOverallAnalysisExport(
    mode,
) {
    if (
        overallAnalysisExportBusy ||
        !overallAnalysisHasExportableData ||
        !(
            overallAnalysisExportArea instanceof
                HTMLElement
        )
    ) {
        return;
    }

    const isCopy =
        mode === "copy";

    const originalTitle =
        overallAnalysisCopyButton.title;

    const originalAriaLabel =
        overallAnalysisCopyButton
            .getAttribute(
                "aria-label",
            );

    overallAnalysisExportBusy =
        true;

    renderOverallAnalysisActions(
        overallAnalysisHasExportableData,
    );

    overallAnalysisCopyButton.title =
        isCopy
            ? "Copiando relatório..."
            : "Gerando relatório...";

    overallAnalysisCopyButton.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const blob =
            await createReportImageBlob(
                overallAnalysisExportArea,
            );

        if (isCopy) {
            await copyReportBlob(
                blob,
            );
        } else {
            downloadReportBlob(
                blob,
                createOverallAnalysisFileName(),
            );
        }

        setReportNotification({
            reportId:
                "overall-analysis",
            type: "success",
            message:
                isCopy
                    ? "Relatório de análise geral copiado."
                    : "Relatório de análise geral baixado.",
        });
    } catch (error) {
        console.error(
            "Não foi possível exportar a análise geral:",
            error,
        );

        setReportNotification({
            reportId:
                "overall-analysis",
            type: "error",
            message:
                "Não foi possível exportar o relatório de análise geral.",
        });
    } finally {
        overallAnalysisExportBusy =
            false;

        overallAnalysisCopyButton.title =
            originalTitle;

        overallAnalysisCopyButton
            .removeAttribute(
                "aria-busy",
            );

        if (originalAriaLabel) {
            overallAnalysisCopyButton
                .setAttribute(
                    "aria-label",
                    originalAriaLabel,
                );
        }

        renderOverallAnalysisActions(
            overallAnalysisHasExportableData,
        );
    }
}

/* LIMPA TODOS OS RELATÓRIOS QUE ALIMENTAM A ANÁLISE */

function resetOverallAnalysisSources() {
    OVERALL_ANALYSIS_SOURCE_REPORT_IDS
        .forEach(
            function (reportId) {
                reportManager.reset(
                    reportId,
                );

                resetReportNotification(
                    reportId,
                );
            },
        );

    restoreReportContext({
        window: "AM",
    });

    reportManager.render(
        "overall-analysis",
    );

    setReportNotification({
        reportId:
            "overall-analysis",
        type: "info",
        message:
            "Todos os relatórios foram limpos.",
    });
}

/* INICIALIZAÇÃO */

function initializeOverallAnalysisActions(
    rootElement =
        document.getElementById(
            "overall-analysis",
        ),
) {
    if (
        overallAnalysisActionsInitialized
    ) {
        return true;
    }

    const panel =
        rootElement instanceof HTMLElement
            ? rootElement
            : null;

    overallAnalysisCopyButton =
        panel?.querySelector(
            "#overallAnalysisCopyReportButton",
        );

    overallAnalysisHtmlButton = panel?.querySelector("#overallAnalysisExportHtmlButton");

    overallAnalysisClearButton =
        panel?.querySelector(
            "#overallAnalysisClearReportButton",
        );

    overallAnalysisExportArea =
        panel?.querySelector(
            "#overallAnalysisReportExportArea",
        );

    if (
        !(
            overallAnalysisCopyButton instanceof
                HTMLButtonElement
        ) ||
        !(
            overallAnalysisClearButton instanceof
                HTMLButtonElement
        ) ||
        !(
            overallAnalysisExportArea instanceof
                HTMLElement
        ) ||
        !(
            overallAnalysisHtmlButton instanceof
                HTMLButtonElement
        )
    ) {
        return false;
    }

    bindReportImageExportButton(
        overallAnalysisCopyButton,
        {
            onCopy:
                function () {
                    runOverallAnalysisExport(
                        "copy",
                    );
                },

            onDownload:
                function () {
                    runOverallAnalysisExport(
                        "download",
                    );
                },
        },
    );

    overallAnalysisHtmlButton.addEventListener("click", runOverallAnalysisHtmlExport);

    overallAnalysisClearButton
        .addEventListener(
            "click",
            function () {
                if (
                    !window.confirm(
                        "Limpar todos os relatórios e os campos gerais da janela?",
                    )
                ) {
                    return;
                }

                resetOverallAnalysisSources();
            },
        );

    overallAnalysisActionsInitialized =
        true;

    return true;
}

export {
    initializeOverallAnalysisActions,
    renderOverallAnalysisActions,
    runOverallAnalysisHtmlExport,
    resetOverallAnalysisSources,
};
