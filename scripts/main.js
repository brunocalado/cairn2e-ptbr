/*!
 * Cairn 2e - Tradução para Português (Brasil)
 * 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID, SETTING_LANGUAGE_PROMPTED } from "./constants.js";

// Babele reads compendium/<system>.<pack>.json; the system's docs/translating.md is the contract
// for what those files may translate.
Hooks.once("babele.init", (babele) => {
  // Cairn keeps descriptions in `system.description` (a plain HTML string), not Babele's default
  // `system.description.value`. Registered globally rather than per file so the Items embedded in
  // bestiary and hireling Actors are covered too.
  babele.registerMapping({
    Item: { description: "system.description", recharge: "system.recharge" },
    Actor: { description: "system.description", career: "system.career" }
  });
  babele.register({ module: MODULE_ID, lang: "pt-BR", dir: "compendium" });
});

Hooks.once("init", () => {
  // User scope (per world, per user) even though `core.language` is per client: a "no" given in
  // one world, or a browser switched back to English for another system, must not silence the
  // offer in every Cairn world on that browser.
  game.settings.register(MODULE_ID, SETTING_LANGUAGE_PROMPTED, {
    scope: "user",
    config: false,
    type: Boolean,
    default: false
  });
});

Hooks.once("ready", async () => {
  if (game.i18n.lang === "pt-BR" || game.settings.get(MODULE_ID, SETTING_LANGUAGE_PROMPTED)) return;
  await game.settings.set(MODULE_ID, SETTING_LANGUAGE_PROMPTED, true);

  // Hardcoded in Portuguese: this dialog only appears while the client is NOT in pt-BR, so the
  // module's own lang file isn't loaded yet, and its audience reads Portuguese.
  const switchLanguage = await foundry.applications.api.DialogV2.confirm({
    // The system's id as a class opts the window into its paper-and-ink styling, the same way the
    // system's own dialogs get it.
    classes: ["cairn2e"],
    window: { title: "Cairn 2e — Português (Brasil)" },
    content: `<img src="modules/${MODULE_ID}/assets/flag-brazil.svg" alt="Bandeira do Brasil"`
      + ` style="display: block; width: 120px; margin: 0 auto 0.5rem; border: none;">`
      + "<p>Deseja mudar o idioma do Foundry VTT para <strong>Português (Brasil)</strong>?</p>"
      + "<p>O mundo será recarregado. Você pode mudar isso depois em Configurações → Idioma.</p>",
    yes: { label: "Sim, mudar" },
    no: { label: "Não" },
    rejectClose: false
  });
  if (!switchLanguage) return;
  await game.settings.set("core", "language", "pt-BR");
  foundry.utils.debouncedReload();
});
