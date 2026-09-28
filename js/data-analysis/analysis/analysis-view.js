function requireElement(
    rootElement,
    selector,
) {
    const element =
        rootElement.querySelector(
            selector,
        );

    if (!element) {
        throw new Error(
            `Elemento da análise não encontrado: ${selector}`,
        );
    }

    return element;
}

function getDataAnalysisElements(
    rootElement,
) {
    return Object.freeze({
        cards:
            requireElement(
                rootElement,
                "#analysisCards",
            ),
        emptyState:
            requireElement(
                rootElement,
                "#analysisCardsEmpty",
            ),
        emptyStateText:
            requireElement(
                rootElement,
                "#analysisCardsEmpty h3",
            ),
    });
}

function createTextElement(
    tagName,
    text,
    className = "",
) {
    const element =
        document.createElement(
            tagName,
        );

    element.textContent = text;

    if (className) {
        element.classList.add(
            className,
        );
    }

    return element;
}

function createMetrics(metrics) {
    const metricsContainer =
        document.createElement(
            "div",
        );

    metricsContainer.classList.add(
        "analysis-metrics",
    );

    metrics.forEach(
        function (metric) {
            const metricElement =
                document.createElement(
                    "div",
                );

            metricElement.classList.add(
                "analysis-metric",
            );

            const metricLabel =
                createTextElement(
                    "span",
                    metric.label,
                );

            const metricValue =
                createTextElement(
                    "strong",
                    metric.value,
                );

            metricValue.title =
                metric.value;

            metricElement.append(
                metricLabel,
                metricValue,
            );

            metricsContainer
                .appendChild(
                    metricElement,
                );
        },
    );

    return metricsContainer;
}

function createFrequencyTable(
    frequency,
) {
    const table =
        document.createElement(
            "table",
        );

    const tableHead =
        document.createElement(
            "thead",
        );

    const tableBody =
        document.createElement(
            "tbody",
        );

    const headerRow =
        document.createElement(
            "tr",
        );

    table.classList.add(
        "analysis-summary-table",
    );

    headerRow.append(
        createTextElement(
            "th",
            "Valores da Coluna",
        ),
        createTextElement(
            "th",
            "Quantidade",
            "analysis-summary-number",
        ),
        createTextElement(
            "th",
            "Percentual",
            "analysis-summary-number",
        ),
    );

    tableHead.appendChild(
        headerRow,
    );

    if (
        frequency.items.length === 0
    ) {
        const emptyRow =
            document.createElement(
                "tr",
            );

        const emptyCell =
            createTextElement(
                "td",
                frequency.emptyMessage,
                "analysis-summary-empty",
            );

        emptyCell.colSpan = 3;
        emptyRow.appendChild(
            emptyCell,
        );
        tableBody.appendChild(
            emptyRow,
        );
    } else {
        const fragment =
            document.createDocumentFragment();

        frequency.items.forEach(
            function (item) {
                const row =
                    document.createElement(
                        "tr",
                    );

                row.append(
                    createTextElement(
                        "td",
                        item.label,
                    ),
                    createTextElement(
                        "td",
                        String(
                            item.count,
                        ),
                        "analysis-summary-number",
                    ),
                    createTextElement(
                        "td",
                        item.percentage,
                        "analysis-summary-number",
                    ),
                );

                fragment.appendChild(row);
            },
        );

        tableBody.appendChild(
            fragment,
        );
    }

    table.append(
        tableHead,
        tableBody,
    );

    return table;
}

function createAnalysisCard(cardData) {
    const card =
        document.createElement(
            "div",
        );

    const cardHeader =
        document.createElement(
            "div",
        );

    const cardSource =
        document.createElement(
            "p",
        );

    const columnName =
        createTextElement(
            "span",
            cardData.columnName,
        );

    const summaryBlock =
        document.createElement(
            "div",
        );

    card.classList.add(
        "analysis-card",
    );
    card.dataset.columnIndex =
        String(
            cardData.columnIndex,
        );
    card.dataset.analysisType =
        cardData.type;

    cardHeader.classList.add(
        "flex-box-start",
    );
    cardHeader.append(
        createTextElement(
            "h4",
            cardData.headlineLabel,
        ),
        createTextElement(
            "span",
            cardData.typeLabel,
            "analysis-type",
        ),
    );

    cardSource.append(
        document.createTextNode(
            "De: ",
        ),
        columnName,
    );

    summaryBlock.classList.add(
        "summary-block",
    );

    if (cardData.metrics.length > 0) {
        summaryBlock.appendChild(
            createMetrics(
                cardData.metrics,
            ),
        );
    }

    if (cardData.frequency) {
        summaryBlock.appendChild(
            createFrequencyTable(
                cardData.frequency,
            ),
        );

        if (cardData.frequency.note) {
            summaryBlock.appendChild(
                createTextElement(
                    "p",
                    cardData.frequency.note,
                    "analysis-card-note",
                ),
            );
        }
    }

    if (cardData.note) {
        summaryBlock.appendChild(
            createTextElement(
                "p",
                cardData.note,
                "analysis-card-note",
            ),
        );
    }

    card.append(
        cardHeader,
        cardSource,
        createTextElement(
            "h4",
            cardData.headlineValue,
            "analysis-card-value",
        ),
        document.createElement(
            "hr",
        ),
        summaryBlock,
    );

    return card;
}

function createDataAnalysisView(
    elements,
) {
    function render(analysis) {
        elements.cards
            .replaceChildren();

        if (!analysis.hasDataset) {
            elements.cards.hidden =
                true;
            elements.emptyState.hidden =
                true;

            return;
        }

        if (
            analysis.visibleColumnCount ===
            0
        ) {
            elements.cards.hidden =
                true;
            elements.emptyStateText
                .textContent =
                    "Selecione ao menos uma coluna na visualização da planilha para gerar a análise.";
            elements.emptyState.hidden =
                false;

            return;
        }

        elements.cards.hidden =
            false;
        elements.emptyState.hidden =
            true;

        const fragment =
            document.createDocumentFragment();

        analysis.cards.forEach(
            function (cardData) {
                fragment.appendChild(
                    createAnalysisCard(
                        cardData,
                    ),
                );
            },
        );

        elements.cards.appendChild(
            fragment,
        );
    }

    return Object.freeze({
        render,
    });
}

export {
    createDataAnalysisView,
    getDataAnalysisElements,
};
