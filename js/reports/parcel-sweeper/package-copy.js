import { setReportNotification } from "../report-notifications.js";

const quantityFormatter = new Intl.NumberFormat("pt-BR");

function getParcelPackageCodes(body) {
    return Array.from(body.querySelectorAll("tr"), row =>
        row.cells[1]?.textContent.trim() ?? "",
    ).filter(code => code && code !== "—" && code !== "-");
}

function bindParcelPackageCopyButton(button, body, label) {
    if (!(button instanceof HTMLButtonElement) || !(body instanceof HTMLElement)) {
        return false;
    }

    if (button.dataset.parcelPackageCopyInitialized === "true") {
        return true;
    }

    button.dataset.parcelPackageCopyInitialized = "true";
    button.disabled = getParcelPackageCodes(body).length === 0;

    button.addEventListener("click", async () => {
        if (button.dataset.parcelCopyBusy === "true") {
            return;
        }

        // Read every rendered row, including those outside the scroll viewport.
        // This also follows the current filter, sorting and manual classification.
        const codes = getParcelPackageCodes(body);
        if (codes.length === 0) {
            setReportNotification({ reportId: "parcel", type: "warning",
                message: `Nenhum BR para copiar na tabela de ${label} com o filtro atual.` });
            return;
        }

        const originalTitle = button.title;
        button.dataset.parcelCopyBusy = "true";
        button.disabled = true;
        button.title = "Copiando BRs...";
        button.setAttribute("aria-busy", "true");

        try {
            if (typeof navigator.clipboard?.writeText !== "function") {
                throw new Error("A cópia de texto não está disponível neste navegador.");
            }

            await navigator.clipboard.writeText(codes.join("\n"));
            setReportNotification({ reportId: "parcel", type: "success",
                message: `${quantityFormatter.format(codes.length)} ${codes.length === 1 ? "BR" : "BRs"} de ${label} ${codes.length === 1 ? "copiado" : "copiados"}.` });
        } catch {
            setReportNotification({ reportId: "parcel", type: "error",
                message: "Não foi possível copiar os BRs. Verifique a permissão da área de transferência e acesse o dashboard por localhost ou HTTPS." });
        } finally {
            delete button.dataset.parcelCopyBusy;
            button.disabled = getParcelPackageCodes(body).length === 0;
            button.title = originalTitle;
            button.removeAttribute("aria-busy");
        }
    });

    return true;
}

export { bindParcelPackageCopyButton, getParcelPackageCodes };
