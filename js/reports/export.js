/* CONVERTE UM CANVAS EM BLOB */

function createCanvasBlob(
    canvas,
) {
    return new Promise(
        function (
            resolve,
            reject,
        ) {
            canvas.toBlob(
                function (blob) {
                    if (!blob) {
                        reject(
                            new Error(
                                "Não foi possível criar a imagem do relatório.",
                            ),
                        );

                        return;
                    }

                    resolve(blob);
                },
                "image/png",
            );
        },
    );
}

/* GERA A IMAGEM DE UM RELATÓRIO */

async function createReportImageBlob(
    element,
) {
    if (!(element instanceof HTMLElement)) {
        throw new Error(
            "A área do relatório não foi encontrada.",
        );
    }

    if (
        typeof window.html2canvas !==
        "function"
    ) {
        throw new Error(
            "A biblioteca html2canvas não foi carregada.",
        );
    }

    const canvas =
        await window.html2canvas(
            element,
            {
                backgroundColor: "#1f1f1f",
                scale: 2,
                useCORS: true,
                logging: false,
            },
        );

    return createCanvasBlob(
        canvas,
    );
}

/* BAIXA UM BLOB COMO ARQUIVO */

function downloadReportBlob(
    blob,
    fileName,
) {
    const objectUrl =
        URL.createObjectURL(
            blob,
        );

    const link =
        document.createElement(
            "a",
        );

    link.href =
        objectUrl;

    link.download =
        fileName;

    document.body.appendChild(
        link,
    );

    link.click();
    link.remove();

    window.setTimeout(
        function () {
            URL.revokeObjectURL(
                objectUrl,
            );
        },
        0,
    );
}

export {
    createReportImageBlob,
    downloadReportBlob,
};