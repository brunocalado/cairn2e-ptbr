/*!
 * Cairn 2e - Tradução para Português (Brasil)
 * 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

export const MODULE_ID = "cairn2e-ptbr";

/** User setting: this user has already been offered the switch to pt-BR in this world. */
export const SETTING_LANGUAGE_PROMPTED = "languagePrompted";

/** Settings menu opening the GM's language panel. */
export const LANGUAGE_PANEL_MENU = "languagePanel";

/** GM -> player queries on CONFIG.queries, prefixed so no other package overwrites them. */
export const QUERIES = {
  GET_LANGUAGE: `${MODULE_ID}.getLanguage`,
  SET_LANGUAGE: `${MODULE_ID}.setLanguage`,
  OFFER_LANGUAGE: `${MODULE_ID}.offerLanguage`
};
