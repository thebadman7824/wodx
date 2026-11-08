/**
 * WoDX Actions — a Dark Ages test pack for the Phase 6b gate. GM only; asks first; creates actors in their own folder
 * and never touches existing ones. Rothenstein has no Garou of its own, so the gate needs these.
 */
import * as GX from "./garou.js";

const FOLDER = "WoDX 6b test pack";
const PACK = [
    { name: "Wilhelm Eisenfang (test)", breed: "homid", auspice: "ahroun", tribe: "fenrir", rank: 2, rage: 5, gnosis: 2, willpower: 4,
        renown: { glory: 4, honor: 1, wisdom: 0 }, attrs: { strength: 4, stamina: 3, dexterity: 3 }, abilities: { brawl: 3, primalurge: 2, melee: 2 } },
    { name: "Mira Silent-Step (test)", breed: "lupus", auspice: "ragabash", tribe: "silent-striders", form: "lupus", rage: 1, gnosis: 5, willpower: 3,
        renown: { glory: 1, honor: 1, wisdom: 1 }, attrs: { dexterity: 4, wits: 3 }, abilities: { stealth: 3, primalurge: 3, enigmas: 2 } },
    { name: "Thorn (test)", breed: "metis", auspice: "theurge", tribe: "shadow-lords", form: "crinos", rage: 2, gnosis: 3, willpower: 3,
        renown: { glory: 0, honor: 0, wisdom: 3 }, attrs: { wits: 3 }, abilities: { rituals: 3, enigmas: 3, occult: 2, primalurge: 1 } },
    { name: "Aldous Sweetsong (test)", breed: "homid", auspice: "galliard", tribe: "fianna", rage: 4, gnosis: 1, willpower: 3,
        renown: { glory: 2, honor: 0, wisdom: 1 }, attrs: { charisma: 4, manipulation: 3 }, abilities: { expression: 3, performance: 3, primalurge: 1 } },
    { name: "Sigrun Whitemane (test)", breed: "homid", auspice: "philodox", tribe: "silver-fangs", rage: 3, gnosis: 1, willpower: 3,
        renown: { glory: 0, honor: 3, wisdom: 0 }, attrs: { charisma: 3 }, abilities: { leadership: 3, rituals: 1, primalurge: 1 } }
];
const FERA = [
    { name: "Nadira (Bastet, test)", changingbreed: "Bastet", rage: 3, gnosis: 3, willpower: 4 },
    { name: "Old Rook (Corax, test)", changingbreed: "Corax", rage: 1, gnosis: 6, willpower: 3 }
];
const MORTALS = [
    { name: "Hedda, Fenrir Kinfolk (test)", willpower: 4, kinfolk: "fenrir" },
    { name: "Miller Jost (test)", willpower: 3 },
    { name: "Father Anselm (test)", willpower: 7, abilities: { occult: 2 } }
];

const T = () => CONFIG.worldofdarkness?.sheettype ?? {};
// Linked tokens, as for player characters; isupdated false makes the system work out the totals after the change
const BASE = (name, type, folder) => ({ name, type, folder, prototypeToken: { actorLink: true }, system: { settings: { iscreated: false } } });
const dots = (o, base) => Object.fromEntries(Object.entries(o ?? {}).flatMap(([k, v]) => [[`system.${base}.${k}.value`, v], ...(base === "abilities" ? [[`system.${base}.${k}.isvisible`, true]] : [])]));

export async function makeTestPack({ confirm = true } = {}) {
    if (!game.user.isGM) return ui.notifications.warn("The Storyteller makes the test pack.");
    if (game.folders.find(f => f.type === "Actor" && f.name === FOLDER)) return ui.notifications.warn(`The folder "${FOLDER}" is already there. Delete it first to make a new pack.`);
    if (confirm) {
        const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Make the 6b test pack" },
            content: `<p>Creates ${PACK.length} Garou, ${FERA.length} Fera and ${MORTALS.length} mortals in a new folder "${FOLDER}", for testing. Nothing existing is changed.</p>` });
        if (!ok) return null;
    }
    await GX.loadData();
    const D = GX.data().garou;
    const folder = await Folder.create({ name: FOLDER, type: "Actor", flags: { "wodx-actions": { kind: "6b-test-pack" } } });
    const made = [];
    for (const p of PACK) {
        const a = await Actor.create(BASE(p.name, T().werewolf ?? "Werewolf", folder.id));
        const upd = {
            "system.breed": `wod.bio.breedname.${p.breed}`, "system.auspice": `wod.bio.auspicename.${p.auspice}`,
            "system.tribe": "custom", "system.custom.tribe": D.tribes[p.tribe].label,
            "system.advantages.rage.permanent": p.rage, "system.advantages.rage.temporary": p.rage,
            "system.advantages.gnosis.permanent": p.gnosis, "system.advantages.gnosis.temporary": p.gnosis,
            "system.advantages.willpower.permanent": p.willpower, "system.advantages.willpower.temporary": p.willpower,
            "system.renown.rank": p.rank ?? 1,
            ...Object.fromEntries(Object.entries(p.renown).map(([k, v]) => [`system.renown.${k}.permanent`, v])),
            ...dots(p.attrs, "attributes"), ...dots(p.abilities, "abilities"), "system.settings.isupdated": false
        };
        await a.update(upd);
        if (p.form && p.form !== "homid") {
            const shapes = foundry.utils.deepClone(a.system.shapes ?? {});
            for (const k of Object.keys(shapes)) if (shapes[k] && typeof shapes[k] === "object") shapes[k].isactive = k === p.form;
            await a.update({ "system.shapes": shapes, "system.settings.isupdated": false });
        }
        const names = [D.breeds[p.breed].gifts[0], D.auspices[p.auspice].gifts[0], D.tribes[p.tribe].gifts[0]];
        const items = [...new Set(names)].map(n => GX.findGift(n)).filter(Boolean).map(g => GX.giftItem(g));
        if (p.auspice === "theurge") items.push(
            { name: "Fang Dagger (test fetish)", type: "Fetish", system: { type: "wod.types.fetish", gnosis: 5, difficulty: 5, isrollable: true, level: 2 } },
            { name: "Moon Bridge Pebble (test talen)", type: "Fetish", system: { type: "wod.types.talen", gnosis: 4, difficulty: 4, isrollable: true, level: 1 } },
            { name: "Rite of Cleansing (test)", type: "Power", system: { type: "wod.types.rite", game: "werewolf", level: 1 } });
        if (items.length) await a.createEmbeddedDocuments("Item", items);
        made.push(a);
    }
    for (const f of FERA) {
        const a = await Actor.create(BASE(f.name, T().changingbreed ?? "Changing Breed", folder.id));
        await a.update({ "system.changingbreed": f.changingbreed, "system.breed": "wod.bio.breedname.homid",
            "system.advantages.rage.permanent": f.rage, "system.advantages.rage.temporary": f.rage,
            "system.advantages.gnosis.permanent": f.gnosis, "system.advantages.gnosis.temporary": f.gnosis,
            "system.advantages.willpower.permanent": f.willpower, "system.advantages.willpower.temporary": f.willpower,
            "system.renown.rank": 1, "system.settings.isupdated": false });
        made.push(a);
    }
    for (const m of MORTALS) {
        const a = await Actor.create(BASE(m.name, T().mortal ?? "Mortal", folder.id));
        await a.update({ "system.advantages.willpower.permanent": m.willpower, "system.advantages.willpower.temporary": m.willpower, ...dots(m.abilities, "abilities"), "system.settings.isupdated": false });
        if (m.kinfolk) await a.setFlag("world", "wodx", { ...(a.getFlag("world", "wodx") ?? {}), kinfolk: m.kinfolk });
        made.push(a);
    }
    ui.notifications.info(`WoDX: ${made.length} test characters made in "${FOLDER}".`);
    return made;
}
