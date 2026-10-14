import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { requestReverseImportType } from "../js/reports/reverse/import-type.js";
import { initializeReverseImport } from "../js/reports/reverse/import.js";
import { getReverseState, resetReverseReport, upsertReverseTransfer } from "../js/reports/reverse/state.js";

const classificationPrompt = "Escolha uma das opções abaixo para classificar a TO.";

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
    class Image extends Element {}
    const form = new Element();
    form.reset = () => { form.selected = null; };
    form.querySelector = () => form.selected ? { value: form.selected } : null;
    const confirm = new Button();
    const input = new Input();
    const button = new Button();
    const instruction = new Element();
    instruction.textContent = classificationPrompt;
    const elements = new Map([
        ["reverseImportTypeModal", new Element()], ["reverseImportTypeForm", form],
        ["reverseImportTypeFileName", instruction], ["reverseImportTypeConfirm", confirm],
        ["reverseFileInput", input], ["reverseImportActionButton", button],
        ["reverseNotification", new Element()], ["reverseNotificationIcon", new Image()],
        ["reverseNotificationText", new Element()],
    ]);
    const root = { querySelector: selector => elements.get(selector.slice(1)), getElementById: id => elements.get(id) };
    const query = new Element();
    query.on = query.addEventListener;
    query.off = query.removeEventListener;
    query.data = () => undefined;
    const modal = { opens: 0, closes: 0,
        open() { this.opens++; },
        close() { this.closes++; query.emit("closed.zf.reveal"); },
    };
    for (const [name, value] of Object.entries({
        HTMLElement: Element, HTMLButtonElement: Button, HTMLInputElement: Input, HTMLImageElement: Image,
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
    for (const type of ["return", "missorted", "liquidate", "confiscated"]) {
        const pending = requestReverseImportType(root);
        assert.equal(form.selected, null);
        assert.equal(confirm.disabled, true);
        assert.equal(elements.get("reverseImportTypeFileName").textContent, classificationPrompt);
        form.emit("submit");
        assert.equal(modal.closes, modal.opens - 1);
        form.selected = type;
        form.emit("change");
        assert.equal(confirm.disabled, false);
        form.emit("submit");
        assert.equal(await pending, type);
        assert.equal(form.listeners.size, 0);
        assert.equal(query.listeners.size, 0);
    }
});

test("instrução de classificação da TO permanece fixa no HTML", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const instruction = html.match(/id="reverseImportTypeModal"[\s\S]*?<p(?:\s[^>]*)?>([^<]*)<\/p>/);
    assert.equal(instruction?.[1], classificationPrompt);
    const modal = html.match(/id="reverseImportTypeModal"[\s\S]*?<\/form>/)?.[0] ?? "";
    assert.match(modal, /value="confiscated" required> Confiscado<\/label>/);
    assert.doesNotMatch(modal, /Intercept/i);
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

test("confirmação ocorre antes da leitura e Confiscado classifica a TO inteira", async t => {
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
    form.selected = "confiscated";
    form.emit("change");
    form.emit("submit");
    await pending;
    assert.equal(reads, 1);
    assert.equal(button.disabled, false);
    const transfer = getReverseState().transfers[0];
    assert.equal(transfer.quantity, 2);
    assert.deepEqual(transfer.quantities, { return: 0, missorted: 0, liquidate: 0, confiscated: 2 });
});

test("notificação usa o código da TO sem prefixo duplicado, tipo escolhido e ação da importação", async t => {
    const { root, form, input, elements } = setup(t);
    const rows = [["", "Total Scanned Orders"], ["TO Number", "TO202610076CSM1"],
        ["SPX Tracking Number", "Journey Type"]];
    rows.push(...Array.from({ length: 153 }, (_, index) => [`BR${index}`, "Forward"]));
    window.XLSX = { read: () => ({ SheetNames: ["Sheet1"], Sheets: { Sheet1: {} } }),
        utils: { sheet_to_json: () => rows } };
    input.files = [{ name: "reversa.xlsx", size: 1, async arrayBuffer() { return new ArrayBuffer(0); } }];
    initializeReverseImport(root);

    for (const [type, label, action] of [
        ["missorted", "Missorted", "adicionada"], ["return", "Return", "atualizada"],
        ["liquidate", "Liquidate", "atualizada"], ["confiscated", "Confiscado", "atualizada"],
    ]) {
        const pending = input.emit("change");
        form.selected = type;
        form.emit("change");
        form.emit("submit");
        await pending;
        assert.equal(elements.get("reverseNotificationText").textContent,
            `TO202610076CSM1 - ${label} ${action}: 153 pacotes.`);
        assert.equal(elements.get("reverseNotification").dataset.notificationType, "success");
        assert.equal(getReverseState().transfers.length, 1);
    }
});
