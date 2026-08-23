/* ESTADO DO PLANEJAMENTO */

const planningState = {
    averageSpr: null,

    dailyCapacity: null,

    collectionPool: {
        backlogPackages: null,
        backlogBulky: null,
        errors: null,
        added: null,
        removed: null,
    },

    lhs: [],
};

/* CONTROLE INTERNO DOS LHS E DAS TOS */

const planningStateListeners =
    new Set();

const planningLhFields =
    new Set([
        "code",
        "quantity",
        "origin",
        "segregate",
        "segregateTos",
    ]);

const planningToFields =
    new Set([
        "code",
        "quantity",
    ]);

const planningGeneralFields =
    new Set([
        "averageSpr",
        "dailyCapacity",
    ]);

const planningCollectionPoolFields =
    new Set([
        "backlogPackages",
        "backlogBulky",
        "errors",
        "added",
        "removed",
    ]);
    
let nextPlanningLhId = 1;
let nextPlanningToId = 1;

const MINIMUM_PLANNING_LHS = 6;
const MINIMUM_PLANNING_TOS_PER_LH = 1;

/* NORMALIZA UM TEXTO */

function normalizeTextValue(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value);
}

/* NORMALIZA A QUANTIDADE */

function normalizeQuantity(value) {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalizedValue =
        String(value).trim();

    if (
        !/^\d+$/.test(
            normalizedValue,
        )
    ) {
        return null;
    }

    return Number(
        normalizedValue,
    );
}

/* CRIA O REGISTRO DE UMA TO */

function createPlanningToRecord(
    values = {},
    source = "manual",
) {
    return {
        id: nextPlanningToId++,

        code:
            normalizeTextValue(
                values.code,
            ),

        quantity:
            normalizeQuantity(
                values.quantity,
            ),

        source:
            normalizeTextValue(
                values.source || source,
            ),

        edited:
            Boolean(
                values.edited,
            ),
    };
}

/* CRIA O REGISTRO DE UM LH */

function createPlanningLhRecord(
    values = {},
    source = "manual",
) {
    const segregate =
        Boolean(
            values.segregate,
        );

    const segregateTos =
        segregate &&
        Boolean(
            values.segregateTos,
        );

    const receivedTos =
        Array.isArray(
            values.tos,
        )
            ? values.tos
            : [];

    const tos =
        receivedTos.map(
            function (to) {
                return createPlanningToRecord(
                    to,
                    source,
                );
            },
        );

    while (
        segregateTos &&
        tos.length <
            MINIMUM_PLANNING_TOS_PER_LH
    ) {
        tos.push(
            createPlanningToRecord(
                {},
                source,
            ),
        );
    }

    return {
        id: nextPlanningLhId++,

        code:
            normalizeTextValue(
                values.code,
            ),

        quantity:
            normalizeQuantity(
                values.quantity,
            ),

        origin:
            normalizeTextValue(
                values.origin,
            ),

        segregate,

        segregateTos,

        tos,

        source:
            normalizeTextValue(
                values.source || source,
            ),

        edited:
            Boolean(
                values.edited,
            ),
    };
}

function fillMinimumPlanningLhs() {
    let added = false;

    while (planningState.lhs.length < MINIMUM_PLANNING_LHS) {
        planningState.lhs.push(createPlanningLhRecord());
        added = true;
    }

    return added;
}

/* CRIA UMA CÓPIA DO ESTADO */

function getPlanningState() {
    return {
        averageSpr:
            planningState.averageSpr,

        dailyCapacity:
            planningState.dailyCapacity,

        collectionPool: {
            ...planningState.collectionPool,
        },
                    
        lhs:
            planningState.lhs.map(
                function (lh) {
                    return {
                        ...lh,

                        tos:
                            lh.tos.map(
                                function (to) {
                                    return {
                                        ...to,
                                    };
                                },
                            ),
                    };
                },
            ),
    };
}

/* NOTIFICA UMA ALTERAÇÃO NO ESTADO */

function notifyPlanningState(change) {
    const stateSnapshot =
        getPlanningState();

    planningStateListeners.forEach(
        function (listener) {
            listener(
                stateSnapshot,
                change,
            );
        },
    );
}

/* ACOMPANHA ALTERAÇÕES NO ESTADO */

function subscribePlanningState(listener) {
    planningStateListeners.add(
        listener,
    );

    return function () {
        planningStateListeners.delete(
            listener,
        );
    };
}

/* ADICIONA UM LH */

function addPlanningLh(
    values = {},
    source = "manual",) {
    const lh =
        createPlanningLhRecord(
            values,
            source,
        );

    planningState.lhs.push(
        lh,
    );

    notifyPlanningState({
        type: "lh-added",
        id: lh.id,
    });

    return {
        ...lh,
    };
}

function ensureMinimumPlanningLhs() {
    const changed = fillMinimumPlanningLhs();

    if (changed) {
        notifyPlanningState({
            type: "lhs-minimum-restored"
        });
    }

    return changed;
}

/* ATUALIZA UM LH */

function updatePlanningLh(
    id,
    field,
    value,
) {
    if (
        !planningLhFields.has(
            field,
        )
    ) {
        return false;
    }

    const lh =
        planningState.lhs.find(
            function (currentLh) {
                return currentLh.id === id;
            },
        );

    if (!lh) {
        return false;
    }

    let normalizedValue;

    if (
        field === "segregate" ||
        field === "segregateTos"
    ) {
        normalizedValue =
            Boolean(value);

        if (
            field === "segregateTos" &&
            !lh.segregate
        ) {
            normalizedValue = false;
        }
    } else if (
        field === "quantity"
    ) {
        normalizedValue =
            normalizeQuantity(
                value,
            );
    } else {
        normalizedValue =
            normalizeTextValue(
                value,
            );
    }

    if (
        lh[field] === normalizedValue
    ) {
        return true;
    }

    lh[field] =
        normalizedValue;

    if (
        field === "segregate" &&
        !normalizedValue
    ) {
        lh.segregateTos = false;
    }

    if (
        field === "segregateTos" &&
        normalizedValue
    ) {
        while (
            lh.tos.length <
                MINIMUM_PLANNING_TOS_PER_LH
        ) {
            lh.tos.push(
                createPlanningToRecord(),
            );
        }
    }

    if (
        lh.source !== "manual"
    ) {
        lh.edited = true;
    }

    notifyPlanningState({
        type: "lh-updated",
        id,
        field,
    });

    return true;
}

/* ADICIONA UMA TO A UM LH */

function addPlanningTo(
    lhId,
    values = {},
    source = "manual",
) {
    const lh =
        planningState.lhs.find(
            function (currentLh) {
                return currentLh.id === lhId;
            },
        );

    if (
        !lh ||
        !lh.segregate ||
        !lh.segregateTos
    ) {
        return null;
    }

    const to =
        createPlanningToRecord(
            values,
            source,
        );

    lh.tos.push(
        to,
    );

    notifyPlanningState({
        type: "to-added",
        lhId,
        toId: to.id,
    });

    return {
        ...to,
    };
}

/* ATUALIZA UMA TO */

function updatePlanningTo(
    lhId,
    toId,
    field,
    value,
) {
    if (
        !planningToFields.has(
            field,
        )
    ) {
        return false;
    }

    const lh =
        planningState.lhs.find(
            function (currentLh) {
                return currentLh.id === lhId;
            },
        );

    const to =
        lh?.tos.find(
            function (currentTo) {
                return currentTo.id === toId;
            },
        );

    if (!to) {
        return false;
    }

    const normalizedValue =
        field === "quantity"
            ? normalizeQuantity(
                value,
            )
            : normalizeTextValue(
                value,
            );

    if (
        to[field] === normalizedValue
    ) {
        return true;
    }

    to[field] =
        normalizedValue;

    if (
        to.source !== "manual"
    ) {
        to.edited = true;
    }

    notifyPlanningState({
        type: "to-updated",
        lhId,
        toId,
        field,
    });

    return true;
}

/* REMOVE UMA TO */

function removePlanningTo(
    lhId,
    toId,
) {
    const lh =
        planningState.lhs.find(
            function (currentLh) {
                return currentLh.id === lhId;
            },
        );

    if (!lh) {
        return false;
    }

    const index =
        lh.tos.findIndex(
            function (to) {
                return to.id === toId;
            },
        );

    if (index === -1) {
        return false;
    }

    if (
        lh.segregateTos &&
        lh.tos.length <=
            MINIMUM_PLANNING_TOS_PER_LH
    ) {
        return false;
    }

    lh.tos.splice(
        index,
        1,
    );

    notifyPlanningState({
        type: "to-removed",
        lhId,
        toId,
    });

    return true;
}

/* ATUALIZA UM CAMPO GERAL */

function updatePlanningGeneralField(
    field,
    value,
) {
    if (
        !planningGeneralFields.has(
            field,
        )
    ) {
        return false;
    }

    const normalizedValue =
        normalizeQuantity(
            value,
        );

    if (
        planningState[field] ===
        normalizedValue
    ) {
        return true;
    }

    planningState[field] =
        normalizedValue;

    notifyPlanningState({
        type: "general-field-updated",
        field,
    });

    return true;
}

/* ATUALIZA UMA INFORMAÇÃO DA COLLECTION POOL */

function updatePlanningCollectionPoolField(
    field,
    value,
) {
    if (
        !planningCollectionPoolFields.has(
            field,
        )
    ) {
        return false;
    }

    const normalizedValue =
        normalizeQuantity(
            value,
        );

    if (
        planningState.collectionPool[field] ===
        normalizedValue
    ) {
        return true;
    }

    planningState.collectionPool[field] =
        normalizedValue;

    notifyPlanningState({
        type: "collection-pool-updated",
        field,
    });

    return true;
}

/* REINICIA A LISTA DE LHS */

function resetPlanningLhs() {
    planningState.lhs = [];

    nextPlanningLhId = 1;
    nextPlanningToId = 1;

    fillMinimumPlanningLhs();

    notifyPlanningState({
        type: "lhs-reset",
    });

    return true;
}

/* REMOVE UM LH */

function removePlanningLh(id) {
    if (planningState.lhs.length <= MINIMUM_PLANNING_LHS) {
        return false;
    }

    const index = planningState.lhs.findIndex(function(lh) {
        return lh.id === id;
    });

    if (index === -1) {
        return false;
    }

    planningState.lhs.splice(index, 1);

    notifyPlanningState({
        type: "lh-removed",
        id: id
    });

    return true;
}

/* SUBSTITUI OS LHS ATUAIS */

function replacePlanningLhs(
    lhs,
    source = "import",
) {
    const receivedLhs =
        Array.isArray(lhs)
            ? lhs
            : [];

    planningState.lhs =
        receivedLhs.map(
            function (lh) {
                return createPlanningLhRecord(
                    lh,
                    source,
                );
            },
        );

    fillMinimumPlanningLhs();

    notifyPlanningState({
        type: "lhs-replaced",
    });
}

export {
    MINIMUM_PLANNING_LHS,
    MINIMUM_PLANNING_TOS_PER_LH,
    ensureMinimumPlanningLhs,
    addPlanningLh,
    addPlanningTo,
    getPlanningState,
    removePlanningLh,
    removePlanningTo,
    replacePlanningLhs,
    subscribePlanningState,
    updatePlanningCollectionPoolField,
    updatePlanningGeneralField,
    updatePlanningLh,
    updatePlanningTo,
    resetPlanningLhs,
};
