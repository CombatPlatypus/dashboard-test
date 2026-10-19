import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const template = readFileSync(
    new URL(
        "../final-report.html",
        import.meta.url,
    ),
    "utf8",
);

const dashboard = readFileSync(
    new URL(
        "../index.html",
        import.meta.url,
    ),
    "utf8",
);

test(
    "modelo independente incorpora fontes e recursos visuais",
    function () {
        assert.equal(
            (
                template.match(
                    /@font-face/g,
                ) || []
            ).length,
            3,
        );

        assert.equal(
            (
                template.match(
                    /data:font\/woff2;base64,/g,
                ) || []
            ).length,
            3,
        );

        assert.match(
            template,
            /<svg aria-hidden="true" focusable="false"[^>]*viewBox="0 0 34 34"/,
        );

        assert.doesNotMatch(
            template,
            /calendar-icon\.svg/,
        );

        assert.doesNotMatch(
            template,
            /<(?:img|script|link)\b[^>]*(?:src|href)\s*=/i,
        );
    },
);

test(
    "modelo mantém os três pontos de injeção uma única vez",
    function () {
        for (
            const placeholder of [
                "{{CHART_JS}}",
                "{{REPORT_DATA}}",
                "{{REPORT_RENDERER_JS}}",
            ]
        ) {
            assert.equal(
                template.split(
                    placeholder,
                ).length - 1,
                1,
            );
        }

        assert.doesNotMatch(
            template,
            /window\.Chart=Tn/,
        );
    },
);

test(
    "modelo e dashboard expõem os elementos da exportação",
    function () {
        const canvasIds = [
            "finalReportCapacityChart",
            "finalReportPackagesChart",
            "finalReportLossRateChart",
            "finalReportReceiptChart",
            "finalReportExpeditionChart",
            "finalReport-ParcelChart",
            "finalReport-ReverseChart",
        ];

        for (const canvasId of canvasIds) {
            assert.match(
                template,
                new RegExp(
                    `<canvas id="${canvasId}"`,
                ),
            );
        }

        assert.match(
            dashboard,
            /<button id="overallAnalysisExportHtmlButton"[^>]*aria-label="Baixar resumo HTML interativo da análise geral"/,
        );
    },
);
