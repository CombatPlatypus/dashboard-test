function formatReportPersonFirstName(
    value,
    fallback = "—",
) {
    const receivedValue =
        String(value ?? "")
            .trim();

    if (!receivedValue) {
        return fallback;
    }

    const closingBracketIndex =
        receivedValue.lastIndexOf(
            "]",
        );
    const name =
        closingBracketIndex !== -1
            ? receivedValue.slice(
                closingBracketIndex + 1,
            ).trim()
            : receivedValue;
    const shopeeEmailMatch =
        name.match(
            /^([^@]+)@shopee\.com$/i,
        );
    const firstName =
        (
            shopeeEmailMatch
                ? shopeeEmailMatch[1]
                    .split(".")[0]
                : name.split(/\s+/)[0]
        )
            .trim()
            .toLocaleLowerCase(
                "pt-BR",
            );

    if (!firstName) {
        return fallback;
    }

    return (
        firstName
            .charAt(0)
            .toLocaleUpperCase(
                "pt-BR",
            ) +
        firstName.slice(1)
    );
}

export {
    formatReportPersonFirstName,
};
