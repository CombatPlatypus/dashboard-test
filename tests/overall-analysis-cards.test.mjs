import assert from "node:assert/strict";
import { test } from "node:test";
import { createOverallAnalysisData } from "../js/reports/overall-analysis/model.js";

function createData({ activeMonth = 0, year = 2026, currentMonth = { moved: 356741, lost: 26, damage: 60, possibleLosses: 111 },
    date = new Date(2026, 9, 28, 12) } = {}) {
    const months = Array.from({ length: 12 }, () => ({ moved: null, lost: null, damage: null, possibleLosses: null }));
    months[0] = { moved: 100, lost: 10, damage: 20, possibleLosses: 30 };
    months[9] = { moved: null, lost: null, damage: null, possibleLosses: null, ...currentMonth };
    return createOverallAnalysisData({ operators: [] }, { routes: [] }, { activeMonth, year, months }, {},
        { days: [{ date: "2026-10-19", hub: 2, soc: 7 }] },
        { days: [{ date: "2026-10-19", underReview: 4, confirmedLosses: 3, returnedPackages: 8 }] },
        null, null, date);
}

test("card usa os totais mensais importados e mantém o mês atual ao trocar o seletor", () => {
    for (const activeMonth of [0, 8, 9, 11]) {
        const { cards } = createData({ activeMonth });
        assert.equal(cards.lossesRate.moved, 356741);
        assert.equal(cards.lossesRate.totalLosses, 86);
        assert.equal(cards.lossesRate.rate, 86 / 356741);
        assert.deepEqual(cards.damage, { hub: 2, soc: 7, total: 9 });
        assert.equal(cards.packagesAnalysis.value, 4);
        assert.equal(cards.packagesAnalysis.confirmedLosses, 3);
        assert.equal(cards.packagesAnalysis.total, 7, "Retornados não entram no total de análises e perdas.");
    }
});

test("não usa dados de outro mês nem de outro ano para preencher a taxa atual", () => {
    for (const options of [{ currentMonth: {} }, { year: 2025 }, { date: new Date(2027, 0, 1, 12) }]) {
        const rate = createData(options).cards.lossesRate;
        assert.equal(rate.rate, null);
        assert.equal(rate.moved, null);
        assert.equal(rate.totalLosses, null);
    }
});

test("volume ausente ou zero mantém a taxa vazia e preserva o total de perdas", () => {
    for (const moved of [null, 0]) {
        const rate = createData({ currentMonth: { moved, lost: 26, damage: 60, possibleLosses: 111 } }).cards.lossesRate;
        assert.equal(rate.rate, null);
        assert.equal(rate.totalLosses, 86);
        assert.equal(rate.moved, moved);
    }
    const rate = createData({ currentMonth: { moved: 1000, lost: 0, damage: 0, possibleLosses: 50 } }).cards.lossesRate;
    assert.equal(rate.totalLosses, 0);
    assert.equal(rate.rate, 0);
});
