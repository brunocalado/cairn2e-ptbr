/*!
 * Cairn 2e - Tradução para Português (Brasil)
 * 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID, SETTING_LANGUAGE_PROMPTED, LANGUAGE_PANEL_MENU, QUERIES } from "./constants.js";
import LanguagePanel from "./language-panel.js";

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
// AA picks the longest label found in the name (spaces dropped, lowercase), so a longer alias
// claims a name from a shorter one: Faca de Raízes stays a knife although Raízes is Roots, and
// Gavinhas stays Tendrils although it holds Vinhas. Garras, not Garra, so Garrafa is no claw.
// Names the English labels only catch by accident (Runic Harm, Scrying Ward, Breath Soup) get no
// alias. Maça still catches Pelotas de Fumaça: no shorter Portuguese part tells them apart.
// Curar Ferimentos has no system entry, and stays unanimated.
Hooks.on("cairn2e.animationLabels", (labels) => {
  Object.assign(labels, {
    "Axe": ["Machado"],
    "Club": ["Clava"],
    "Cudgel": ["Porrete"],
    "Flail": ["Mangual"],
    "Sickle": ["Foice"],
    "Halberd": ["Alabarda"],
    "Hammer": ["Martelo"],
    "Staff": ["Cajado"],
    "Knife": ["Faca", "Faca de Raízes"],
    "Falchion": ["Falchião"],
    "Trident": ["Tridente"],
    "Fists": ["Punhos"],
    "Sling": ["Funda"],
    "Throwing Knives": ["Facas de Arremesso"],
    "Blunderbuss": ["Bacamarte"],
    "Tentacles": ["Tentáculos"],
    "Talons": ["Garras Aduncas"],
    "Beak": ["Bico"],
    "Sword": ["Espada"],
    "Greatsword": ["Montante"],
    "Blade": ["Lâmina"],
    "Last Breath": ["Último Suspiro"],
    "Rapier": ["Rapieira"],
    "Dagger": ["Adaga"],
    "Spear": ["Lança"],
    "Mace": ["Maça"],
    "Handaxe": ["Machado de Mão"],
    "Whip": ["Chicote", "Açoite"],
    "Saw": ["Serra", "Serrote"],
    "Awl": ["Sovela"],
    "Trowel": ["Pá de Mão"],
    "Stake": ["Estaca"],
    "Crowbar": ["Pé de Cabra"],
    "Bow": ["Arco"],
    "Crossbow": ["Besta"],
    "Stone Pine": ["Pinheiro-Manso"],
    "Western Yew": ["Teixo Ocidental"],
    "White Ash": ["Freixo Branco"],
    "Wych Elm": ["Olmo-Montano"],
    "Sessile Oak": ["Carvalho Séssil"],
    "Striped Bamboo": ["Bambu Listrado"],
    "Alchemical Limb": ["Membro Alquímico"],
    "Metal Arm": ["Braço de Metal"],
    "Metal Foot": ["Pé de Metal"],
    "Spiked Boots": ["Botas com Cravos"],
    "Tupshead Crown": ["Coroa do Carneiro"],
    "Blast Sphere": ["Esfera Explosiva"],
    "Fire Eggs": ["Ovos de Fogo"],
    "Fireseeds": ["Sementes de Fogo"],
    "Seed Bomb": ["Bomba de Sementes"],
    "Bite": ["Mordida"],
    "Claw": ["Garras"],
    "Teeth": ["Dentes"],
    "Nails": ["Unhas", "Pregos"],
    "Hooves": ["Cascos"],
    "Charge": ["Investida"],
    "Knotted Arms": ["Braços Nodosos"],
    "Sharpened Arms": ["Braços Afiados"],
    "Tuber-Fingers": ["Dedos-Tubérculo"],
    "Tail Spike": ["Espinho da Cauda"],
    "Life Drain": ["Dreno Vital"],
    "Roots": ["Raízes"],
    "Vines": ["Vinhas"],
    "Tendrils": ["Gavinhas"],
    "Spray": ["Jato", "Jorro"],
    "Acid": ["Ácido"],
    "Horn": ["Chifre"],
    "Gore": ["Presas"],
    "Sting": ["Ferrão"],
    "Touch": ["Toque"],
    "Breath": ["Sopro"],
    "Shield": ["Escudo"],
    "Ward": ["Proteção"],
    "Haste": ["Velocidade"],
    "Sleep": ["Sono"],
    "Charm": ["Enfeitiçar", "Encanto"],
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

  // Hardcoded in Portuguese like the offer dialog: the GM opening it may not be in pt-BR yet.
  game.settings.registerMenu(MODULE_ID, LANGUAGE_PANEL_MENU, {
    name: "Idioma dos jogadores",
    label: "Abrir painel",
    hint: "Veja o idioma de cada jogador, reative a oferta de troca para Português (Brasil) ou mude o idioma de quem está conectado.",
    icon: "fa-solid fa-language",
    type: LanguagePanel,
    restricted: true
  });

  // The language panel's requests. Any client can call a registered query, so each one checks the
  // server-supplied sender before acting.
  CONFIG.queries[QUERIES.GET_LANGUAGE] = async (data, { user }) => {
    if (!user?.isGM) throw new Error("Only a GM can read a player's language");
    return { lang: game.i18n.lang };
  };
  CONFIG.queries[QUERIES.SET_LANGUAGE] = async (data, { user }) => {
    if (!user?.isGM) throw new Error("Only a GM can change a player's language");
    await game.settings.set("core", "language", "pt-BR");
    // Not awaited: the GM's query resolves now, not when the player answers the reload prompt.
    foundry.applications.settings.SettingsConfig.reloadConfirm({ world: false });
    return { ok: true };
  };
  CONFIG.queries[QUERIES.OFFER_LANGUAGE] = async (data, { user }) => {
    if (!user?.isGM) throw new Error("Only a GM can offer the language switch");
    // Not awaited, for the same reason: the dialog waits on the player.
    offerLanguage();
    return { ok: true };
  };
});

Hooks.once("ready", () => {
  if (game.i18n.lang === "pt-BR" || game.settings.get(MODULE_ID, SETTING_LANGUAGE_PROMPTED)) return;
  offerLanguage();
});

/**
 * Ask this client whether to switch Foundry to pt-BR. The user is marked as asked before the
 * dialog opens, so closing it or reloading counts as an answer.
 */
async function offerLanguage() {
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
}
