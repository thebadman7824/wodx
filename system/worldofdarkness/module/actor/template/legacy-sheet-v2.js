/**
 * WoDX fork (B6110 to B6113): the base that moves the line sheets (Mortal, Vampire, Werewolf and the rest) from the
 * old sheet engine (foundry.appv1 ActorSheet) to ApplicationV2 with the Handlebars mixin, one line at a time.
 *
 * The line sheets were written for the old engine: getData(), activateListeners(html) with jQuery, a template whose
 * root is a <form>, tabs given in defaultOptions, editors drawn with {{editor}}, the profile image as img[data-edit].
 * This class gives a line sheet all of those on ApplicationV2, so a line's own code and templates move unchanged and
 * nothing it does is lost:
 *   - _prepareContext calls getData(), which returns the context the old engine gave (actor, data, items, editable...);
 *   - the one part renders the line's template; its <form> root becomes a <div> with the same classes, because the
 *     whole window is the form now (B6111);
 *   - _renderInner(data) still exists, so a module that wraps it (WoDX Sheets) keeps working;
 *   - after each render: the old tabs controllers bind, {{editor}} boxes become <prose-mirror> editors bound to the
 *     same field, the profile image opens the file picker, and activateListeners(html) runs with jQuery as before;
 *   - a change to any named field saves the whole form, as the old engine did (submitOnChange), minus values an
 *     active effect overrides; an editor with unsaved text saves when the sheet closes (submitOnClose);
 *   - scroll positions of the open tab and the sheet body survive a redraw.
 * Which lines use it is the LINES_V2 list in wod.js.
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const toJQ = el => (globalThis.jQuery ? globalThis.jQuery(el) : el);

/** Turn a rendered <form> root into a <div> with the same attributes and children (exported for the harness). */
export function formToDiv(el, doc = globalThis.document) {
	if (!el || el.tagName !== "FORM") return el;
	const div = doc.createElement("div");
	for (const a of el.attributes) div.setAttribute(a.name, a.value);
	div.classList.add("wod-legacy-form");
	while (el.firstChild) div.appendChild(el.firstChild);
	return div;
}

/** Split the old engine's class strings ("wod20 wod-sheet mortal") into single names, without repeats. */
export function legacyClasses(...lists) {
	const out = [];
	for (const list of lists) for (const c of list ?? []) for (const name of String(c).split(/\s+/)) if (name && !out.includes(name)) out.push(name);
	return out;
}

export default class LegacyActorSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {

	static DEFAULT_OPTIONS = {
		classes: ["sheet", "actor", "wod-legacy-v2"],
		form: {
			submitOnChange: true,
			closeOnSubmit: false,
			handler: LegacyActorSheetV2.#onSubmitLegacy
		},
		window: {
			icon: "fa-solid fa-dice-d10",
			resizable: true
		},
		position: {
			width: 800,
			height: 720
		},
		viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED
	};

	/** One part; its template is the line's own (the class's template getter), read when the class is first drawn. */
	static get PARTS() {
		if (!Object.hasOwn(this, "_wodLegacyParts")) {
			const template = this._findTemplate();
			const path = typeof template?.get === "function" ? template.get.call(this.prototype) : template?.value;
			this._wodLegacyParts = { sheet: { template: path, scrollable: [] } };
		}
		return this._wodLegacyParts;
	}

	static _findTemplate() {
		for (let p = this.prototype; p && p !== LegacyActorSheetV2.prototype; p = Object.getPrototypeOf(p)) {
			const d = Object.getOwnPropertyDescriptor(p, "template");
			if (d) return d;
		}
		return null;
	}

	/** The old engine's options, which the line classes merge into (classes, tabs). */
	static get defaultOptions() {
		return { classes: [], tabs: [], template: null };
	}

	/** True on every sheet drawn through this base: hooks and modules tell old and new sheets apart by it. */
	get isLegacyBridge() { return true; }

	/** The old engine called the document "object". */
	get object() { return this.document; }

	get template() { return this.constructor.PARTS.sheet.template; }

	get title() {
		return this.actor.isToken ? `[Token] ${this.actor.name}` : this.actor.name;
	}

	_initializeApplicationOptions(options) {
		const legacy = this.constructor.defaultOptions ?? {};
		const opts = super._initializeApplicationOptions(options);
		opts.classes = legacyClasses(opts.classes, legacy.classes);
		if (legacy.width) opts.position.width = legacy.width;
		if (legacy.height) opts.position.height = legacy.height;
		opts.legacyTabs = (legacy.tabs ?? []).map(t => ({ ...t }));
		// The old engine's options.editable: the line code still asks it before binding edit listeners
		const sheet = this;
		Object.defineProperty(opts, "editable", { get() { return sheet.isEditable; }, enumerable: true, configurable: false });
		return opts;
	}

	/** The old engine's tabs controllers, kept for the sheet's life so a redraw keeps the open tab. */
	get _tabs() {
		if (!this._wodTabs) {
			this._wodTabs = (this.options.legacyTabs ?? []).map(t => new foundry.applications.ux.Tabs({
				...t, callback: (event, tabs, active) => this._onChangeTab?.(event, tabs, active)
			}));
		}
		return this._wodTabs;
	}

	_onChangeTab(_event, _tabs, _active) {}

	/** As on the old engine: open a tab by name, in the first group or the one named. */
	activateTab(tabName, { group, triggerCallback = false } = {}) {
		const tabs = group ? this._tabs.find(t => t.group === group) : this._tabs[0];
		tabs?.activate(tabName, { triggerCallback });
	}

	/* -------------------------------------------- */
	/*  Context                                      */
	/* -------------------------------------------- */

	async _prepareContext(options) {
		this._wodRenderOptions = options;
		return this.getData(options);
	}

	/** The context the old engine's ActorSheet gave: the line sheets add to it. */
	async getData(options = this._wodRenderOptions ?? {}) {
		const base = await super._prepareContext(options);
		const data = this.document.toObject(false);
		const editable = this.isEditable;
		const items = data.items ?? [];
		items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
		return Object.assign(base, {
			cssClass: editable ? "editable" : "locked",
			editable,
			document: this.document,
			data,
			limited: this.document.limited,
			options: this.options,
			owner: this.document.isOwner,
			title: this.title,
			actor: this.actor,
			items,
			effects: data.effects ?? []
		});
	}

	/* -------------------------------------------- */
	/*  Rendering                                    */
	/* -------------------------------------------- */

	/** The old engine's inner render: the line's template as one element (jQuery), its <form> root made a <div>. */
	async _renderInner(data) {
		const parts = await super._renderHTML(data, this._wodRenderOptions ?? {});
		const el = formToDiv(parts.sheet);
		if (el) el.dataset.applicationPart = "sheet";
		return toJQ(el);
	}

	async _renderHTML(context, options) {
		this._wodRenderOptions = options;
		const html = await this._renderInner(context);
		const el = html?.[0] ?? html;
		this._upgradeEditors(el);
		return { sheet: el };
	}

	async _preRender(context, options) {
		await super._preRender(context, options);
		this._wodScroll = this._readScroll();
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		const part = this.element.querySelector("[data-application-part=sheet]") ?? this.element;
		for (const t of this._tabs) t.bind(part);
		this._bindImages(part);
		this._bindEditorSave(part);
		this.activateListeners(toJQ(part));
		this._writeScroll(this._wodScroll);
	}

	/** The old engine's inner redraw (the lock button calls it) and its bring-to-top, on ApplicationV2. */
	async _render(force = false, options = {}) { return this.render({ ...options, force }); }

	bringToTop() { return this.bringToFront(); }

	/** Bind the sheet's own listeners. The line sheets override this and call super first. */
	activateListeners(_html) {}

	/** {{editor}} boxes become <prose-mirror> editors on the same field, always open as the old ones were (button=false). */
	_upgradeEditors(root) {
		const PM = foundry.applications.elements?.HTMLProseMirrorElement;
		if (!root?.querySelectorAll || !PM) return;
		for (const content of root.querySelectorAll(".editor-content[data-edit]")) {
			const name = content.dataset.edit;
			const wrap = content.closest(".editor") ?? content;
			const raw = foundry.utils.getProperty(this.document._source, name);
			const pm = PM.create({ name, value: String(raw ?? ""), enriched: content.innerHTML, toggled: !!wrap.querySelector?.(".editor-edit") });
			pm.classList.add("wod-legacy-editor", ...[...content.classList].filter(c => c !== "editor-content"));
			if (!this.isEditable) pm.disabled = true;
			wrap.replaceWith(pm);
		}
	}

	/** The profile image (img[data-edit]) opens the file picker and saves the chosen path, as on the old engine. */
	_bindImages(root) {
		if (!this.isEditable) return;
		for (const img of root.querySelectorAll("img[data-edit]")) {
			if (img.dataset.action) continue;
			img.addEventListener("click", ev => {
				ev.preventDefault();
				const attr = img.dataset.edit;
				const FP = foundry.applications.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
				new FP({
					type: "image", current: foundry.utils.getProperty(this.document._source, attr),
					callback: path => this.document.update({ [attr]: path }),
					top: this.position.top + 40, left: this.position.left + 10
				}).browse();
			});
		}
	}

	/** An always-open editor saves when it loses focus, so typed text is never left unsaved. */
	_bindEditorSave(root) {
		for (const pm of root.querySelectorAll("prose-mirror.wod-legacy-editor")) {
			pm.addEventListener("focusout", ev => {
				if (pm.contains(ev.relatedTarget)) return;
				if (pm.isDirty?.()) this.submit().catch(e => console.error("WoD | sheet editor save", e));
			});
		}
	}

	_readScroll() {
		const el = this.element;
		if (!el?.querySelectorAll) return null;
		const out = { tabs: {} };
		const body = el.querySelector(".sheet-body");
		if (body) out.body = body.scrollTop;
		for (const tab of el.querySelectorAll(".tab[data-tab]")) if (tab.scrollTop) out.tabs[`${tab.dataset.group ?? ""}:${tab.dataset.tab}`] = tab.scrollTop;
		const content = el.querySelector(".window-content");
		if (content) out.content = content.scrollTop;
		return out;
	}

	_writeScroll(s) {
		if (!s) return;
		const el = this.element;
		const body = el.querySelector(".sheet-body");
		if (body && s.body) body.scrollTop = s.body;
		for (const tab of el.querySelectorAll(".tab[data-tab]")) {
			const v = s.tabs[`${tab.dataset.group ?? ""}:${tab.dataset.tab}`];
			if (v) tab.scrollTop = v;
		}
		const content = el.querySelector(".window-content");
		if (content && s.content) content.scrollTop = s.content;
	}

	/* -------------------------------------------- */
	/*  Saving                                       */
	/* -------------------------------------------- */

	/** The whole form saves on a change, as on the old engine, without values that an active effect overrides. */
	static async #onSubmitLegacy(_event, _form, formData) {
		if (!this.document.id) return;
		const data = foundry.utils.flattenObject(formData.object ?? {});
		const overrides = foundry.utils.flattenObject(this.document.overrides ?? {});
		for (const k of Object.keys(overrides)) delete data[k];
		if (!Object.keys(data).length) return;
		await this.document.update(data);
	}

	async _preClose(options) {
		await super._preClose(options);
		// submitOnClose: an editor with unsaved text saves before the sheet goes
		const dirty = [...(this.element?.querySelectorAll?.("prose-mirror.wod-legacy-editor") ?? [])].some(pm => pm.isDirty?.());
		if (dirty && this.isEditable) {
			try { await this.submit(); } catch (e) { console.error("WoD | sheet save on close", e); }
		}
	}
}
