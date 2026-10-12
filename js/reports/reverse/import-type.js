import {
    normalizeReverseType,
} from "./model.js";

function requestReverseImportType(
    file,
    rootElement = document,
) {
    const modal = rootElement.querySelector("#reverseImportTypeModal");
    const form = rootElement.querySelector("#reverseImportTypeForm");
    const fileName = rootElement.querySelector("#reverseImportTypeFileName");
    const confirmButton = rootElement.querySelector("#reverseImportTypeConfirm");

    if (
        !modal || !form || !fileName || !confirmButton ||
        typeof window.jQuery !== "function" ||
        typeof window.Foundation?.Reveal !== "function"
    ) {
        throw new Error("A janela de seleção do tipo da reversa não está disponível.");
    }

    form.reset();
    fileName.textContent = file.name;
    confirmButton.disabled = true;

    const modalQuery = window.jQuery(modal);
    const modalInstance = modalQuery.data("zfPlugin") ||
        new window.Foundation.Reveal(modalQuery);

    return new Promise(function (resolve) {
        let finished = false;

        function getSelectedType() {
            const input = form.querySelector('input[name="reverseImportType"]:checked');
            return normalizeReverseType(input?.value);
        }

        function handleChange() {
            confirmButton.disabled = !getSelectedType();
        }

        function finish(type, closeModal = true) {
            if (finished) {
                return;
            }

            finished = true;
            form.removeEventListener("submit", handleSubmit);
            form.removeEventListener("change", handleChange);
            modalQuery.off("closed.zf.reveal", handleClosed);

            if (closeModal) {
                modalInstance.close();
            }

            resolve(type);
        }

        function handleSubmit(event) {
            event.preventDefault();
            const type = getSelectedType();
            if (type) {
                finish(type);
            }
        }

        function handleClosed() {
            finish(null, false);
        }

        form.addEventListener("submit", handleSubmit);
        form.addEventListener("change", handleChange);
        modalQuery.on("closed.zf.reveal", handleClosed);
        modalInstance.open();
    });
}

export { requestReverseImportType };
