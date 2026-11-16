export default class TokenHelper {
    static async formShift(actor, fromForm, toForm) {        

        if (actor.type != CONFIG.worldofdarkness.sheettype.werewolf) {
            return;
        }

        if (fromForm == toForm) {
            return;
        }

        // WoDX fork (B6727): upstream switched this off (an early return) when Foundry dropped
        // TokenDocument.toggleActiveEffect, so a line werewolf's token never showed its form. The form now shows as a
        // status icon on the actor's tokens, the way the PC sheet's shapeforms do (wod_shapeform_* statuses).
        return this.showForm(actor, toForm);

		let foundToken = false;

		let token = await canvas.tokens.placeables.find(t => t.document.actorId === actor._id);
		if(token) foundToken = true;

		if (foundToken) {
            

            await this._clearForms(token, actor);
            //await token.document.toggleActiveEffect(this._getEffectData(toForm));
            await this._applyEffect(token, toForm, true);
            await this._applyActorEffect(actor, toForm, true);
		}			
    }

    /** B6727: the form's icon on the actor's tokens; Homid (the breed form for most) shows none. */
    static async showForm(actor, toForm) {
        const key = String(toForm ?? "").replace(/^wod\.shapes\./, "");
        const FORMS = ["homid", "glabro", "crinos", "hispo", "lupus"];
        if (!actor?.effects || !FORMS.includes(key)) return null;
        const statusId = `wod_shapeform_form_${key}`;
        const img = `systems/worldofdarkness/assets/img/werewolf/form/form_${key}.svg`;
        const name = game.i18n.localize(`wod.shapes.${key}`);
        if (Array.isArray(CONFIG.statusEffects) && !CONFIG.statusEffects.find(x => x.id === statusId)) CONFIG.statusEffects.push({ id: statusId, name, img });
        const mine = [...actor.effects].filter(e => e.flags?.worldofdarkness?.shapeformIcon === true || [...(e.statuses ?? [])].some(x => String(x).startsWith("wod_shapeform_")));
        const stale = mine.filter(e => !e.statuses?.has?.(statusId));
        if (stale.length) await actor.deleteEmbeddedDocuments("ActiveEffect", stale.map(e => e.id));
        if (key === "homid" || mine.some(e => e.statuses?.has?.(statusId))) return statusId;
        await actor.createEmbeddedDocuments("ActiveEffect", [{ name, img, statuses: [statusId], disabled: false,
            showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON?.ALWAYS ?? 2, flags: { worldofdarkness: { shapeformIcon: true } } }]);
        return statusId;
    }

    static async _clearForms(token, actor) {
        if (token.document.hasStatusEffect("form_homid")) {
            //await token.document.toggleActiveEffect(this._getEffectData("wod.shapes.homid"));
            await this._applyEffect(token, "wod.shapes.homid", false);
            await this._applyActorEffect(actor, "wod.shapes.homid", false);
        }

        if (token.document.hasStatusEffect("form_glabro")) {
            //await token.document.toggleActiveEffect(this._getEffectData("wod.shapes.glabro"));
            await this._applyEffect(token, "wod.shapes.glabro", false);
            await this._applyActorEffect(actor, "wod.shapes.glabro", false);
        }

        if (token.document.hasStatusEffect("form_crinos")) {
            //await token.document.toggleActiveEffect(this._getEffectData("wod.shapes.crinos"));
            await this._applyEffect(token, "wod.shapes.crinos", false);
            await this._applyActorEffect(actor, "wod.shapes.crinos", false);
        }

        if (token.document.hasStatusEffect("form_hispo")) {
            //await token.document.toggleActiveEffect(this._getEffectData("wod.shapes.hispo"));
            await this._applyEffect(token, "wod.shapes.hispo", false);
            await this._applyActorEffect(actor, "wod.shapes.hispo", false);
        }

        if (token.document.hasStatusEffect("form_lupus")) {
            //await token.document.toggleActiveEffect(this._getEffectData("wod.shapes.lupus"));
            await this._applyEffect(token, "wod.shapes.lupus", false);
            await this._applyActorEffect(actor, "wod.shapes.lupus", false);
        }
    }

    static _getEffectData(toForm) {
        let effectData = "";

        if (toForm == "wod.shapes.homid") {
            effectData = {
                label: "form_homid",
                //label: game.i18n.localize("wod.shapes.homid"),
                icon: "systems/worldofdarkness/assets/img/werewolf/form/form_homid.svg"
            }
        }
        if (toForm == "wod.shapes.glabro") {
            effectData = {
                label: "form_glabro",
                //label: game.i18n.localize("wod.shapes.glabro"),
                icon: "systems/worldofdarkness/assets/img/werewolf/form/form_glabro.svg"
            }
        }
        if (toForm == "wod.shapes.crinos") {
            effectData = {
                label: "form_crinos",
                //label: game.i18n.localize("wod.shapes.crinos"),
                icon: "systems/worldofdarkness/assets/img/werewolf/form/form_crinos.svg"
            }
        }
        if (toForm == "wod.shapes.hispo") {
            effectData = {
                label: "form_hispo",
                //label: game.i18n.localize("wod.shapes.hispo"),
                icon: "systems/worldofdarkness/assets/img/werewolf/form/form_hispo.svg"
            }
        }
        if (toForm == "wod.shapes.lupus") {
            effectData = {
                label: "form_lupus",
                //label: game.i18n.localize("wod.shapes.lupus"),
                icon: "systems/worldofdarkness/assets/img/werewolf/form/form_lupus.svg"
            }
        }

        return effectData;
    }

    static async _applyEffect(token, form, active) {
        if (await token.document.toggleActiveEffect(this._getEffectData(form), {active: active})) {
            console.log("WoD | Turning on " + form);
        }
        else {
            console.log("Turning off " + form);
        }
    }

    static async _applyActorEffect(actor, form, active) {
        if (await actor.toggleActiveEffect(this._getEffectData(form), {active: active})) {
            console.log("WoD | Turning on " + form);
        }
        else {
            console.log("WoD | Turning off " + form);
        }
    }
}

/* 

export default class TokenHelper {
    static async formShift(actor, fromForm, toForm) {
        if (actor.type != CONFIG.worldofdarkness.sheettype.werewolf) {
            return;
        }

        if (fromForm == toForm) {
            return;
        }

		let foundToken = false;
        let visible = undefined;

		let token = await canvas.tokens.placeables.find(t => t.document.actorId === actor._id);
		if(token) foundToken = true;

		if (foundToken) {
            await this._clearForms(token);
            if (await token.document.toggleActiveEffect(await this._getEffectData(toForm))) {
                // effect was applied
            }
		}			
    }

    static async _clearForms(token) {
        if (await token.document.hasStatusEffect("form_homid")) {
            if (!await token.document.toggleActiveEffect(await this._getEffectData("wod.shapes.homid"))) {
                // effect was removed
            }
        }

        if (await token.document.hasStatusEffect("form_glabro")) {
            if (!await token.document.toggleActiveEffect(await this._getEffectData("wod.shapes.glabro"))) {
                // effect was removed
            }
        }

        if (await token.document.hasStatusEffect("form_crinos")) {
            if (!await token.document.toggleActiveEffect(await this._getEffectData("wod.shapes.crinos"))) {
                // effect was removed
            }
        }

        if (await token.document.hasStatusEffect("form_hispo")) {
            if (!await token.document.toggleActiveEffect(await this._getEffectData("wod.shapes.hispo"))) {
                // effect was removed
            }
        }

        if (await token.document.hasStatusEffect("form_lupus")) {
            if (!await token.document.toggleActiveEffect(await this._getEffectData("wod.shapes.lupus"))) {
                // effect was removed
            }
        }
    }

    static async _getEffectData(toForm) {
        let effectData = "";

        if (toForm == "wod.shapes.homid") {
            effectData = {
                id: "form_homid",
                label: game.i18n.localize("wod.shapes.homid"),
                icon: "systems/worldofdarkness/assets/img/werewolf/form/form_homid.svg"
            }
        }
        if (toForm == "wod.shapes.glabro") {
            effectData = {
                id: "form_glabro",
                label: game.i18n.localize("wod.shapes.glabro"),
                icon: "systems/worldofdarkness/assets/img/werewolf/form/form_glabro.svg"
            }
        }
        if (toForm == "wod.shapes.crinos") {
            effectData = {
                id: "form_crinos",
                label: game.i18n.localize("wod.shapes.crinos"),
                icon: "systems/worldofdarkness/assets/img/werewolf/form/form_crinos.svg"
            }
        }
        if (toForm == "wod.shapes.hispo") {
            effectData = {
                id: "form_hispo",
                label: game.i18n.localize("wod.shapes.hispo"),
                icon: "systems/worldofdarkness/assets/img/werewolf/form/form_hispo.svg"
            }
        }
        if (toForm == "wod.shapes.lupus") {
            effectData = {
                id: "form_lupus",
                label: game.i18n.localize("wod.shapes.lupus"),
                icon: "systems/worldofdarkness/assets/img/werewolf/form/form_lupus.svg"
            }
        }

        return effectData;
    }
} */