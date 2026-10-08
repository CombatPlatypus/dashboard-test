import assert from "node:assert/strict";
import {
    readFile,
} from "node:fs/promises";
import {
    test,
} from "node:test";

import {
    getPlanningBacklogCodes,
    getPlanningBacklogTotal,
    getPlanningPoolQuantity,
    parsePlanningBacklogCodes,
} from "../js/reports/planning/calculations.js";

import {
    getPlanningState,
    resetPlanningReport,
    restorePlanningState,
    updatePlanningBacklogField,
} from "../js/reports/planning/state.js";

function createState({
    packages = "",
    bulky = "",
} = {}) {
    return {
        collectionPool: {
            backlogPackages: 20,
            backlogBulky: 12,
            added: 99,
        },
        backlog: {
            packages,
            bulky,
        },
    };
}

test(
    "normaliza códigos do backlog e ignora duplicados",
    function () {
        assert.deepEqual(
            parsePlanningBacklogCodes(
                "BR1\nBR2, BR3;\tbr1",
            ),
            [
                "BR1",
                "BR2",
                "BR3",
            ],
        );
    },
);

test(
    "usa as listas de BRs para backlog e pacotes adicionados",
    function () {
        const state =
            createState({
                packages:
                    "BR-P1\nBR-P2",
                bulky:
                    "BR-V1\nbr-p2",
            });

        assert.deepEqual(
            getPlanningBacklogCodes(
                state,
                "packages",
            ),
            [
                "BR-P1",
                "BR-P2",
            ],
        );

        assert.equal(
            getPlanningBacklogTotal(
                state,
            ),
            3,
        );

        assert.equal(
            getPlanningPoolQuantity(
                state,
                "backlogPackages",
            ),
            2,
        );

        assert.equal(
            getPlanningPoolQuantity(
                state,
                "backlogBulky",
            ),
            1,
        );

        assert.equal(
            getPlanningPoolQuantity(
                state,
                "added",
            ),
            3,
        );
    },
);

test(
    "zera a categoria vazia quando a outra lista possui BRs",
    function () {
        const state =
            createState({
                bulky:
                    "BR-V1",
            });

        assert.equal(
            getPlanningPoolQuantity(
                state,
                "backlogPackages",
            ),
            0,
        );

        assert.equal(
            getPlanningPoolQuantity(
                state,
                "backlogBulky",
            ),
            1,
        );
    },
);

test(
    "mantém compatibilidade com valores manuais quando não há BRs",
    function () {
        const state =
            createState();

        assert.equal(
            getPlanningPoolQuantity(
                state,
                "backlogPackages",
            ),
            20,
        );

        assert.equal(
            getPlanningPoolQuantity(
                state,
                "backlogBulky",
            ),
            12,
        );

        assert.equal(
            getPlanningPoolQuantity(
                state,
                "added",
            ),
            99,
        );
    },
);

test(
    "salva, restaura e limpa o conteúdo dos textareas",
    function () {
        resetPlanningReport();

        assert.equal(
            updatePlanningBacklogField(
                "packages",
                "BR-P1\nBR-P2",
            ),
            true,
        );

        assert.equal(
            updatePlanningBacklogField(
                "bulky",
                "BR-V1",
            ),
            true,
        );

        const savedState =
            getPlanningState();

        resetPlanningReport();

        assert.deepEqual(
            getPlanningState().backlog,
            {
                packages: "",
                bulky: "",
            },
        );

        assert.equal(
            restorePlanningState(
                savedState,
            ),
            true,
        );

        assert.deepEqual(
            getPlanningState().backlog,
            {
                packages:
                    "BR-P1\nBR-P2",
                bulky:
                    "BR-V1",
            },
        );

        resetPlanningReport();
    },
);

test(
    "o HTML usa textareas de backlog e remove os inputs numéricos antigos",
    async function () {
        const [
            html,
            view,
        ] =
            await Promise.all([
                readFile(
                    new URL(
                        "../index.html",
                        import.meta.url,
                    ),
                    "utf8",
                ),
                readFile(
                    new URL(
                        "../js/reports/planning/view.js",
                        import.meta.url,
                    ),
                    "utf8",
                ),
            ]);

        assert.match(
            html,
            /<textarea[^>]+data-planning-backlog-field="packages"/,
        );

        assert.match(
            html,
            /<textarea[^>]+data-planning-backlog-field="bulky"/,
        );

        assert.doesNotMatch(
            html,
            /data-planning-pool-field="backlogPackages"/,
        );

        assert.doesNotMatch(
            html,
            /data-planning-pool-field="backlogBulky"/,
        );

        assert.match(
            view,
            /input\.readOnly\s*=\s*isCalculatedAdded/,
        );

        assert.match(
            view,
            /getPlanningPoolQuantity\(\s*state,\s*"added"/,
        );
    },
);
