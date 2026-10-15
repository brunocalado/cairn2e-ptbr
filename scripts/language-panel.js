/*!
 * Cairn 2e - Tradução para Português (Brasil)
 * 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID, SETTING_LANGUAGE_PROMPTED, QUERIES } from "./constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GM panel listing every player with their language and whether the pt-BR offer was already
 * made. `core.language` lives in each browser, so a player's language is only known while they
 * are connected (asked over CONFIG.queries); the "offered" mark is a user-scoped setting stored in
 * the world, so it can be read and reset even for players who are offline.
 */
export default class LanguagePanel extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @type {Map<string, string>} Language reported by each connected player, by user id. */
  #languages = new Map();

  /** @type {LanguagePanel|null} The open instance, if any. */
  static #instance = null;

  /** @type {Array<[string, number]>} Hooks registered while the panel is open, as [name, id]. */
  #hookIds = [];

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-language-panel`,
    classes: [MODULE_ID, "language-panel"],
    window: {
      title: "Idioma dos jogadores",
      icon: "fa-solid fa-language"
    },
    position: { width: 560, height: "auto" },
    actions: {
      setLanguage: this.prototype._onSetLanguage,
      offerLanguage: this.prototype._onOfferLanguage,
      resetOffer: this.prototype._onResetOffer
    }
  };

  /** @inheritDoc */
  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/language-panel.hbs` }
  };

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.users = game.users.filter(user => !user.isGM)
      .sort((a, b) => (Number(b.active) - Number(a.active)) || a.name.localeCompare(b.name))
      .map(user => {
        const lang = user.active ? (this.#languages.get(user.id) ?? null) : null;
        return {
          id: user.id,
          name: user.name,
          color: user.color.css,
          active: user.active,
          lang,
          isPortuguese: lang === "pt-BR",
          offered: this.#offerSettings(user).some(setting => setting.value === true)
        };
      });
    return context;
  }

  /**
   * The stored "already offered" settings of one user. A user-scoped setting is a Setting document
   * in the world carrying that user's id.
   * @param {User} user
   * @returns {Setting[]}
   */
  #offerSettings(user) {
    const key = `${MODULE_ID}.${SETTING_LANGUAGE_PROMPTED}`;
    return game.settings.storage.get("world").filter(setting => (setting.key === key) && (setting.user === user.id));
  }

  /** @inheritDoc */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    // The settings menu builds a fresh instance on every click; close the previous one so two
    // apps never share the same element id.
    if (LanguagePanel.#instance && (LanguagePanel.#instance !== this)) LanguagePanel.#instance.close();
    LanguagePanel.#instance = this;

    // Keep the list live as players join and leave, and as the "offered" mark changes — a player
    // answering the offer writes it from their own client.
    this.#hookIds = [
      ["userConnected", Hooks.on("userConnected", (user, connected) => {
        if (connected) this.#fetchLanguage(user);
        else this.render();
      })],
      ...["createSetting", "updateSetting", "deleteSetting"].map(hook => [hook, Hooks.on(hook, setting => {
        if (setting.key === `${MODULE_ID}.${SETTING_LANGUAGE_PROMPTED}`) this.render();
      })])
    ];
    for (const user of game.users) {
      if (user.active && !user.isGM) this.#fetchLanguage(user);
    }
  }

  /** @inheritDoc */
  _onClose(options) {
    super._onClose(options);
    for (const [hook, id] of this.#hookIds) Hooks.off(hook, id);
    this.#hookIds = [];
    if (LanguagePanel.#instance === this) LanguagePanel.#instance = null;
  }

  /**
   * Ask a connected player's client for its language, then redraw.
   * @param {User} user
   */
  async #fetchLanguage(user) {
    try {
      const { lang } = await user.query(QUERIES.GET_LANGUAGE, {}, { timeout: 10_000 });
      this.#languages.set(user.id, lang);
    }
    catch(err) {
      console.warn(`${MODULE_ID} | Failed to read the language of "${user.name}"`, err);
    }
    this.render();
  }

  /**
   * Switch a connected player to pt-BR; their client then asks to reload.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  async _onSetLanguage(event, target) {
    const user = game.users.get(target.dataset.userId);
    if (!user?.active) return;
    target.disabled = true;
    try {
      await user.query(QUERIES.SET_LANGUAGE, {}, { timeout: 10_000 });
      this.#languages.set(user.id, "pt-BR");
      ui.notifications.info(`Idioma de ${user.name} mudado para Português (Brasil). O jogador vai confirmar o recarregamento.`);
    }
    catch(err) {
      console.error(`${MODULE_ID} | Failed to change the language of "${user.name}"`, err);
      ui.notifications.warn(`Não foi possível mudar o idioma de ${user.name}.`);
    }
    this.render();
  }

  /**
   * Show the offer dialog on a connected player's screen now.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  async _onOfferLanguage(event, target) {
    const user = game.users.get(target.dataset.userId);
    if (!user?.active) return;
    try {
      await user.query(QUERIES.OFFER_LANGUAGE, {}, { timeout: 10_000 });
      ui.notifications.info(`Oferta de idioma enviada para ${user.name}.`);
    }
    catch(err) {
      console.error(`${MODULE_ID} | Failed to offer the language to "${user.name}"`, err);
      ui.notifications.warn(`Não foi possível enviar a oferta para ${user.name}.`);
    }
  }

  /**
   * Forget that a player was offered the switch, so the dialog shows on their next login.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  async _onResetOffer(event, target) {
    const user = game.users.get(target.dataset.userId);
    if (!user) return;
    const ids = this.#offerSettings(user).map(setting => setting.id);
    if (ids.length) await foundry.documents.Setting.deleteDocuments(ids);
    ui.notifications.info(`A oferta de idioma vai aparecer para ${user.name} no próximo login.`);
  }
}
