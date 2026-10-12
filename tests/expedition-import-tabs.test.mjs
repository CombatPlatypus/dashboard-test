import assert from "node:assert/strict";
import { test } from "node:test";
import { initializeExpeditionImport } from "../js/reports/expedition/import.js";

test("botão de importação abre o seletor de arquivo nas quatro abas da expedição", t => {
    class Element {
        dataset = {};
        listeners = new Map();
        addEventListener(name, listener) { this.listeners.set(name, listener); }
    }
    class Button extends Element {
        click() { this.listeners.get("click")?.(); }
    }
    class Input extends Element {
        opens = 0;
        click() { this.opens += 1; }
    }
    const previousGlobals = new Map();
    for (const [name, value] of Object.entries({ HTMLButtonElement: Button, HTMLInputElement: Input })) {
        previousGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    }
    t.after(() => {
        for (const [name, descriptor] of previousGlobals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else delete globalThis[name];
        }
    });

    const button = new Button();
    const input = new Input();
    let activeTab = "#expedition-tables";
    const root = { querySelector(selector) {
        if (selector === "#expeditionImportActionButton") return button;
        if (selector === "#expeditionFileInput") return input;
        return { getAttribute: name => name === "href" ? activeTab : null };
    } };
    assert.equal(initializeExpeditionImport(root), true);
    assert.equal(initializeExpeditionImport(root), true);
    for (const [index, tab] of ["#expedition-tables", "#expedition-charts", "#expedition-mistakes", "#expedition-streets"].entries()) {
        activeTab = tab;
        button.click();
        assert.equal(input.opens, index + 1, `Importação disponível na aba ${tab}`);
    }
});
