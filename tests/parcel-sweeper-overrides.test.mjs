import assert from "node:assert/strict";
import { test } from "node:test";
import {
    classifyParcelOperators,
    createParcelRow,
    createParcelSummary,
    filterParcelPackageRows,
    getParcelOperatorKey,
} from "../js/reports/parcel-sweeper/model.js";
import {
    getParcelState,
    replaceParcelRows,
    resetParcelReport,
    restoreParcelState,
    subscribeParcelState,
    toggleParcelOperatorBulky,
    updateParcelFilter,
} from "../js/reports/parcel-sweeper/state.js";
import {
    exportParcelSession,
    getParcelSummary,
    importParcelSession,
} from "../js/reports/parcel-sweeper/controller.js";

const commonOperator = "[Ops100]ALEX TESTE SOUZA";
const secondCommonOperator = "[Ops200]ALEX TESTE LIMA";
const bulkyOperator = "[Ops300]CAIO SANTOS SILVA";
const commonKey = getParcelOperatorKey(commonOperator);
const bulkyKey = getParcelOperatorKey(bulkyOperator);

function createTestRows() {
    return [
        [commonOperator, 100, 2], [secondCommonOperator, 90, 2], [bulkyOperator, 20, 10],
    ].flatMap(([operator, count, gap]) => Array.from({ length: count }, (_, index) => createParcelRow({
        operator: index % 2 === 0 ? operator : operator.toLowerCase(),
        trackingNumber: `BR${operator.match(/\d+/)[0]}${index}`,
        scannedStatus: "LMHub_Received",
        countType: index % 3 === 0 ? "Exception" : "Backlog",
        scannedTime: new Date(Date.UTC(2026, 9, 2, 14, 0, index * gap))
            .toISOString().slice(0, 19).replace("T", " "),
        agingTime: "5h",
    })));
}

test("sem correções, os resultados Sim/Não seguem a classificação automática", () => {
    const rows = createTestRows();
    replaceParcelRows(rows, "teste.csv");
    assert.deepEqual(getParcelState().operatorKindOverrides, {});
    assert.deepEqual(getParcelSummary().operatorStats.map(operator => operator.packageKind),
        ["common", "common", "bulky"]);
    assert.equal(getParcelSummary().commonRows.length, 190);
    assert.equal(getParcelSummary().bulkyRows.length, 20);
});

test("alternar Não para Sim move todos os pacotes daquele operador sem alterar totais ou algoritmo", () => {
    const rows = createTestRows();
    replaceParcelRows(rows);
    const before = getParcelSummary();
    const originalRows = getParcelState().rows;
    assert.equal(toggleParcelOperatorBulky(commonKey.toUpperCase()), true);
    const after = getParcelSummary();
    assert.equal(after.commonRows.length, 90);
    assert.equal(after.bulkyRows.length, 120);
    assert.ok(after.commonRows.every(row => getParcelOperatorKey(row.operator) !== commonKey));
    assert.equal(after.operatorStats[0].packageKind, "bulky");
    assert.equal(after.operatorStats[1].packageKind, "common");
    assert.equal(after.operatorStats[2].packageKind, "bulky");
    for (const metric of ["totalRows", "scannedCount", "unscannedCount", "backlogCount", "exceptionCount"]) {
        assert.equal(after[metric], before[metric]);
    }
    assert.deepEqual(after.agingDistribution, before.agingDistribution);
    assert.deepEqual(after.operatorStats.map(operator => [operator.count, operator.percentage]),
        before.operatorStats.map(operator => [operator.count, operator.percentage]));
    assert.deepEqual(getParcelState().rows, originalRows);
    assert.deepEqual(classifyParcelOperators(rows).map(operator => operator.packageKind),
        ["common", "common", "bulky"]);
    assert.equal(toggleParcelOperatorBulky(commonKey), true);
    assert.equal(getParcelSummary().commonRows.length, 190);
    assert.equal(getParcelSummary().bulkyRows.length, 20);
});

test("alternar Sim para Não move os volumosos para comuns e mantém o filtro ativo", () => {
    replaceParcelRows(createTestRows());
    updateParcelFilter("exception");
    const events = [];
    const unsubscribe = subscribeParcelState((snapshot, event) => events.push({ snapshot, event }));
    try {
        assert.equal(toggleParcelOperatorBulky(bulkyKey), true);
        const summary = getParcelSummary();
        assert.equal(summary.commonRows.length, 210);
        assert.equal(summary.bulkyRows.length, 0);
        assert.equal(getParcelState().activeFilter, "exception");
        assert.equal(getParcelState().operatorKindOverrides[bulkyKey], false);
        assert.equal(filterParcelPackageRows(summary.commonRows, "exception").length, 71);
        assert.equal(events.length, 1);
        assert.equal(events[0].event.type, "parcel-operator-kind-updated");
        assert.equal(events[0].snapshot.operatorKindOverrides[bulkyKey], false);
        assert.equal(toggleParcelOperatorBulky(bulkyKey), true);
        assert.equal(getParcelSummary().bulkyRows.length, 20);
    } finally {
        unsubscribe();
    }
});

test("limpar e importar outro arquivo descartam as correções manuais", () => {
    const rows = createTestRows();
    replaceParcelRows(rows);
    toggleParcelOperatorBulky(commonKey);
    replaceParcelRows(rows, "outro.csv");
    assert.deepEqual(getParcelState().operatorKindOverrides, {});
    assert.equal(getParcelSummary().bulkyRows.length, 20);
    toggleParcelOperatorBulky(bulkyKey);
    resetParcelReport();
    assert.deepEqual(getParcelState().operatorKindOverrides, {});
    assert.equal(getParcelSummary().totalRows, 0);
    assert.equal(toggleParcelOperatorBulky(bulkyKey), false);
});

test("sessão do módulo preserva correções Sim e Não sem afetar sessões antigas", () => {
    const rows = createTestRows();
    replaceParcelRows(rows, "teste.csv");
    updateParcelFilter("backlog");
    toggleParcelOperatorBulky(commonKey);
    toggleParcelOperatorBulky(bulkyKey);
    const saved = JSON.parse(JSON.stringify(exportParcelSession()));
    assert.deepEqual(saved.operatorKindOverrides, { [commonKey]: true, [bulkyKey]: false });
    resetParcelReport();
    assert.equal(importParcelSession(saved), true);
    assert.equal(getParcelState().activeFilter, "backlog");
    assert.equal(getParcelSummary().bulkyRows.length, 100);
    assert.equal(getParcelSummary().commonRows.length, 110);
    const copy = getParcelState();
    copy.operatorKindOverrides[commonKey] = false;
    assert.equal(getParcelState().operatorKindOverrides[commonKey], true);
    assert.equal(restoreParcelState({ rows }), true);
    assert.deepEqual(getParcelState().operatorKindOverrides, {});
    assert.equal(getParcelSummary().bulkyRows.length, 20);
});

test("ignora operadores inexistentes, sem bipagem e fora de Ops; valida correções restauradas", () => {
    const rows = [...createTestRows(),
        createParcelRow({ trackingNumber: "BRMAIL", operator: "nome@empresa.com", scannedStatus: "LMHub_Received", countType: "Backlog" }),
        createParcelRow({ trackingNumber: "BRMISSING", operator: "[Ops900]SEM BIPAGEM", scannedStatus: "-", countType: "Missing" }),
    ];
    replaceParcelRows(rows);
    for (const key of ["nome@empresa.com", "[Ops900]SEM BIPAGEM", "[Ops999]DESCONHECIDO", "", null, "__proto__"]) {
        assert.equal(toggleParcelOperatorBulky(key), false);
    }
    assert.deepEqual(getParcelState().operatorKindOverrides, {});
    restoreParcelState({ rows, operatorKindOverrides: {
        [commonKey.toUpperCase()]: true,
        [getParcelOperatorKey(secondCommonOperator)]: "true",
        [bulkyKey]: false,
        "[Ops900]SEM BIPAGEM": true,
        "[Ops999]DESCONHECIDO": true,
    } });
    assert.deepEqual(getParcelState().operatorKindOverrides, { [commonKey]: true, [bulkyKey]: false });
    for (const invalid of [null, [], "invalid", 123]) {
        restoreParcelState({ rows, operatorKindOverrides: invalid });
        assert.deepEqual(getParcelState().operatorKindOverrides, {});
    }
    const inheritedOverride = Object.create({ [commonKey]: true });
    assert.equal(createParcelSummary(rows, inheritedOverride).bulkyRows.length, 20);
});
