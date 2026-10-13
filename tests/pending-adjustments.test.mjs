import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
    getReportContext,
} from "../js/reports/core/report-context.js";

import {
    getLossesRateMonthSummary,
} from "../js/reports/losses-rate/state.js";

test("capacidade global começa em 20.000 e usa o nome Capacidade do Hub", () => {
    const html = readFileSync(
        new URL(
            "../index.html",
            import.meta.url,
        ),
        "utf8",
    );

    assert.equal(
        getReportContext()
            .shiftCapacity,
        20000,
    );
    assert.match(
        html,
        /<h4>Capacidade do Hub<\/h4>\s*<input\b[^>]*\bid="reportCapacityInput"[^>]*>/,
    );
});

test("taxa de perdas usa o estado renderizado na tabela e no gráfico", () => {
    const state = {
        activeMonth: 0,
        year: 2026,
        months: Array.from(
            { length: 12 },
            function (_, index) {
                return index === 0
                    ? {
                        moved: 10000,
                        possibleLosses: 10,
                        lost: 2,
                        damage: 1,
                    }
                    : {
                        moved: null,
                        possibleLosses: null,
                        lost: null,
                        damage: null,
                    };
            },
        ),
    };

    assert.equal(
        getLossesRateMonthSummary(
            0,
            state,
        ).lossRate,
        0.0003,
    );

    const view = readFileSync(
        new URL(
            "../js/reports/losses-rate/view.js",
            import.meta.url,
        ),
        "utf8",
    );
    const charts = readFileSync(
        new URL(
            "../js/reports/losses-rate/charts.js",
            import.meta.url,
        ),
        "utf8",
    );

    assert.match(
        view,
        /getLossesRateMonthSummary\(\s*state\.activeMonth,\s*state,\s*\)/,
    );
    assert.match(
        charts,
        /getLossesRateMonthSummary\(\s*monthIndex,\s*state,\s*\)/,
    );
});

test("ranking posiciona nomes 8 px acima das barras e aplica padding interno às colunas", () => {
    const charts = readFileSync(
        new URL(
            "../js/reports/expedition/charts.js",
            import.meta.url,
        ),
        "utf8",
    );

    assert.match(
        charts,
        /const routeStart =\s*volumeStart \+\s*COMPARISON_CONTENT_PADDING\.left;/,
    );
    assert.match(charts, /const routeEnd =\s*volumeEnd -\s*COMPARISON_CONTENT_PADDING\.right;/);
    assert.match(charts, /const timeStart =\s*timeGridStart \+\s*COMPARISON_CONTENT_PADDING\.left;/);
    assert.match(charts, /const timeEnd =\s*timeGridEnd -\s*COMPARISON_CONTENT_PADDING\.right;/);
    assert.match(charts, /const COMPARISON_LABEL_BAR_GAP = 8;/);
    assert.match(
        charts,
        /const labelY =\s*positionY -\s*barHeight \/ 2 -\s*COMPARISON_LABEL_BAR_GAP;/,
    );
    assert.doesNotMatch(
        charts,
        /const nameStart/,
    );
});

test("controles vazios da expedição não exibem zero inicial", () => {
    const view = readFileSync(
        new URL(
            "../js/reports/expedition/view.js",
            import.meta.url,
        ),
        "utf8",
    );

    for (const field of [
        "duplicatedInput",
        "exceptionInput",
        "withdrawnInput",
    ]) {
        assert.match(
            view,
            new RegExp(
                `elements\\.${field},\\s*summary\\.hasData\\s*\\?`,
            ),
        );
    }
});
