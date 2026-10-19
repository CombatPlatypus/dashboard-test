import {
    setReportNotification,
} from "../report-notifications.js";

const reversePackageQuantityFormatter =
    new Intl.NumberFormat("pt-BR");

function getReversePackageCodes(
    body,
) {
    return Array.from(
        body.querySelectorAll("tr"),
        function (row) {
            return row.cells[0]
                ?.textContent
                .trim() ?? "";
        },
    ).filter(
        function (code) {
            return code &&
                code !== "—" &&
                code !== "-";
        },
    );
}

function bindReversePackageCopyButton(
    button,
    body,
    label,
) {
    if (
        !(button instanceof
            HTMLButtonElement) ||
        !(body instanceof HTMLElement)
    ) {
        return false;
    }

    if (
        button.dataset
            .reversePackageCopyInitialized ===
        "true"
    ) {
        return true;
    }

    button.dataset
        .reversePackageCopyInitialized =
        "true";

    button.disabled =
        getReversePackageCodes(
            body,
        ).length === 0;

    button.addEventListener(
        "click",
        async function () {
            if (
                button.dataset
                    .reversePackageCopyBusy ===
                "true"
            ) {
                return;
            }

            const codes =
                getReversePackageCodes(
                    body,
                );

            if (codes.length === 0) {
                setReportNotification({
                    reportId: "reverse",
                    type: "warning",
                    message:
                        `Nenhum BR para copiar na tabela de ${label}.`,
                });

                return;
            }

            const originalTitle =
                button.title;

            button.dataset
                .reversePackageCopyBusy =
                "true";
            button.disabled = true;
            button.title = "Copiando BRs...";
            button.setAttribute(
                "aria-busy",
                "true",
            );

            try {
                if (
                    typeof navigator
                        .clipboard
                        ?.writeText !==
                    "function"
                ) {
                    throw new Error(
                        "A cópia de texto não está disponível neste navegador.",
                    );
                }

                await navigator.clipboard
                    .writeText(
                        codes.join("\n"),
                    );

                setReportNotification({
                    reportId: "reverse",
                    type: "success",
                    message:
                        `${reversePackageQuantityFormatter.format(
                            codes.length,
                        )} ${codes.length === 1
                            ? "BR"
                            : "BRs"} de ${label} ${codes.length === 1
                            ? "copiado"
                            : "copiados"}.`,
                });
            } catch {
                setReportNotification({
                    reportId: "reverse",
                    type: "error",
                    message:
                        "Não foi possível copiar os BRs. Verifique a permissão da área de transferência e acesse o dashboard por localhost ou HTTPS.",
                });
            } finally {
                delete button.dataset
                    .reversePackageCopyBusy;

                button.disabled =
                    getReversePackageCodes(
                        body,
                    ).length === 0;

                button.title =
                    originalTitle;

                button.removeAttribute(
                    "aria-busy",
                );
            }
        },
    );

    return true;
}

export {
    bindReversePackageCopyButton,
    getReversePackageCodes,
};
