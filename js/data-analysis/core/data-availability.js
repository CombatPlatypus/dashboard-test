const DATA_DEPENDENT_SELECTOR =
    "[data-analysis-requires-data]";

function isDisableableControl(
    element,
) {
    return (
        element instanceof
            HTMLButtonElement ||
        element instanceof
            HTMLInputElement ||
        element instanceof
            HTMLSelectElement ||
        element instanceof
            HTMLTextAreaElement
    );
}

function setControlEnabled(
    element,
    enabled,
) {
    if (
        isDisableableControl(
            element,
        )
    ) {
        element.disabled = !enabled;

        return;
    }

    element.setAttribute(
        "aria-disabled",
        String(!enabled),
    );

    element.closest(
        ".tabs-title",
    )?.classList.toggle(
        "is-disabled",
        !enabled,
    );

    if (!enabled) {
        if (
            !element.hasAttribute(
                "data-analysis-tabindex",
            )
        ) {
            element.setAttribute(
                "data-analysis-tabindex",
                element.getAttribute(
                    "tabindex",
                ) ?? "",
            );
        }

        element.setAttribute(
            "tabindex",
            "-1",
        );

        return;
    }

    const previousTabIndex =
        element.getAttribute(
            "data-analysis-tabindex",
        );

    if (previousTabIndex === "") {
        element.removeAttribute(
            "tabindex",
        );
    } else if (
        previousTabIndex !== null
    ) {
        element.setAttribute(
            "tabindex",
            previousTabIndex,
        );
    }

    element.removeAttribute(
        "data-analysis-tabindex",
    );
}

function initializeDataAvailability(
    rootElement,
    store,
) {
    const controls =
        Array.from(
            rootElement.querySelectorAll(
                DATA_DEPENDENT_SELECTOR,
            ),
        );

    rootElement.addEventListener(
        "click",
        function (event) {
            const eventTarget =
                event.target instanceof
                    Element
                    ? event.target
                    : null;

            const disabledControl =
                eventTarget?.closest(
                    `${DATA_DEPENDENT_SELECTOR}[aria-disabled="true"]`,
                );

            if (!disabledControl) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
        },
        true,
    );

    return store.subscribe(
        function (snapshot) {
            controls.forEach(
                function (control) {
                    setControlEnabled(
                        control,
                        snapshot.hasData,
                    );
                },
            );
        },
    );
}

export {
    DATA_DEPENDENT_SELECTOR,
    initializeDataAvailability,
    setControlEnabled,
};
