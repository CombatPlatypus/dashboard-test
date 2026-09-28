import {
    buildDataAnalysis,
} from "./analysis-model.js";

import {
    createDataAnalysisView,
    getDataAnalysisElements,
} from "./analysis-view.js";

function initializeDataAnalysisModule({
    rootElement,
    previewSource,
}) {
    if (
        !previewSource ||
        typeof previewSource
            .subscribe !== "function"
    ) {
        throw new TypeError(
            "A análise de dados precisa de uma fonte de prévia observável.",
        );
    }

    const elements =
        getDataAnalysisElements(
            rootElement,
        );

    const view =
        createDataAnalysisView(
            elements,
        );

    const unsubscribe =
        previewSource.subscribe(
            function (
                previewSnapshot,
            ) {
                view.render(
                    buildDataAnalysis(
                        previewSnapshot,
                    ),
                );
            },
        );

    return Object.freeze({
        destroy: unsubscribe,
    });
}

export {
    initializeDataAnalysisModule,
};
