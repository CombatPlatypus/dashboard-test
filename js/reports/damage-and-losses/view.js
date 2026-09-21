import {
    getDamageAndLossesState,
    getDamageAndLossesSummary,
    subscribeDamageAndLossesState,
} from "./state.js";

const damageQuantityFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

let damageViewElements = null;

function getDamageViewElements(
    rootElement,
) {
    return {
        total:
            rootElement.querySelector(
                "#damageTotalValue",
            ),

        hub:
            rootElement.querySelector(
                "#damageHubValue",
            ),

        soc:
            rootElement.querySelector(
                "#damageSocValue",
            ),

        solid:
            rootElement.querySelector(
                "#damageSolidValue",
            ),

        liquid:
            rootElement.querySelector(
                "#damageLiquidValue",
            ),

        glass:
            rootElement.querySelector(
                "#damageGlassValue",
            ),
    };
}

function hasDamageViewElements(
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

function formatDamageQuantity(
    value,
    hasData,
) {
    return hasData
        ? damageQuantityFormatter
            .format(value)
        : "—";
}

function renderDamageAndLossesView(
    state = getDamageAndLossesState(),
) {
    if (!damageViewElements) {
        return false;
    }

    const summary =
        getDamageAndLossesSummary(
            state,
        );

    damageViewElements.total
        .textContent =
            formatDamageQuantity(
                summary.total,
                summary.hasData,
            );

    damageViewElements.hub
        .textContent =
            formatDamageQuantity(
                summary.hub,
                summary.hasData,
            );

    damageViewElements.soc
        .textContent =
            formatDamageQuantity(
                summary.soc,
                summary.hasData,
            );

    const hasComposition =
        summary.compositionTotal > 0;

    damageViewElements.solid
        .textContent =
            formatDamageQuantity(
                summary.solid,
                hasComposition,
            );

    damageViewElements.liquid
        .textContent =
            formatDamageQuantity(
                summary.liquid,
                hasComposition,
            );

    damageViewElements.glass
        .textContent =
            formatDamageQuantity(
                summary.glass,
                hasComposition,
            );

    return true;
}

function initializeDamageAndLossesView(
    rootElement =
        document.getElementById(
            "damage-and-losses",
        ),
) {
    const panel =
        rootElement instanceof HTMLElement
            ? rootElement
            : null;

    if (!panel) {
        return false;
    }

    const elements =
        getDamageViewElements(
            panel,
        );

    if (
        !hasDamageViewElements(
            elements,
        )
    ) {
        return false;
    }

    if (
        panel.dataset
            .damageViewInitialized ===
        "true"
    ) {
        damageViewElements =
            elements;

        return true;
    }

    panel.dataset
        .damageViewInitialized =
            "true";

    damageViewElements = elements;

    subscribeDamageAndLossesState(
        renderDamageAndLossesView,
    );

    renderDamageAndLossesView();

    return true;
}

export {
    initializeDamageAndLossesView,
    renderDamageAndLossesView,
};
