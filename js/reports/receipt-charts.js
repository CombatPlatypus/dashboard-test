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

const receiptErrorRateFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        },
    );

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

/* ELEMENTOS */

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

        barLabel:
            document.getElementById(
                "receiptProgressBarLabel",
            ),

        difference:
            document.getElementById(
                "receiptProgressDifference",
            ),

        errorRate:
            document.getElementById(
                "receiptProgressErrorRate",
            ),
    };
}

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

/* DIFERENÇA ENTRE ESPERADO E RECEBIDO */

function getReceiptDifferenceText(
    expectedVolume,
    receivedVolume,
) {
    const difference =
        expectedVolume -
        receivedVolume;

    if (difference > 0) {
        return (
            `Faltam ` +
            `${formatReceiptProgressQuantity(difference)} pacotes`
        );
    }

    if (difference < 0) {
        return (
            `Excedente de ` +
            `${formatReceiptProgressQuantity(
                Math.abs(difference),
            )} pacotes`
        );
    }

    return "Volume esperado atingido";
}

/* TAXA DE ERROS */

function formatReceiptErrorRate(
    totalErrors,
    receivedVolume,
) {
    if (
        totalErrors === null ||
        totalErrors === undefined ||
        receivedVolume === null ||
        receivedVolume === undefined ||
        receivedVolume <= 0
    ) {
        return "—";
    }

    return receiptErrorRateFormatter
        .format(
            totalErrors /
                receivedVolume,
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

    elements.errorRate.textContent =
        formatReceiptErrorRate(
            summary.totalErrors,
            receivedVolume,
        );

    const hasExpectedVolume =
        expectedVolume !== null &&
        expectedVolume !== undefined &&
        expectedVolume > 0;

    const hasReceivedVolume =
        receivedVolume !== null &&
        receivedVolume !== undefined;

    if (
        !hasExpectedVolume ||
        !hasReceivedVolume
    ) {
        elements.percentage.textContent =
            "—";

        elements.fill.style.width =
            "0%";

        elements.barLabel.textContent =
            "Aguardando informações";

        elements.difference.textContent =
            hasExpectedVolume
                ? "Importe o recebimento para comparar."
                : "Informe o volume esperado para comparar.";

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

    elements.barLabel.textContent =
        `${formattedPercentage} recebido`;

    elements.difference.textContent =
        getReceiptDifferenceText(
            expectedVolume,
            receivedVolume,
        );

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
