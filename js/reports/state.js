/* ESTADO DO PLANEJAMENTO */

const planningState = {
    averageSpr: null,

    dailyCapacity: null,

    collectionPool: {
        bulky: true,
        office: true,
        backlog: true,
        home: true,
        outOfRoute: true,
    },

    lhs: [],
};

/* CONTROLE INTERNO DOS LHS */

const planningStateListeners =
    new Set();

const planningLhFields =
    new Set([
        "code",
        "quantity",
        "origin",
        "segregate",
        "segregateQuantity",
    ]);

const planningGeneralFields =
    new Set([
        "averageSpr",
        "dailyCapacity",
    ]);

const planningCollectionPoolFields =
    new Set([
        "bulky",
        "office",
        "backlog",
        "home",
        "outOfRoute",
    ]);

let nextPlanningLhId = 1;
const MINIMUM_PLANNING_LHS = 3;

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

/* CRIA O REGISTRO DE UM LH */

function createPlanningLhRecord(
    values = {},
    source = "manual",) {
    const segregate =
        Boolean(
            values.segregate,
        );

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

        segregateQuantity:
            segregate
                ? normalizeQuantity(
                    values.segregateQuantity,
                )
                : null,

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
        field === "segregate"
    ) {
        normalizedValue =
            Boolean(value);
    } else if (
        field === "quantity" ||
        field === "segregateQuantity"
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
        lh.segregateQuantity =
            null;
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

/* ATUALIZA A COLLECTION POOL */

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
        Boolean(value);

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
    ensureMinimumPlanningLhs,
    addPlanningLh,
    getPlanningState,
    removePlanningLh,
    replacePlanningLhs,
    subscribePlanningState,
    updatePlanningCollectionPoolField,
    updatePlanningGeneralField,
    updatePlanningLh,
};
