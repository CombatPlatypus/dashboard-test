function getSelectElement(select) {
    if (
        !(select instanceof
            HTMLSelectElement)
    ) {
        throw new TypeError(
            "O controle informado não é um select.",
        );
    }

    return select;
}

function hasSelect2() {
    return Boolean(
        window.jQuery &&
        typeof window.jQuery.fn
            ?.select2 === "function",
    );
}

function refreshSelectControl(select) {
    const selectElement =
        getSelectElement(select);

    if (!hasSelect2()) {
        return;
    }

    if (
        !selectElement.classList.contains(
            "select2-hidden-accessible",
        ) &&
        typeof window
            .initializeSelect2Fields ===
            "function"
    ) {
        window.initializeSelect2Fields(
            selectElement,
        );
    }

    if (
        selectElement.classList.contains(
            "select2-hidden-accessible",
        )
    ) {
        const selectControl =
            window.jQuery(
                selectElement,
            );

        const select2Instance =
            selectControl.data(
                "select2",
            );

        if (
            select2Instance &&
            typeof select2Instance
                ._syncAttributes ===
                "function"
        ) {
            select2Instance
                ._syncAttributes();
        }

        selectControl.trigger(
            "change.select2",
        );
    }
}

function onSelectControlChange(
    select,
    namespace,
    listener,
) {
    const selectElement =
        getSelectElement(select);

    if (hasSelect2()) {
        window
            .jQuery(selectElement)
            .off(
                `change.${namespace}`,
            )
            .on(
                `change.${namespace}`,
                listener,
            );

        return;
    }

    selectElement.addEventListener(
        "change",
        listener,
    );
}

export {
    onSelectControlChange,
    refreshSelectControl,
};
