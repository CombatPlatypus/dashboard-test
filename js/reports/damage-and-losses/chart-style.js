const DAMAGE_AND_LOSSES_RED = "#8B0000";

function getDamageAndLossesPixelRatio() {
    const screenRatio = typeof window !== "undefined"
        ? Number(window.devicePixelRatio) || 1
        : 1;

    return Math.max(screenRatio, 2);
}

export { DAMAGE_AND_LOSSES_RED, getDamageAndLossesPixelRatio };
