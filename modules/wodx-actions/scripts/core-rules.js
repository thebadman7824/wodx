/**
 * WoDX Actions: shared dice and health rules (no Foundry calls).
 *
 * One copy lives in WoDX Combat's rules: success counting, difficulty limits, the health track and its overflow,
 * wound states and conditions, and every line's soak. This file used to carry an older copy of each (its soak
 * treated a falling Garou as a mortal); now it passes the Combat rules through, so the two modules always agree.
 */
export {
    WOUND_LEVELS, countSuccesses, clampDifficulty, addDamage, removeDamage, woundState, condition,
    soakPool, damageAfterSoak
} from "../../wodx-combat/scripts/rules.js";
