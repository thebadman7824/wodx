import * as TR from "./trade-rules.js";

/**
 * WoDX Actions 3.33.0: trade with one NPC from "With this person". Buy from them, sell to them, or barter one thing
 * for another, at WoDX Storyteller's prices (era goods and the local market). A trader's shop is the container their
 * market lists for them; anyone else trades from what they carry. The NPC's purse is the till. A haggle roll
 * (Manipulation + Finance, Commerce in the Dark Ages) moves the price. Players' trades wait in the approval queue;
 * the Storyteller's apply at once. Stock lines from WoDX NPC colour the card when stock talk is on.
 */
export function build(ctx) {
    const { R, PRESETS, pickPool, readPool, woundPenalty, setting, rollPool, rollBlock, post, esc, dialog, opts, willpower, spendWillpower,
        attitudeOf, nameFor, npcApi, gmIds, proposeOrApply, moveItem } = ctx;
    const ST = () => game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api?.upkeep : null;
    const money = () => ST()?.money ?? null;
    const ICS = "wodx-interactables";
    const baseOf = a => (a?.isToken ? a.token?.baseActor : null) ?? game.actors?.get?.(a?.id) ?? a;

    /** The trader's shop: the container tile their market lists for them (world actor id), if any. */
    function shopOf(npc) {
        try {
            const st = ST()?.markets?.state?.();
            const id = baseOf(npc)?.id;
            for (const m of st?.markets ?? []) {
                const t = (m.traders ?? []).find(x => x.actor === id);
                if (t) { const tile = fromUuidSync(t.tile); if (tile) return { tile, market: m }; }
            }
        } catch (e) { /* no markets */ }
        return null;
    }
    const priceOf = (name, where, count = 1) => {
        try { return money()?.priceSync?.(name, { count, market: where?.market ?? null, tile: where?.tile ?? null, scene: canvas?.scene ?? null }) ?? null; } catch (e) { return null; }
    };
    const fmt = n => { try { return money()?.format?.(n) ?? `${n}`; } catch (e) { return `${n}`; } };
    const line = (kind, npcTok, actor) => { try { return npcApi()?.talk?.stock?.(kind, { npc: npcTok, pc: actor }) ?? null; } catch (e) { return null; } };
    const isLifted = it => !!it?.flags?.["wodx-actions"]?.lifted;

    /** What the NPC has for sale: shop rows, then what they carry. Each {key, name, count, price}. */
    function wares(npc, shop) {
        const out = [];
        if (shop) for (const r of TR.shopRows(shop.tile.flags?.[ICS]?.items)) out.push({ key: `s${r.i}`, row: r.i, name: r.name, count: r.count, price: priceOf(r.name, shop) });
        for (const it of TR.tradeable([...(npc.items ?? [])])) out.push({ key: `i${it.id}`, item: it.id, name: it.name, count: 1, price: priceOf(it.name, shop) });
        return out.filter(w => w.price);
    }
    /** What the character can offer, with what the NPC would give for each. */
    function offers(actor, shop) {
        return TR.tradeable([...(actor.items ?? [])]).map(it => {
            const p = priceOf(it.name, shop);
            return p ? { key: it.id, item: it.id, name: it.name, lifted: isLifted(it), price: p, give: TR.offerFor(p, { lifted: isLifted(it) }) } : null;
        }).filter(Boolean);
    }

    /** The trade window and roll. key: "buy", "sell" or "barter"; given: form data for scripts and gates. */
    async function trade(actor, npcTok, key = "buy", given = null) {
        const npc = npcTok?.actor;
        if (!actor || !npc) return null;
        if (!money()?.priceSync) { ui.notifications.warn("Trading needs WoDX Storyteller (money and prices) turned on."); return null; }
        try { await money().findGood?.(""); } catch (e) { /* loads the goods list */ }
        const name = nameFor(npcTok), shop = shopOf(npc), at = attitudeOf(npc, actor), step = at?.step ?? 0;
        if (!TR.willTrade(step)) {
            const say = line("trade:refuse", npcTok, actor);
            await post(actor, `${actor.name}: trade with ${name}`, `<div class="vta-big">${esc(name)} will not trade with ${esc(actor.name)}.</div>${say ? `<div class="vta-note">${esc(say)}</div>` : ""}`, []);
            return { done: false, refused: true };
        }
        const have = wares(npc, shop), mine = offers(actor, shop);
        let fd = given;
        if (!fd) {
            const wantOpts = have.map(w => [w.key, `${w.name}${w.count > 1 ? ` (${w.count})` : ""}: ${w.price.text} each`]);
            const giveOpts = mine.map(o => [o.key, `${o.name}: they give ${fmt(o.give)}${o.lifted ? " (stolen, fence price)" : ""}`]);
            const pick = pickPool(actor, TR.HAGGLE_PRESET.haggleNpc.alts);
            const open = line("trade:open", npcTok, actor);
            const content = `<form>
              <p>${esc(actor.name)} trades with <b>${esc(name)}</b>${shop ? " at their shop" : ""}.${open ? ` <i>${esc(open)}</i>` : ""}</p>
              <div class="form-group"><label>Deal</label><select name="mode" data-fixed>${opts([["buy", "Buy from them"], ["sell", "Sell to them"], ["barter", "Barter one thing for another"]], key)}</select></div>
              <div class="form-group"><label>What they have</label><select name="want">${opts([["", "(none)"], ...wantOpts], "")}</select></div>
              <div class="form-group"><label>How many</label><input type="number" name="count" value="1" min="1" style="width:4em"/></div>
              <div class="form-group"><label>What you give</label><select name="give">${opts([["", "(none)"], ...giveOpts], "")}</select></div>
              <div class="form-group"><label><input type="checkbox" name="haggle"/> Haggle (${esc(pick ? `${pick.attr.replace(/^./, c => c.toUpperCase())} + ${pick.abilityName}` : "no pool")}, difficulty 6)</label></div>
              <div class="form-group"><label>Bonus dice / extra difficulty</label><input type="number" name="bonus" value="0" style="width:4em"/> <input type="number" name="extraDiff" value="0" style="width:4em"/></div>
              <div class="form-group"><label><input type="checkbox" name="specialty"/> Specialty applies</label></div>
              <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success) [${willpower(actor).temp}]</label></div>
              <p class="vta-note">${esc(TR.HAGGLE_PRESET.haggleNpc.note)} Prices are this era's and this market's. Things with no price in the goods list are settled in play.</p>
            </form>`;
            fd = await dialog(`Trade with ${name}`, content, "Deal", d => d);
            if (!fd) return null;
        }
        const mode = fd.mode || key;
        const want = have.find(w => w.key === fd.want) ?? null, give = mine.find(o => o.key === fd.give) ?? null;
        if ((mode === "buy" || mode === "barter") && !want) { ui.notifications.warn("Choose what they have."); return null; }
        if ((mode === "sell" || mode === "barter") && !give) { ui.notifications.warn("Choose what you give."); return null; }
        const count = want ? Math.max(1, Math.min(want.count, Math.floor(Number(fd.count) || 1))) : 1;

        // The haggle roll
        let me = null, label = "";
        if (fd.haggle) {
            const pick = pickPool(actor, TR.HAGGLE_PRESET.haggleNpc.alts);
            if (pick) {
                if (fd.wp && !(await spendWillpower(actor, 1))) return null;
                const pool = readPool(actor, pick.attr, pick.abilityId);
                const shift = at ? npcApi()?.attitude?.rules?.difficultyShift?.(step) ?? 0 : 0;
                const built = R.actionPool({ attribute: pool.attribute, attributeLabel: pool.attributeLabel, ability: pool.ability, abilityLabel: pool.abilityLabel || pick.abilityName,
                    abilityType: setting("untrained") ? pool.abilityType : "talent", abilityKey: pool.abilityKey, bonusDice: Number(fd.bonus) || 0,
                    extraDiff: (Number(fd.extraDiff) || 0) + shift, baseDifficulty: TR.HAGGLE_PRESET.haggleNpc.diff, woundPenalty: woundPenalty(actor), multiIndex: 0, retries: 0, aura: 0 });
                if (built.blocked) { ui.notifications.warn(built.blocked); return null; }
                me = await rollPool(built.dice, built.difficulty, { specialty: !!fd.specialty, willpower: !!fd.wp });
                me.parts = built.parts;
                label = [pool.attributeLabel, pool.abilityLabel || pick.abilityName].filter(Boolean).join(" + ");
            }
        }
        const succ = me?.successes ?? 0, botch = !!me?.botch;

        // The sums: what the character pays (owe > 0) or is paid (owe < 0)
        const wantPrice = want ? Math.round(want.price.each * count * TR.attitudeFactor(step)) : 0;
        const giveValue = give ? Math.round(give.give * TR.attitudeFactor(step, { selling: true })) : 0;
        let owe = 0;
        if (mode === "buy") owe = TR.haggle(wantPrice, succ, { botch });
        else if (mode === "sell") owe = -TR.haggle(giveValue, succ, { botch, selling: true, cap: give.price.each });
        else {
            const b = TR.barter(wantPrice, TR.haggle(giveValue, succ, { botch, selling: true, cap: give.price.each }));
            owe = Math.max(0, b.owe);
        }
        // Can they pay?
        const purse = a => { try { const p = money().purse(a); return (p.carried ?? 0) + (p.bank ?? 0); } catch (e) { return 0; } };
        let why = "", ok = true;
        if (owe > 0 && purse(actor) < owe) { ok = false; why = `${actor.name} is short of the ${fmt(owe)} it costs.`; }
        if (owe < 0 && purse(npc) < -owe) { ok = false; why = `${name} has not got ${fmt(-owe)} to pay.`; }

        const sayKind = !ok ? "trade:noMoney" : give?.lifted && mode !== "buy" ? "trade:fence" : me ? (succ > 0 && !botch ? "trade:haggleWin" : "trade:haggleLose") : mode === "sell" ? "trade:buy" : "trade:fair";
        const say = line(sayKind, npcTok, actor);
        const what = mode === "buy" ? `${want.name}${count > 1 ? ` (${count})` : ""} for ${fmt(owe)}`
            : mode === "sell" ? `${give.name} for ${fmt(-owe)}`
                : `${give.name} for ${want.name}${count > 1 ? ` (${count})` : ""}${owe > 0 ? `, and ${fmt(owe)} on top` : ""}`;
        let body = me ? rollBlock(label, me, me.parts.concat(fd.specialty ? ["specialty"] : [], fd.wp ? ["Willpower"] : []), !!fd.specialty) : "";
        body += `<div class="vta-big">${esc(ok ? `${mode === "sell" ? "Sold" : mode === "buy" ? "Bought" : "Bartered"}: ${what}.` : `No deal. ${why}`)}</div>`;
        if (say) body += `<div class="vta-note">${esc(name)}: ${esc(say)}</div>`;
        if (ok && !game.user.isGM) body += `<div class="vta-note">The goods and money change hands once the Storyteller approves.</div>`;
        await post(actor, `${actor.name}: trade with ${name}`, body, me?.roll ? [me.roll] : []);
        if (!ok) return { done: false, owe, why };

        const npcTokUuid = npc.isToken ? (npcTok.document?.uuid ?? npc.token?.uuid ?? null) : null;
        const data = { mode, char: actor.uuid, npc: npc.uuid, npcToken: npcTokUuid, shop: shop?.tile?.uuid ?? null, owe,
            want: want ? { name: want.name, row: want.row ?? null, item: want.item ?? null, count } : null,
            give: give ? { item: give.item, name: give.name } : null };
        await proposeOrApply("wodx-actions.trade", `${actor.name} trades with ${name}: ${what}`, data, applyTrade);
        Hooks.callAll("wodxTrade", { actor, npc, mode, owe, want: want?.name ?? null, give: give?.name ?? null });
        return { done: true, mode, owe, want: want?.name ?? null, give: give?.name ?? null, count };
    }

    /** Carry out a trade (the Storyteller's client): money, then goods both ways. */
    async function applyTrade(d) {
        const get = (id, tok) => {
            if (tok) { try { const t = fromUuidSync(tok); if (t?.actor) return t.actor; } catch (e) { /* gone */ } }
            try { const a = fromUuidSync(id); if (a instanceof Actor) return a; } catch (e) { /* an id */ }
            return game.actors.get(id) ?? null;
        };
        const ch = get(d.char), npc = get(d.npc, d.npcToken);
        if (!ch || !npc) return null;
        const shop = d.shop ? fromUuidSync(d.shop) : null;
        const M = money();
        if (d.owe > 0) { const r = await M?.transfer?.(ch, npc, d.owe, { note: `Bought from ${npc.name}` }); if (r && !r.ok) return { ok: false, short: r.short }; }
        if (d.owe < 0) { const r = await M?.transfer?.(npc, ch, -d.owe, { note: `Bought from ${ch.name}` }); if (r && !r.ok) return { ok: false, short: r.short }; }
        // What the character gets
        if (d.want) {
            if (d.want.item) await moveItem(npc, ch, d.want.item, d.want.count);
            else if (shop && d.want.row !== null) {
                const t = TR.takeFromShop(shop.flags?.[ICS]?.items, d.want.row, d.want.count);
                if (t.taken) {
                    await shop.update({ [`flags.${ICS}.items`]: t.text });
                    await ch.createEmbeddedDocuments("Item", [{ name: d.want.name, type: "Item", flags: { "wodx-sheets": { qty: t.taken }, "wodx-actions": { boughtFrom: npc.name } } }]);
                }
            }
        }
        // What the trader gets: into the shop when there is one, else onto the NPC
        if (d.give) {
            const it = ch.items.get(d.give.item);
            if (it && shop) {
                await shop.update({ [`flags.${ICS}.items`]: TR.addToShop(shop.flags?.[ICS]?.items, it.name, Math.max(1, Number(it.flags?.["wodx-sheets"]?.qty) || 1)) });
                await ch.deleteEmbeddedDocuments("Item", [it.id]);
            } else if (it) await moveItem(ch, npc, it.id, Math.max(1, Number(it.flags?.["wodx-sheets"]?.qty) || 1));
        }
        return { ok: true };
    }

    return { trade, applyTrade, shopOf, wares, offers, rules: TR };
}
