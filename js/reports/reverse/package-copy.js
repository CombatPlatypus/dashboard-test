import {
    setReportNotification,
} from "../report-notifications.js";

const reversePackageQuantityFormatter =
    new Intl.NumberFormat("pt-BR");

function getReversePackagePairs(
    body,
) {
    return Array.from(
        body.querySelectorAll("tr"),
        row => [row.cells[0]?.textContent.trim(), row.cells[1]?.textContent.trim()],
    ).filter(pair => pair.every(value => value && value !== "—" && value !== "-"));
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
        getReversePackagePairs(
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

            const pairs =
                getReversePackagePairs(
                    body,
                );

            if (pairs.length === 0) {
                setReportNotification({
                    reportId: "reverse",
                    type: "warning",
                    message:
                        `Nenhum par de BR e TO para copiar na tabela de ${label}.`,
                });

                return;
            }

            const originalTitle =
                button.title;

            button.dataset
                .reversePackageCopyBusy =
                "true";
            button.disabled = true;
            button.title = "Copiando BRs e TOs...";
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
                        pairs.map(pair => pair.join("\t")).join("\n"),
                    );

                setReportNotification({
                    reportId: "reverse",
                    type: "success",
                    message:
                        `${reversePackageQuantityFormatter.format(
                            pairs.length,
                        )} ${pairs.length === 1
                            ? `BR de ${label} copiado com a respectiva TO`
                            : `BRs de ${label} copiados com as respectivas TOs`}.`,
                });
            } catch {
                setReportNotification({
                    reportId: "reverse",
                    type: "error",
                    message:
                        "Não foi possível copiar os BRs e as TOs. Verifique a permissão da área de transferência e acesse o dashboard por localhost ou HTTPS.",
                });
            } finally {
                delete button.dataset
                    .reversePackageCopyBusy;

                button.disabled =
                    getReversePackagePairs(
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
};
