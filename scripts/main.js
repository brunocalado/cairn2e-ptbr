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

// Automated Animations plays an entry when its label is part of the used item's name, so the
// system's English labels miss every translated item. Each key is a label from the system's
// module/automated-animations-menu.js; each value is the part of the Portuguese names it must
// match. Unarmed follows CAIRN.Unarmed on its own and needs nothing here.
// AA's own default entries (Sword, Dagger, Spear, Mace, Bite, Claw…) only know English names, and
// the hook accepts no label of theirs. The Portuguese names that have a system entry with the
// same animation ride on it: Adaga on Knife (dagger), Lança on Trident (spear), Maça on Flail
// (mace), Espada on Falchion, Mordida on Beak (creature bite), Garra on Talons (creature claw).
// Rapieira, Arco, Besta and Curar Ferimentos have none, and stay unanimated.
Hooks.on("cairn2e.animationLabels", (labels) => {
  Object.assign(labels, {
    "Axe": ["Machado"],
    "Club": ["Clava"],
    "Cudgel": ["Porrete"],
    "Flail": ["Mangual", "Maça"],
    "Sickle": ["Foice"],
    "Halberd": ["Alabarda"],
    "Hammer": ["Martelo"],
    "Staff": ["Cajado"],
    "Knife": ["Faca", "Adaga"],
    "Falchion": ["Falchião", "Espada"],
    "Trident": ["Tridente", "Lança"],
    "Fists": ["Punhos"],
    "Sling": ["Funda"],
    "Throwing Knives": ["Facas de Arremesso"],
    "Blunderbuss": ["Bacamarte"],
    "Tentacles": ["Tentáculos"],
    "Talons": ["Garra"],
    "Beak": ["Bico", "Mordida"],
    "Horn": ["Chifre"],
    "Gore": ["Presas"],
    "Sting": ["Ferrão"],
    "Touch": ["Toque"],
    "Breath": ["Sopro"],
    "Shield": ["Escudo"],
    "Ward": ["Proteção"],
    "Haste": ["Velocidade"],
    "Sleep": ["Sono"],
    "Charm": ["Enfeitiçar"],
    "Hypnotize": ["Hipnotizar"],
    // The spellbook and its scroll were translated differently; both are the same spell.
    "Befuddle": ["Confundir", "Confusão"],
    "Pacify": ["Pacificar"],
    "Phobia": ["Fobia"],
    "Command": ["Comando"],
    "Web": ["Teia"],
    "Thicket": ["Matagal"],
    "Control Plants": ["Controlar Plantas"],
    "Night Sphere": ["Esfera Noturna"],
    "Elemental Wall": ["Muralha Elemental"],
    "Detect Magic": ["Detectar Magia"],
    "Cone of Foam": ["Cone de Espuma"],
    "Icy Touch": ["Toque Gélido"],
    "Flare": ["Sinalizador"],
    "Illuminate": ["Iluminar"],
    "Push/Pull": ["Empurrar/Puxar"],
    "Repel": ["Repulsão"],
    "Telekinesis": ["Telecinesia"],
    "Earthquake": ["Terremoto"],
    "Pit": ["Fosso"],
    "Fog Cloud": ["Nuvem de Névoa"],
    "Smoke Form": ["Forma de Fumaça"],
    "Arcane Eye": ["Olho Arcano"],
    "Vision": ["Visão"],
    "True Sight": ["Visão da Verdade"],
    "Wizard Mark": ["Marca do Mago"],
    "Raise": ["Erguer"],
    "Teleport": ["Teletransporte"]
  });
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
