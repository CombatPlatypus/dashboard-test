import assert from "node:assert/strict";
import {
    readFileSync,
} from "node:fs";
import {
    test,
} from "node:test";

import {
    bindReversePackageCopyButton,
    getReversePackageCodes,
} from "../js/reports/reverse/package-copy.js";

import {
    renderReversePackageTable,
} from "../js/reports/reverse/view.js";

function replaceGlobal(
    t,
    name,
    value,
) {
    const original =
        Object.getOwnPropertyDescriptor(
            globalThis,
            name,
        );

    Object.defineProperty(
        globalThis,
        name,
        {
            configurable: true,
            writable: true,
            value,
        },
    );

    t.after(
        function () {
            if (original) {
                Object.defineProperty(
                    globalThis,
                    name,
                    original,
                );
            } else {
                delete globalThis[name];
            }
        },
    );
}

class Element {
    constructor(
        tag = "div",
    ) {
        this.tag = tag;
        this.children = [];
        this.dataset = {};
        this.attributes = {};
        this.textContent = "";
    }

    get cells() {
        return this.children;
    }

    appendChild(
        child,
    ) {
        if (child.tag === "fragment") {
            this.children.push(
                ...child.children,
            );
        } else {
            this.children.push(child);
        }

        return child;
    }

    replaceChildren(
        ...children
    ) {
        this.children = [];

        children.forEach(
            child => this.appendChild(child),
        );
    }

    querySelectorAll(
        selector,
    ) {
        return selector === "tr"
            ? this.children
            : [];
    }

    setAttribute(
        name,
        value,
    ) {
        this.attributes[name] = value;
    }

    removeAttribute(
        name,
    ) {
        delete this.attributes[name];
    }
}

class Image extends Element {}

class Button extends Element {
    constructor() {
        super("button");
        this.disabled = false;
        this.listeners = [];
        this.title = "Copiar BRs";
    }

    addEventListener(
        name,
        listener,
    ) {
        if (name === "click") {
            this.listeners.push(
                listener,
            );
        }
    }

    async click() {
        await Promise.all(
            this.listeners.map(
                listener => listener(),
            ),
        );
    }
}

function setup(
    t,
    writeText = async function () {},
) {
    const notification =
        new Element();
    const icon =
        new Image();
    const text =
        new Element();

    const elements = {
        reverseNotification:
            notification,
        reverseNotificationIcon:
            icon,
        reverseNotificationText:
            text,
    };

    replaceGlobal(
        t,
        "HTMLElement",
        Element,
    );
    replaceGlobal(
        t,
        "HTMLButtonElement",
        Button,
    );
    replaceGlobal(
        t,
        "HTMLImageElement",
        Image,
    );
    replaceGlobal(
        t,
        "navigator",
        {
            clipboard: {
                writeText,
            },
        },
    );
    replaceGlobal(
        t,
        "document",
        {
            createElement:
                tag => new Element(tag),
            createDocumentFragment:
                () => new Element(
                    "fragment",
                ),
            getElementById:
                id => elements[id],
            querySelector:
                () => null,
        },
    );

    return {
        notification,
        text,
    };
}

test(
    "renderiza BR e TO na ordem importada e controla o botão de cópia",
    function (t) {
        setup(t);

        const body =
            new Element("tbody");
        const button =
            new Button();
        const section =
            new Element();

        renderReversePackageTable(
            body,
            [
                {
                    trackingNumber: "BR3",
                    to: "TOXXX1",
                },
                {
                    trackingNumber: "BR1",
                    to: "TOXXX1",
                },
                {
                    trackingNumber: "BR2",
                    to: "TOXXX2",
                },
            ],
            button,
            section,
        );

        assert.equal(button.disabled, false);
        assert.equal(section.hidden, false);
        assert.deepEqual(
            body.children.map(
                row => row.cells.map(
                    cell => cell.textContent,
                ),
            ),
            [
                ["BR3", "TOXXX1"],
                ["BR1", "TOXXX1"],
                ["BR2", "TOXXX2"],
            ],
        );

        renderReversePackageTable(
            body,
            [],
            button,
            section,
        );

        assert.equal(button.disabled, true);
        assert.equal(section.hidden, true);
        assert.equal(
            body.children[0]
                .children[0]
                .textContent,
            "—",
        );
        assert.equal(
            body.children[0]
                .children[0]
                .colSpan,
            2,
        );

        renderReversePackageTable(
            body,
            [],
            button,
            section,
            true,
        );

        assert.equal(section.hidden, false);
        assert.equal(button.disabled, true);
    },
);

test(
    "copia somente os códigos BR da tabela de reversa",
    async function (t) {
        const writes = [];
        const {
            notification,
            text,
        } = setup(
            t,
            async value => writes.push(value),
        );

        const body =
            new Element("tbody");
        const button =
            new Button();

        renderReversePackageTable(
            body,
            [
                {
                    trackingNumber: "BR1",
                    to: "TOXXX1",
                },
                {
                    trackingNumber: "BR2",
                    to: "TOXXX1",
                },
            ],
            button,
        );

        assert.deepEqual(
            getReversePackageCodes(body),
            ["BR1", "BR2"],
        );
        assert.equal(
            bindReversePackageCopyButton(
                button,
                body,
                "Return",
            ),
            true,
        );

        await button.click();

        assert.deepEqual(
            writes,
            ["BR1\nBR2"],
        );
        assert.equal(
            notification.dataset
                .notificationType,
            "success",
        );
        assert.equal(
            text.textContent,
            "2 BRs de Return copiados.",
        );
        assert.equal(button.disabled, false);
    },
);

test(
    "HTML conecta uma tabela e um botão para cada tipo de reversa",
    function () {
        const html =
            readFileSync(
                new URL(
                    "../index.html",
                    import.meta.url,
                ),
                "utf8",
            );

        for (
            const [typeKey, idSuffix]
            of [
                ["return", "Return"],
                ["missorted", "Missorted"],
                ["liquidate", "Liquidate"],
                ["confiscated", "Confiscated"],
            ]
        ) {
            const bodyId =
                `reverse${idSuffix}PackagesBody`;
            const buttonId =
                `reverseCopy${idSuffix}PackagesButton`;
            const sectionId =
                `reverse${idSuffix}PackagesSection`;

            assert.equal(
                html.split(
                    `id="${bodyId}"`,
                ).length - 1,
                1,
            );
            assert.equal(
                html.split(
                    `id="${buttonId}"`,
                ).length - 1,
                1,
            );
            assert.equal(
                html.split(
                    `id="${sectionId}"`,
                ).length - 1,
                1,
            );
            assert.match(
                html,
                new RegExp(
                    `<button id="${buttonId}" type="button" data-reverse-copy="${typeKey}"`,
                ),
            );
            assert.match(
                html,
                new RegExp(
                    `<div id="${sectionId}">`,
                ),
            );
        }

        assert.match(
            html,
            /<!-- TABELA DE BRs DE CADA RESPETIVA TO -->\s*<div id="reversePackageTables" class="distribution-tables flex-box-start">/,
        );
    },
);
