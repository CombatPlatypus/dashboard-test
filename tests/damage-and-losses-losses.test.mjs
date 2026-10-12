import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeEach, test } from "node:test";

import {
    createLossesMonthData,
    findLossesMonthSource,
} from "../js/reports/damage-and-losses/import.js";
import {
    getLossesSummary,
    replaceLossesData,
    resetLossesState,
} from "../js/reports/damage-and-losses/losses-state.js";
import { initializeLossesCharts } from "../js/reports/damage-and-losses/losses-charts.js";

const require = createRequire(import.meta.url);
const XLSX = require("../js/libraries/xlsx.full.min.js");

function createLossesWorkbook(
    returnedSheetName = "Históricos de Retornados",
) {
    const workbook = XLSX.utils.book_new();
    const history = XLSX.utils.aoa_to_sheet([
        ["Data", "Código BR", "Situação"],
        [new Date(2026, 9, 1, 12), "BR1", "Lost"],
        [new Date(2026, 9, 2, 12), "BR2", "Em Análise"],
        [new Date(2026, 9, 3, 12), "BR3", "Lost"],
        [new Date(2026, 9, 3, 12), "BR4", "Lost"],
    ]);
    const base = XLSX.utils.aoa_to_sheet([
        [
            "Data",
            "Código BR",
            "Situação",
            "Rota",
            "AT",
            "ID do Motorista",
            "Motorista",
            "Produto",
            "Pack Recovery",
        ],
        [new Date(2026, 9, 1, 12), "BR1", "Lost", "", "", "", "", "", "Feito"],
        [new Date(2026, 9, 2, 12), "BR2", "Em Análise", "", "", "", "", "", "Não Feito"],
        [new Date(2026, 9, 3, 12), "BR3", "Lost", "", "", "", "", "", "ID Inválido"],
        [new Date(2026, 9, 3, 12), "BR4", "Lost", "", "", "", "", "", "-"],
    ]);
    const returned = XLSX.utils.aoa_to_sheet([
        ["Semana", "Devolução", "Expedição", "Código BR"],
        ["W40", new Date(2026, 9, 2, 12), new Date(2026, 9, 1, 12), "RET1"],
        ["W40", new Date(2026, 9, 3, 12), new Date(2026, 9, 2, 12), "RET2"],
    ]);

    XLSX.utils.book_append_sheet(
        workbook,
        history,
        "Histórico de Análises",
    );
    XLSX.utils.book_append_sheet(
        workbook,
        base,
        "Base de Análises",
    );
    XLSX.utils.book_append_sheet(
        workbook,
        returned,
        returnedSheetName,
    );

    return workbook;
}

beforeEach(() => {
    globalThis.window = { XLSX };
    resetLossesState();
});

test("importa as quatro opções atuais do Pack Recovery e os pacotes retornados", () => {
    const source =
        findLossesMonthSource(
            createLossesWorkbook(),
        );
    const imported =
        createLossesMonthData(
            source,
            new Date(2026, 9, 3, 12),
        );

    replaceLossesData(imported);

    const summary = getLossesSummary();
    assert.equal(summary.confirmedLosses, 3);
    assert.equal(summary.underReview, 1);
    assert.equal(summary.returnedPackages, 2);
    assert.equal(summary.recoveryDone, 1);
    assert.equal(summary.recoveryNotDone, 1);
    assert.equal(summary.recoveryInvalidId, 1);
    assert.equal(summary.recoveryUninformed, 1);
    assert.equal(summary.packRecoveryTotal, 4);
    assert.equal(
        summary.traditionalAnalysis.totalMonth
            .returnedPackages,
        2,
    );
});

test("aceita o nome singular informado para a aba de retornados", () => {
    const source =
        findLossesMonthSource(
            createLossesWorkbook(
                "Histórico de Retornados",
            ),
        );

    assert.equal(
        source.returnedSource.sheetName,
        "Histórico de Retornados",
    );
});

test("o HTML liga o novo gráfico e a linha de retornados ao estado", () => {
    const html = readFileSync(
        new URL("../index.html", import.meta.url),
        "utf8",
    );
    const lossesView = readFileSync(
        new URL(
            "../js/reports/damage-and-losses/losses-view.js",
            import.meta.url,
        ),
        "utf8",
    );

    assert.equal(
        Array.from(
            html.matchAll(
                /id="lossesReturnedComparisonChart"/g,
            ),
        ).length,
        1,
    );
    assert.match(
        html,
        /data-losses-analysis-field="returnedPackages"/,
    );
    assert.doesNotMatch(
        html + lossesView,
        /savedAwaitingTicket|emptyAwaitingTicket|Aguardando Ticket/,
    );
});

test("comparação mostra Em Análise, Perdidos e Retornados nessa ordem, com cores e valores corretos", t => {
    class Element {
        constructor(id) {
            this.id = id;
            this.dataset = {};
            this.classList = { contains: () => true };
        }
        setAttribute(name, value) { this[name] = value; }
        addEventListener() {}
        querySelectorAll() { return []; }
    }
    class Canvas extends Element {}
    const charts = new Map();
    const elements = new Map([
        ["#losses", new Element("losses")],
        ["#lossesLastSevenDaysChart", new Canvas("lossesLastSevenDaysChart")],
        ["#lossesPackRecoveryChart", new Canvas("lossesPackRecoveryChart")],
        ["#lossesReturnedComparisonChart", new Canvas("lossesReturnedComparisonChart")],
        ["#lossesChartPeriodTitle", new Element("lossesChartPeriodTitle")],
        ["#lossesChartPeriodSelector", new Element("lossesChartPeriodSelector")],
    ]);
    const panel = new Element("damage-and-losses");
    panel.querySelector = selector => elements.get(selector);
    const previousGlobals = new Map();
    for (const [name, value] of Object.entries({
        HTMLElement: Element,
        HTMLCanvasElement: Canvas,
        MutationObserver: class { observe() {} },
        window: { XLSX, Chart: class {
            constructor(canvas, config) {
                Object.assign(this, config, { canvas });
                charts.set(canvas.id, this);
            }
            update() {}
            resize() {}
        } },
    })) {
        previousGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    }
    t.after(() => {
        resetLossesState();
        for (const [name, descriptor] of previousGlobals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else delete globalThis[name];
        }
    });

    assert.equal(initializeLossesCharts(panel), true);
    const comparison = charts.get("lossesReturnedComparisonChart");
    assert.equal(comparison.options.indexAxis, "y");
    assert.deepEqual(comparison.data.labels, ["Em Análise", "Perdidos", "Retornados"]);
    assert.deepEqual(comparison.data.datasets[0].backgroundColor, ["#ffc107", "#F44336", "#66bb6a"]);
    assert.deepEqual(comparison.data.datasets[0].data, [0, 0, 0]);

    const source = findLossesMonthSource(createLossesWorkbook());
    replaceLossesData(createLossesMonthData(source, new Date(2026, 9, 3, 12)));
    assert.deepEqual(comparison.data.datasets[0].data, [1, 3, 2]);
    assert.match(comparison.canvas["aria-label"], /^Pacotes em análise, perdidos e retornados:/);
    assert.deepEqual(charts.get("lossesPackRecoveryChart").data.datasets[0].data, [1, 1, 1, 1]);

    resetLossesState();
    assert.deepEqual(comparison.data.datasets[0].data, [0, 0, 0]);
    assert.deepEqual(comparison.data.labels, ["Em Análise", "Perdidos", "Retornados"]);
});
