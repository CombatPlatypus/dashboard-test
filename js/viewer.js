// RETORNA OS ELEMENTOS UTILIZADOS PELO VISUALIZADOR DE IMAGENS

function getImageViewerElements() {

    const imageViewer =
        document.getElementById(
            "imageViewer"
        );

    const viewerImage =
        document.getElementById(
            "viewerImage"
        );

    const closeImageViewerButton =
        document.getElementById(
            "closeImageViewer"
        );

    const imageViewerLoading =
        document.getElementById(
            "imageViewerLoading"
        );

    if (
        !imageViewer ||
        !viewerImage ||
        !imageViewerLoading ||
        !closeImageViewerButton
    ) {

        console.error(
            "Elementos do visualizador de imagens não foram encontrados.",
            {
                imageViewer,
                viewerImage,
                imageViewerLoading,
                closeImageViewerButton
            }
        );

        return null;
    }

    return {
        imageViewer,
        viewerImage,
        imageViewerLoading,
        closeImageViewerButton
    };
}

// ABRE O VISUALIZADOR COM A IMAGEM INFORMADA

export function openImageViewer(
    imageUrl,
    imageName = "Imagem"
) {

    if (!imageUrl) {

        console.error(
            "URL da imagem não informada."
        );

        return;
    }

    const viewerElements =
        getImageViewerElements();

    if (!viewerElements) {

        return;
    }

    const {
        imageViewer,
        viewerImage,
        imageViewerLoading
    } = viewerElements;

    imageViewerLoading.hidden =
        false;

    viewerImage.hidden =
        true;

    viewerImage.alt =
        imageName;

    imageViewer.hidden =
        false;

    imageViewer.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "image-viewer-open"
    );

    // INICIA O CARREGAMENTO DA IMAGEM APÓS PREPARAR O VISUALIZADOR

    viewerImage.src =
        imageUrl;

}

// FECHA O VISUALIZADOR E LIMPA A IMAGEM CARREGADA

export function closeImageViewer() {

    const viewerElements =
        getImageViewerElements();

    if (!viewerElements) {

        return;
    }

    const {
        imageViewer,
        viewerImage,
        imageViewerLoading
    } = viewerElements;

    imageViewer.hidden =
        true;

    imageViewer.setAttribute(
        "aria-hidden",
        "true"
    );

    viewerImage.hidden =
        true;

    // REMOVE A URL DA IMAGEM DEPOIS DE ESCONDER O ELEMENTO

    viewerImage.removeAttribute(
        "src"
    );

    viewerImage.alt =
        "";

    imageViewerLoading.hidden =
        false;

    document.body.classList.remove(
        "image-viewer-open"
    );

}

// INICIALIZA OS EVENTOS DO VISUALIZADOR DE IMAGENS

export function initializeImageViewer() {

    const viewerElements =
        getImageViewerElements();

    if (!viewerElements) {

        return;
    }

    const {
        imageViewer,
        viewerImage,
        imageViewerLoading,
        closeImageViewerButton
    } = viewerElements;


    // FECHA O VISUALIZADOR PELO BOTÃO

    closeImageViewerButton.addEventListener(
        "click",
        closeImageViewer
    );

    // FECHA O VISUALIZADOR AO CLICAR NO FUNDO

    imageViewer.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                imageViewer
            ) {

                closeImageViewer();

            }
        }
    );

    // EXIBE A IMAGEM DEPOIS QUE O CARREGAMENTO FOR CONCLUÍDO

    viewerImage.addEventListener(
        "load",
        () => {

            imageViewerLoading.hidden =
                true;

            viewerImage.hidden =
                false;
        }
    );

    // TRATA ERROS DURANTE O CARREGAMENTO DA IMAGEM

    viewerImage.addEventListener(
        "error",
        () => {

            imageViewerLoading.hidden =
                true;

            console.error(
                "Não foi possível carregar a imagem no viewer:",
                viewerImage.src
            );

            viewerImage.hidden =
                true;
        }
    );

    // FECHA O VISUALIZADOR AO PRESSIONAR A TECLA ESCAPE

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                !imageViewer.hidden
            ) {

                closeImageViewer();

            }

        }
    );
}