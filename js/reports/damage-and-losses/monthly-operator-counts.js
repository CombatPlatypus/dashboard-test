function isValidMonthlyOperatorCounts(value) {
    return value == null || (
        typeof value.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value.month) &&
        Array.isArray(value.operators) && value.operators.every(entry => (
            typeof entry?.operator === "string" && entry.operator.trim() !== "" &&
            Number.isSafeInteger(entry.quantity) && entry.quantity > 0
        ))
    );
}

function cloneMonthlyOperatorCounts(value) {
    return value ? {
        month: value.month,
        operators: value.operators.map(({ operator, quantity }) => ({ operator, quantity })),
    } : null;
}

export { cloneMonthlyOperatorCounts, isValidMonthlyOperatorCounts };
