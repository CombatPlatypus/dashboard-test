import assert from "node:assert/strict";
import { test } from "node:test";
import { requestReverseImportType } from "../js/reports/reverse/import-type.js";
import { initializeReverseImport } from "../js/reports/reverse/import.js";
import { getReverseState, resetReverseReport, upsertReverseTransfer } from "../js/reports/reverse/state.js";

function setup(t) {
    class Element {
        constructor() { this.listeners = new Map(); this.dataset = {}; }
        addEventListener(name, listener) { this.listeners.set(name, listener); }
        removeEventListener(name, listener) {
            if (this.listeners.get(name) === listener) this.listeners.delete(name);
        }
        emit(name) { return this.listeners.get(name)?.({ preventDefault() {} }); }
        setAttribute(name, value) { this[name] = value; }
        removeAttribute(name) { delete this[name]; }
    }
    class Button extends Element {}
    class Input extends Element {}
    const form = new Element();
    form.reset = () => { form.selected = null; };
    form.querySelector = () => form.selected ? { value: form.selected } : null;
    const confirm = new Button();
    const input = new Input();
    const button = new Button();
    const elements = new Map([
        ["reverseImportTypeModal", new Element()], ["reverseImportTypeForm", form],
        ["reverseImportTypeFileName", new Element()], ["reverseImportTypeConfirm", confirm],
        ["reverseFileInput", input], ["reverseImportActionButton", button],
    ]);
    const root = { querySelector: selector => elements.get(selector.slice(1)), getElementById: () => null };
    const query = new Element();
    query.on = query.addEventListener;
    query.off = query.removeEventListener;
    query.data = () => undefined;
    const modal = { opens: 0, closes: 0,
        open() { this.opens++; },
        close() { this.closes++; query.emit("closed.zf.reveal"); },
    };
    for (const [name, value] of Object.entries({
        HTMLElement: Element, HTMLButtonElement: Button, HTMLInputElement: Input,
        document: root,
        window: { jQuery: () => query, Foundation: { Reveal: class { constructor() { return modal; } } },
            alert(message) { throw new Error(message); } },
    })) {
        const previous = Object.getOwnPropertyDescriptor(globalThis, name);
        Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
        t.after(() => previous
            ? Object.defineProperty(globalThis, name, previous)
            : delete globalThis[name]);
    }
    t.after(resetReverseReport);
    return { root, form, confirm, modal, input, button, query, elements };
}

test("Reveal exige seleção, aceita os quatro tipos e limpa a escolha entre arquivos", async t => {
    const { root, form, confirm, modal, query, elements } = setup(t);
    for (const type of ["return", "missorted", "liquidate", "intercept"]) {
        const pending = requestReverseImportType({ name: `${type}.xlsx` }, root);
        assert.equal(form.selected, null);
        assert.equal(confirm.disabled, true);
        assert.equal(elements.get("reverseImportTypeFileName").textContent, `${type}.xlsx`);
        form.emit("submit");
        assert.equal(modal.closes, modal.opens - 1);
        form.selected = type;
        form.emit("change");
        assert.equal(confirm.disabled, false);
        form.emit("submit");
        assert.equal(await pending, type === "intercept" ? "confiscated" : type);
        assert.equal(form.listeners.size, 0);
        assert.equal(query.listeners.size, 0);
    }
});

test("fechar o Reveal cancela a importação antes da leitura e preserva dados existentes", async t => {
    const { root, modal, input, button } = setup(t);
    upsertReverseTransfer({ to: "TOEXISTENTE", quantities: { return: 2 } });
    const previousState = getReverseState();
    let reads = 0;
    input.files = [{ name: "reversa.xlsx", arrayBuffer() { reads++; } }];
    assert.equal(initializeReverseImport(root), true);
    const pending = input.emit("change");
    assert.equal(button.disabled, true);
    assert.equal(reads, 0);
    modal.close();
    await pending;
    assert.equal(reads, 0);
    assert.equal(button.disabled, false);
    assert.equal(button["aria-busy"], undefined);
    assert.deepEqual(getReverseState(), previousState);
});

test("confirmação ocorre antes da leitura e Intercept classifica a TO inteira como Confiscado", async t => {
    const { root, form, input, button } = setup(t);
    let reads = 0;
    const rows = [["", "Total Scanned Orders", "Total Actual Orders"], ["TO Number", "TOTESTE"], ["Total Orders", 2, 2]];
    rows.push(["SPX Tracking Number", "Journey Type"], ["BR1", "Forward"], ["BR2", "Return"]);
    window.XLSX = { read: () => ({ SheetNames: ["Sheet1"], Sheets: { Sheet1: {} } }),
        utils: { sheet_to_json: () => rows } };
    input.files = [{ name: "reversa.xlsx", size: 1, async arrayBuffer() { reads++; return new ArrayBuffer(0); } }];
    initializeReverseImport(root);
    const pending = input.emit("change");
    assert.equal(reads, 0);
    form.selected = "intercept";
    form.emit("change");
    form.emit("submit");
    await pending;
    assert.equal(reads, 1);
    assert.equal(button.disabled, false);
    const transfer = getReverseState().transfers[0];
    assert.equal(transfer.quantity, 2);
    assert.deepEqual(transfer.quantities, { return: 0, missorted: 0, liquidate: 0, confiscated: 2 });
});
