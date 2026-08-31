import {
    getReceiptState,
    getReceiptSummary,
    subscribeReceiptState,
} from "./receipt-state.js";

/* FORMATADORES */

const receiptProgressQuantityFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

const receiptProgressPercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        },
    );

/* FORMATA UMA QUANTIDADE */

function formatReceiptProgressQuantity(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    return receiptProgressQuantityFormatter
        .format(
            value,
        );
}

/* LOCALIZA OS ELEMENTOS */

function getReceiptProgressElements() {
    return {
        received:
            document.getElementById(
                "receiptProgressReceived",
            ),

        expected:
            document.getElementById(
                "receiptProgressExpected",
            ),

        percentage:
            document.getElementById(
                "receiptProgressPercentage",
            ),

        bar:
            document.getElementById(
                "receiptProgressBar",
            ),

        fill:
            document.getElementById(
                "receiptProgressFill",
            ),
    };
}

/* VERIFICA OS ELEMENTOS */

function hasReceiptProgressElements(
    elements,
) {
    return Object.values(
        elements,
    ).every(
        function (element) {
            return element instanceof
                HTMLElement;
        },
    );
}

/* RENDERIZA O INDICADOR */

function renderReceiptProgress(
    elements,
    state,
) {
    const summary =
        getReceiptSummary();

    const expectedVolume =
        state.expectedVolume;

    const receivedVolume =
        state.operators.length > 0
            ? summary.receivedVolume
            : null;

    elements.received.textContent =
        formatReceiptProgressQuantity(
            receivedVolume,
        );

    elements.expected.textContent =
        formatReceiptProgressQuantity(
            expectedVolume,
        );

    const canCalculate =
        expectedVolume !== null &&
        expectedVolume !== undefined &&
        expectedVolume > 0 &&
        receivedVolume !== null &&
        receivedVolume !== undefined;

    if (!canCalculate) {
        elements.percentage.textContent =
            "—";

        elements.fill.style.width =
            "0%";

        elements.bar.setAttribute(
            "aria-valuenow",
            "0",
        );

        elements.bar.setAttribute(
            "aria-valuetext",
            "Aguardando os volumes esperado e recebido.",
        );

        return;
    }

    const progressRatio =
        receivedVolume /
        expectedVolume;

    const progressPercentage =
        progressRatio * 100;

    /*
     * A barra visual para em 100%,
     * mas o texto pode mostrar valores superiores.
     */

    const visiblePercentage =
        Math.min(
            Math.max(
                progressPercentage,
                0,
            ),
            100,
        );

    const formattedPercentage =
        receiptProgressPercentageFormatter
            .format(
                progressRatio,
            );

    elements.percentage.textContent =
        formattedPercentage;

    elements.fill.style.width =
        `${visiblePercentage}%`;

    elements.bar.setAttribute(
        "aria-valuenow",
        String(
            visiblePercentage,
        ),
    );

    elements.bar.setAttribute(
        "aria-valuetext",
        `${formattedPercentage} do volume esperado foi recebido.`,
    );
}

/* INICIALIZAÇÃO */

function initializeReceiptCharts() {
    const elements =
        getReceiptProgressElements();

    if (
        !hasReceiptProgressElements(
            elements,
        )
    ) {
        return false;
    }

    if (
        elements.bar.dataset
            .receiptProgressInitialized ===
        "true"
    ) {
        return true;
    }

    elements.bar.dataset
        .receiptProgressInitialized =
            "true";

    subscribeReceiptState(
        function (state) {
            renderReceiptProgress(
                elements,
                state,
            );
        },
    );

    renderReceiptProgress(
        elements,
        getReceiptState(),
    );

    return true;
}

export {
    initializeReceiptCharts,
};
