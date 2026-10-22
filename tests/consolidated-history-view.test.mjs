import assert from "node:assert/strict";
import { test } from "node:test";
import { initializeConsolidatedView } from "../js/reports/damage-and-losses/consolidated-view.js";
import { getDamageAndLossesState, replaceDamageAndLossesData, resetDamageAndLossesState } from "../js/reports/damage-and-losses/state.js";
import { getLossesState, replaceLossesData, resetLossesState } from "../js/reports/damage-and-losses/losses-state.js";
import { formatOccurrenceDate } from "../js/reports/damage-and-losses/history.js";

test("tabelas e cópia usam o mês válido de cada histórico e limpam registros antigos ao atualizar", async t => {
    const previousGlobals = new Map();
    t.after(() => {
        resetDamageAndLossesState();
        resetLossesState();
        for (const [name, descriptor] of previousGlobals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else delete globalThis[name];
        }
    });
    class Element {
        constructor(id = "") {
            this.id = id; this.dataset = {}; this.children = []; this.textContent = "";
            this.handlers = new Map(); this.classList = { contains: () => true };
        }
        addEventListener(name, handler) { this.handlers.set(name, handler); }
        setAttribute(name, value) { this[name] = value; }
        removeAttribute(name) { delete this[name]; }
        appendChild(child) {
            if (child.id === "fragment") this.children.push(...child.children);
            else this.children.push(child);
        }
        replaceChildren(fragment) { this.children = [...fragment.children]; }
    }
    const ids = ["consolidatedHubValue", "consolidatedSocValue", "consolidatedLossRateValue",
        "consolidatedUnderReviewValue", "consolidatedConfirmedLossesValue", "consolidatedDamageHistoryBody",
        "consolidatedLossesHistoryBody", "consolidatedCopyDamageButton", "consolidatedCopyLossesButton",
        "consolidatedCompositionChart", "consolidatedCompositionUnderReview", "consolidatedCompositionLost",
        "consolidatedCompositionDamage"];
    const elements = new Map(ids.map(id => [id, new Element(id)]));
    const panel = new Element("consolidated-history");
    panel.querySelector = selector => elements.get(selector.slice(1));
    const root = new Element("damage-and-losses");
    root.querySelector = () => panel;
    const copied = [];
    for (const [name, value] of Object.entries({
        HTMLElement: Element,
        MutationObserver: class { observe() {} },
        window: { Chart: class {
            constructor(canvas, config) { Object.assign(this, config); }
            update() {} resize() {}
        } },
        document: {
            createElement: tag => new Element(tag),
            createDocumentFragment: () => new Element("fragment"),
            getElementById: () => null,
        },
        navigator: { clipboard: { writeText: async text => copied.push(text) } },
    })) {
        previousGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    }
    const now = new Date();
    const period = { monthIndex: now.getMonth(), year: now.getFullYear(), days: [] };
    const dateKey = (offset, day = 1) => {
        const date = new Date(now.getFullYear(), now.getMonth() + offset, day, 12);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };
    const current = dateKey(0), previous = dateKey(-1), older = dateKey(-2);
    replaceDamageAndLossesData({ ...period, history: [
        { date: current, packageCode: "AV-ATUAL-1", situation: "Recebido" },
        { date: dateKey(0, 2), packageCode: "AV-ATUAL-2", situation: "Não Recebido" },
        { date: previous, packageCode: "AV-ANTERIOR" },
        { date: older, packageCode: "AV-ANTIGO" },
    ] });
    replaceLossesData({ ...period, history: [
        { date: previous, packageCode: "PERDA-ANTERIOR", situation: "Lost" },
        { date: older, packageCode: "PERDA-ANTIGA" },
    ] });
    assert.equal(initializeConsolidatedView(root), true);
    const body = id => elements.get(id);
    const codes = id => body(id).children.map(row => row.children[1].textContent);
    const damageBody = "consolidatedDamageHistoryBody", lossesBody = "consolidatedLossesHistoryBody";
    const damageCopy = body("consolidatedCopyDamageButton"), lossesCopy = body("consolidatedCopyLossesButton");
    assert.deepEqual(codes(damageBody), ["AV-ATUAL-2", "AV-ATUAL-1"]);
    assert.deepEqual(codes(lossesBody), ["PERDA-ANTERIOR"]);
    assert.equal(getDamageAndLossesState().history.length, 4);
    assert.equal(getLossesState().history.length, 2);
    await damageCopy.handlers.get("click")();
    await lossesCopy.handlers.get("click")();
    assert.equal(copied[0], `Data\tCódigo BR\tSituação\n${formatOccurrenceDate(dateKey(0, 2))}\tAV-ATUAL-2\tNão Recebido\n${formatOccurrenceDate(current)}\tAV-ATUAL-1\tRecebido`);
    assert.equal(copied[1], `Data\tCódigo BR\tSituação\n${formatOccurrenceDate(previous)}\tPERDA-ANTERIOR\tLost`);
    replaceLossesData({ ...period, history: [
        { date: previous, packageCode: "PERDA-ANTERIOR" },
        { date: current, packageCode: "PERDA-ATUAL", situation: "Em Análise" },
    ] });
    assert.deepEqual(codes(lossesBody), ["PERDA-ATUAL"]);
    await lossesCopy.handlers.get("click")();
    assert.match(copied[2], /PERDA-ATUAL/);
    assert.doesNotMatch(copied[2], /PERDA-ANTERIOR/);
    replaceDamageAndLossesData({ ...period, history: [
        { date: current, packageCode: " " },
        { date: previous, packageCode: "AV-ANTERIOR" },
    ] });
    assert.deepEqual(codes(damageBody), ["AV-ANTERIOR"]);
    replaceDamageAndLossesData({ ...period, history: [{ date: older, packageCode: "AV-ANTIGO" }] });
    assert.equal(damageCopy.disabled, true);
    assert.deepEqual(codes(damageBody), Array(8).fill("—"));
    assert.equal(getDamageAndLossesState().history.length, 1);
    await damageCopy.handlers.get("click")();
    assert.equal(copied.length, 3);
    resetLossesState();
    assert.equal(lossesCopy.disabled, true);
    assert.deepEqual(codes(lossesBody), Array(8).fill("—"));
});
