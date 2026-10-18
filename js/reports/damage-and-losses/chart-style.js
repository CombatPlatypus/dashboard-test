const DAMAGE_AND_LOSSES_RED = "#8B0000";
const DAMAGE_AND_LOSSES_YELLOW = "#f99400";
const DAMAGE_AND_LOSSES_GREEN = "#007A48";
const DAMAGE_AND_LOSSES_BLUE = "#2538a5";

function getDamageAndLossesPixelRatio() {
    const screenRatio = typeof window !== "undefined"
        ? Number(window.devicePixelRatio) || 1
        : 1;

    return Math.max(screenRatio, 2);
}

export {
    DAMAGE_AND_LOSSES_RED,
    DAMAGE_AND_LOSSES_YELLOW,
    DAMAGE_AND_LOSSES_GREEN,
    DAMAGE_AND_LOSSES_BLUE,
    getDamageAndLossesPixelRatio,
};
