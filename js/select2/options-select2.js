(function (window, $) {
    "use strict";

    if (!$) {
        console.error(
            "O Select2 precisa do jQuery para funcionar.",
        );

        return;
    }

    /* LOCALIZA SELECTS NO ELEMENTO E NOS SEUS DESCENDENTES */

    function getSelectElements(context, selector) {
        const $context = $(context ?? document);

        const $descendants =
            $context.find(selector);

        if ($context.is(selector)) {
            return $context.add($descendants);
        }

        return $descendants;
    }

    /* CONFIRMA A INSTÂNCIA, NÃO APENAS A MARCAÇÃO COPIADA DO HTML */

    function getSelect2Instance(selectElement) {
        const instance = $(selectElement).data("select2");

        return instance?.$element?.[0] === selectElement
            ? instance
            : null;
    }

    function clearClonedSelect2Markup(selectElement) {
        const $select = $(selectElement);

        $select.next(".select2-container").remove();
        $select.removeClass("select2-hidden-accessible");
        $select.removeAttr("aria-hidden data-select2-id");
        $select.find("[data-select2-id]").removeAttr("data-select2-id");
        $select.removeData("select2");

        if ($select.attr("tabindex") === "-1") {
            $select.removeAttr("tabindex");
        }
    }

    /* INICIALIZA SOMENTE SELECTS AINDA NÃO INICIALIZADOS */

    function initializeSelect(
        selectElement,
        options,
    ) {
        const $select = $(selectElement);

        if (getSelect2Instance(selectElement)) {
            return;
        }

        if ($select.hasClass("select2-hidden-accessible") ||
            selectElement.hasAttribute("data-select2-id")) {
            clearClonedSelect2Markup(selectElement);
        }

        $select.select2(options);
    }

    /* PESQUISA PELO COMEÇO DO TEXTO */

    function matchTextStart(params, data) {
        const searchTerm = String(
            params.term ?? "",
        ).toUpperCase();

        if (!searchTerm) {
            return data;
        }

        const optionText = String(
            data.text ?? "",
        ).toUpperCase();

        return optionText.startsWith(searchTerm)
            ? data
            : null;
    }

    /* PESQUISA PELO COMEÇO DO TEXTO OU DO ID */

    function matchTextOrIdStart(params, data) {
        const searchTerm = String(
            params.term ?? "",
        ).toUpperCase();

        if (!searchTerm) {
            return data;
        }

        const optionText = String(
            data.text ?? "",
        ).toUpperCase();

        const optionId = String(
            data.id ?? "",
        ).toUpperCase();

        return (
            optionText.startsWith(searchTerm) ||
            optionId.startsWith(searchTerm)
        )
            ? data
            : null;
    }

    /* INICIALIZA OS SELECTS ESTILIZADOS */

    function initializeSelect2Fields(
        context = document,
    ) {
        if (
            !$.fn ||
            typeof $.fn.select2 !== "function"
        ) {
            console.error(
                "A biblioteca Select2 não foi carregada.",
            );

            return;
        }

        getSelectElements(
            context,
            "select.standard-select",
        ).each(function () {
            initializeSelect(this, {
                dropdownPosition: "below",
                minimumResultsForSearch: Infinity,
                width: "resolve",
            });
        });

        getSelectElements(
            context,
            "select.search-select-1",
        ).each(function () {
            initializeSelect(this, {
                dropdownPosition: "below",
                width: "resolve",

                language: {
                    noResults: function () {
                        return "";
                    },
                },

                matcher: matchTextStart,
            });
        });

        getSelectElements(
            context,
            "select.search-select-2",
        ).each(function () {
            initializeSelect(this, {
                dropdownPosition: "below",
                width: "resolve",

                language: {
                    noResults: function () {
                        return "";
                    },
                },

                matcher: matchTextOrIdStart,
            });
        });

        getSelectElements(
            context,
            "select.search-select-3",
        ).each(function () {
            initializeSelect(this, {
                dropdownPosition: "below",
                width: "resolve",
                tags: true,

                language: {
                    noResults: function () {
                        return "";
                    },
                },
            });
        });
    }

    /* DESTRÓI SELECTS ANTES DE REMOVER O HTML */

    function destroySelect2Fields(
        context = document,
    ) {
        if (
            !$.fn ||
            typeof $.fn.select2 !== "function"
        ) {
            return;
        }

        getSelectElements(
            context,
            "select",
        ).each(function () {
            if (getSelect2Instance(this)) {
                $(this).select2("destroy");
            } else if (this.classList.contains("select2-hidden-accessible") ||
                this.hasAttribute("data-select2-id")) {
                clearClonedSelect2Markup(this);
            }
        });
    }

    /*
     * DEIXA AS FUNÇÕES ACESSÍVEIS PARA
     * ARQUIVOS JAVASCRIPT DO TIPO MODULE.
     */

    window.initializeSelect2Fields =
        initializeSelect2Fields;

    window.destroySelect2Fields =
        destroySelect2Fields;

    /* INICIALIZA OS SELECTS PRESENTES NO HTML INICIAL */

    $(document).ready(function () {
        initializeSelect2Fields(document);
    });

    /* ABRE O SELECT AO RECEBER FOCO */

    $(document).on(
        "focus.statisticsSelect2",
        ".select2-selection.select2-selection--single",

        function () {
            const $select = $(this)
                .closest(".select2-container")
                .prev("select:enabled");

            if ($select.length > 0) {
                $select.select2("open");
            }
        },
    );

    /* EVITA REABERTURA INDESEJADA AO FECHAR */

    $(document).on(
        "select2:closing.statisticsSelect2",

        [
            "select.standard-select",
            "select.search-select-1",
            "select.search-select-2",
            "select.search-select-3",
        ].join(","),

        function (event) {
            const select2Instance =
                $(event.target).data("select2");

            if (!select2Instance) {
                return;
            }

            select2Instance.$selection.one(
                "focus focusin",

                function (focusEvent) {
                    focusEvent.stopPropagation();
                },
            );
        },
    );
})(window, window.jQuery);