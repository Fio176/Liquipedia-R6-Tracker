
// Helper : breakApart sécurisé (ignore les erreurs de fusion partielle)
function safeBreakApart(range) {
  try { range.breakApart(); } catch(e) {
    // Essai ligne par ligne si la plage entière échoue
    const numRows = range.getNumRows(), numCols = range.getNumColumns();
    const row0 = range.getRow(), col0 = range.getColumn();
    const sh = range.getSheet();
    for (let r = row0; r < row0 + numRows; r++) {
      for (let c = col0; c < col0 + numCols; c++) {
        try { sh.getRange(r, c, 1, 1).breakApart(); } catch(e2) {}
      }
    }
  }
  return range;
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  BLAST R6 MAJOR 2026 – Match Tracker v23                        ║
// ║  Data source: LiquipediaDB API (real-time)                      ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  AUTHOR                                                          ║
// ║  Fio' — Fiorenzo Elba                                           ║
// ║  Rainbow Six Siege caster (French stream)                       ║
// ║  Built with the assistance of Claude (Anthropic)                ║
// ║  Contact: https://x.com/fofiopathe                              ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  SETUP                                                           ║
// ║  1. Replace YOUR_TOKEN_HERE with your LiquipediaDB API key      ║
// ║  2. Extensions > Apps Script → paste → Ctrl+S                   ║
// ║  3. Menu 🎮 BLAST Major → "🚀 Build All"                        ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  ATTRIBUTION (CC-BY-SA)                                         ║
// ║  Data provided by Liquipedia (https://liquipedia.net)           ║
// ║  Special thanks to the Liquipedia team for their incredible     ║
// ║  work and for making this data freely accessible.               ║
// ║  Licensed under CC-BY-SA                                        ║
// ║  https://liquipedia.net/commons/Liquipedia:Copyrights           ║
// ╚══════════════════════════════════════════════════════════════════╝

// ⚙️ La clé LiquipediaDB est stockée dans les propriétés du script (sécurisé)
// Pour la configurer : Extensions → Apps Script → Exécuter → setLiquipediaKey()
const LIQUIPEDIA_KEY = PropertiesService.getScriptProperties().getProperty('LIQUIPEDIA_KEY') || "";


// ════════════════════════════════════════════════════════════════
//  CONFIGURATION DE LA CLÉ LIQUIPEDIA (à exécuter une seule fois)
// ════════════════════════════════════════════════════════════════
function setLiquipediaKey() {
  const ui  = SpreadsheetApp.getUi();
  const rep = ui.prompt(
    '🔑 Clé LiquipediaDB',
    'Entre ta clé API LiquipediaDB :',
    ui.ButtonSet.OK_CANCEL
  );
  if (rep.getSelectedButton() === ui.Button.OK) {
    const key = rep.getResponseText().trim();
    if (key) {
      PropertiesService.getScriptProperties().setProperty('LIQUIPEDIA_KEY', key);
      ui.alert('✅ Clé enregistrée avec succès !');
    } else {
      ui.alert("⚠️ Clé vide, rien n'a été enregistré.");
    }
  }
}

function verifierCle() {
  const key = PropertiesService.getScriptProperties().getProperty('LIQUIPEDIA_KEY');
  SpreadsheetApp.getUi().alert(key ? '✅ Clé configurée (' + key.length + ' caractères)' : '❌ Aucune clé configurée');
}

// 🖼️ DOSSIER GOOGLE DRIVE — logos opérateurs et drapeaux
const OPERATORS_FOLDER_ID = "1I7W_11xhLIZ3Wwd_VuRgzRI6xc-ley8D";
let   _opLogos = null; // cache global

const MAPS_DISPLAY = [
  "Lair","Chalet","Consulate","Clubhouse","Bank",
  "Nighthaven Labs","Kafe Dostoyevsky","Border","Fortress"
];
const MAPS_FR = {
  "Lair":"REPAIRE","Chalet":"CHALET","Consulate":"CONSULAT",
  "Clubhouse":"CLUB HOUSE","Bank":"BANQUE","Nighthaven Labs":"NIGHTHAVEN",
  "Kafe Dostoyevsky":"CAFÉ","Border":"BORDER","Fortress":"FORTERESSE",
};

const TEAMS = [
  ["G2 Esports",        ["G2 Esports"],                         "EML"],
  ["Team Falcons",      ["Team Falcons"],                        "EML"],
  ["Virtus.pro",        ["Virtus.pro", "Virtus Pro"],            "EML"],
  ["Twisted Minds",     ["Twisted Minds"],                       "EML"],
  ["Fnatic",            ["Fnatic"],                              "EML"],
  ["Team Secret",       ["Team Secret"],                         "EML"],
  ["Team Heretics",     ["Team Heretics"],                       "EML"],
  ["Geekay Esports",    ["Geekay Esports", "Geekay"],            "EML"],
  ["Shifters",          ["Shifters"],                            "EML"],
  ["Rebels Gaming",     ["Rebels Gaming", "RBLS Gaming", "Rebels", "Team Secret Academy", "ex-Team Secret Academy"], "EML"],
];

// ════════════════════════════════════════════════════════════════
//  APPEL LIQUIPEDIADB API
// ════════════════════════════════════════════════════════════════
function callLiquipediaDB(endpoint, params) {
  if (LIQUIPEDIA_KEY === "TON_TOKEN_ICI") {
    SpreadsheetApp.getUi().alert("⚠️ Configure ta clé LiquipediaDB ligne 25 !");
    return null;
  }

  const base = "https://api.liquipedia.net/api/v3/";
  const qs   = Object.entries(params)
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const url  = base + endpoint + "?" + qs;

  try {
    const resp = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "Authorization": "Apikey " + LIQUIPEDIA_KEY,
        "Accept":        "application/json",
      },
      muteHttpExceptions: true,
    });

    const code = resp.getResponseCode();
    if (code !== 200) {
      Logger.log(`LiquipediaDB error ${code}: ${resp.getContentText()}`);
      return null;
    }

    return JSON.parse(resp.getContentText());
  } catch(e) {
    Logger.log("LiquipediaDB fetch error: " + e.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
//  RÉCUPÉRER LES MATCHS D'UNE ÉQUIPE
// ════════════════════════════════════════════════════════════════
function fetchMatchesForTeam(teamName, aliases, dateDebut, dateFin) {
  let allMatches = [];
  const seen = new Set();

  for (const alias of aliases) {
    let offset = 0;
    const pageSize = 50;

    while (true) {
      Utilities.sleep(200); // respecter le rate limit

      const data = callLiquipediaDB("match", {
        wiki:       "rainbowsix",
        conditions: `[[opponent::${alias}]] AND [[date::>${dateDebut}]] AND [[date::<${dateFin}]] AND [[finished::1]]`,
        limit:      pageSize,
        offset:     offset,
        order:      "date ASC",
        query:      "match2id,date,match2opponents,winner,extradata,match2games,tournament,bestof",
      });

      if (!data || !data.result || data.result.length === 0) break;

      for (const m of data.result) {
        if (!m.match2id || seen.has(m.match2id)) continue;
        seen.add(m.match2id);
        allMatches.push(m);
      }

      Logger.log(`${teamName} (${alias}) offset=${offset} → ${data.result.length} matchs`);

      // Si on a reçu moins que la limite, c'est la dernière page
      if (data.result.length < pageSize) break;

      offset += pageSize;
    }
  }

  allMatches.sort((a,b) => (a.date||"").localeCompare(b.date||""));
  return allMatches;
}

// ════════════════════════════════════════════════════════════════
//  CONVERTIR UN MATCH LIQUIPEDIADB → FORMAT INTERNE
// ════════════════════════════════════════════════════════════════
function convertMatch(m, aliases) {
  const opps = m.match2opponents || [];
  const myIdx  = opps.findIndex(o => aliases.includes(o.name));
  if (myIdx === -1) {
    Logger.log(`convertMatch: équipe non trouvée dans [${opps.map(o=>o.name).join(', ')}] pour aliases [${aliases.join(', ')}]`);
    return null;
  }
  const oppIdx = myIdx === 0 ? 1 : 0;
  const myOpp  = opps[myIdx]  || {};
  const oppOpp = opps[oppIdx] || {};

  const myScore  = parseInt(myOpp.score)  || 0;
  const oppScore = parseInt(oppOpp.score) || 0;
  const resultat = myScore > oppScore ? "V" : myScore < oppScore ? "D" : "N";

  const dateISO = (m.date || "").substring(0, 10);
  const dp = dateISO.split("-");
  const dateDisplay = dp.length === 3 ? `${dp[2]}/${dp[1]}/${dp[0]}` : dateISO;

  // Veto depuis extradata
  const veto  = m.extradata?.mapveto || {};
  const games = m.match2games || [];
  const maps  = buildMaps(veto, games, myIdx);

  return {
    dateISO,
    date:        dateDisplay,
    adversaire:  oppOpp.name || "?",
    scoreGlobal: `${myScore} - ${oppScore}`,
    resultat,
    competition: m.tournament || "",
    maps,
  };
}

// ════════════════════════════════════════════════════════════════
//  MENU
// ════════════════════════════════════════════════════════════════
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🎮 BLAST Major")
    .addItem("🚀  Tout construire (API Liquipedia)",       "construireTout")
    .addItem("🔄  Reconstruire une équipe…",               "construireUne")
    .addSeparator()
    .addItem("🔑  Configurer clé LiquipediaDB",            "setLiquipediaKey")
    .addItem("📋  Configurer document cible",              "setDocumentCible")
    .addItem("📤  Exporter vers document cible",           "exporterVersCible")
    .addItem("✅  Vérifier la clé",                        "verifierCle")
    .addItem("🔍  Debug API (Team Falcons)",               "debugAPI")
    .addItem("🖼️   Debug Logos opérateurs",                "debugLogos")
    .addSeparator()
    .addItem("🗺️  Recalculer Stats Cartes",                "genererStatsCartes")
    .addItem("📊  Recalculer Stats Globales",              "genererStatsGlobales")
    .addSeparator()
    .addItem("⚙️   Filtres de dates",                      "ouvrirConfig")
    .addToUi();
}

// ════════════════════════════════════════════════════════════════
//  DEBUG API
// ════════════════════════════════════════════════════════════════
function debugAPI() {
  const ui = SpreadsheetApp.getUi();

  // Test 1 : appel brut
  const data = callLiquipediaDB("match", {
    wiki:       "rainbowsix",
    conditions: "[[opponent::Team Falcons]] AND [[date::<2026-05-14]] AND [[finished::1]]",
    limit:      3,
    order:      "date DESC",
    query:      "match2id,date,match2opponents,winner,extradata,match2games,tournament",
  });

  if (!data) {
    ui.alert("❌ Réponse nulle — vérifie ta clé API");
    return;
  }

  // Afficher la structure de la réponse
  const keys = Object.keys(data);
  let msg = "Clés de la réponse : " + keys.join(", ") + "\n\n";

  // Chercher où sont les matchs
  if (data.result && data.result.length > 0) {
    const m = data.result[0];
    msg += "✅ " + data.result.length + " matchs trouvés\n\n";
    msg += "match2id: " + m.match2id + "\n";
    msg += "date: " + m.date + "\n";
    msg += "winner: " + m.winner + "\n";
    msg += "tournament: " + m.tournament + "\n";
    msg += "match2opponents: " + JSON.stringify(m.match2opponents) + "\n";
    msg += "match2games (count): " + (m.match2games ? m.match2games.length : "absent") + "\n";
    if (m.match2games && m.match2games.length > 0) {
      msg += "Game 1: " + JSON.stringify(m.match2games[0]).substring(0, 400) + "\n";
    }
    msg += "mapveto: " + JSON.stringify(m.extradata && m.extradata.mapveto) + "\n";
  } else {
    msg += "❌ Aucun match\n" + JSON.stringify(data).substring(0, 500);
  }

  Logger.log(msg);
  ui.alert("🔍 Debug API\n\n" + msg);
}

// ════════════════════════════════════════════════════════════════
//  CONSTRUIRE TOUT
// ════════════════════════════════════════════════════════════════
function nettoyerTriggers() {
  // Supprimer TOUS les triggers construireToutBatch existants
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'construireToutBatch')
    .forEach(t => ScriptApp.deleteTrigger(t));
}

function supprimerOngletsData() {
  // Supprime tous les onglets sauf ceux contenant 'configuration' ou 'config'
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const GARDER = ['configuration', 'config'];
  ss.getSheets().forEach(sh => {
    const name = sh.getName().toLowerCase();
    if (GARDER.some(k => name.includes(k))) return;
    try { ss.deleteSheet(sh); } catch(e) { Logger.log("Impossible de supprimer : " + sh.getName()); }
  });
}

function construireTout() {
  // Purger les anciens triggers avant de commencer
  nettoyerTriggers();

  // Réinitialiser les phases
  PropertiesService.getScriptProperties().setProperty('BATCH_PHASE', 'fetch');
  PropertiesService.getScriptProperties().setProperty('BATCH_INDEX', '-1'); // -1 = page accueil d'abord
  ScriptApp.newTrigger('construireToutBatch').timeBased().after(2000).create();
  toast("🚀 Construction lancée !", "🎮", 5);
}

function construireToutBatch() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const idx = parseInt(PropertiesService.getScriptProperties().getProperty('BATCH_INDEX') || '0');

  // Index -1 : page d'accueil en session isolée
  if (idx === -1) {
    try {
      construirePageAccueil(ss);
      Logger.log("✅ Page accueil construite");
    } catch(e) {
      Logger.log("Erreur PageAccueil : " + e.message);
    }
    nettoyerTriggers();
    PropertiesService.getScriptProperties().setProperty('BATCH_INDEX', '0');
    ScriptApp.newTrigger('construireToutBatch').timeBased().after(500).create();
    toast("🏠 Page accueil OK → équipes...", "🎮", 5);
    return;
  }

  if (idx >= TEAMS.length) {
    // Tout terminé
    PropertiesService.getScriptProperties().deleteProperty('BATCH_INDEX');
    nettoyerTriggers();
    genererStatsGlobales();
    majDateAccueil(ss);
    toast("✅ Terminé !", "🎮", 8);
    return;
  }

  const cfg = lireConfig();
  const [nom, aliases, region] = TEAMS[idx];
  toast(`🔄 ${nom} (${idx+1}/${TEAMS.length})`, "API + Build", 360);

  const equipe    = cfg.find(e => e.nom === nom) || {dateDebut:"2025-01-01", dateFin:"2030-12-31"};
  const rawMatchs = fetchMatchesForTeam(nom, aliases, equipe.dateDebut, equipe.dateFin);
  const matchs    = rawMatchs.map(m => convertMatch(m, aliases)).filter(m => m !== null);

  try {
    construireOnglet(ss, nom, region, matchs, aliases, rawMatchs);
    Logger.log(`✅ ${nom} : ${matchs.length} matchs`);
  } catch(e) {
    Logger.log("ERREUR " + nom + " : " + e.message);
    toast("⚠️ Erreur " + nom, "Erreur", 5);
  }

  // Équipe suivante
  nettoyerTriggers();
  PropertiesService.getScriptProperties().setProperty('BATCH_INDEX', (idx + 1).toString());
  ScriptApp.newTrigger('construireToutBatch').timeBased().after(500).create();
  toast(`⏳ ${idx+1}/${TEAMS.length} OK...`, "🔄", 5);
}

function annulerConstruction() {
  // Annuler une construction en cours
  PropertiesService.getScriptProperties().deleteProperty('BATCH_INDEX');
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'construireToutBatch') ScriptApp.deleteTrigger(t);
  });
  SpreadsheetApp.getUi().alert('✅ Construction annulée.');
}


function construireUne() {
  const liste = TEAMS.map(([n],i) => `${i+1}. ${n}`).join("\n");
  const rep   = SpreadsheetApp.getUi().prompt("Quelle équipe ?", liste+"\n\nNuméro :", SpreadsheetApp.getUi().ButtonSet.OK_CANCEL);
  if (rep.getSelectedButton() !== SpreadsheetApp.getUi().Button.OK) return;
  const idx = parseInt(rep.getResponseText().trim()) - 1;
  if (isNaN(idx)||idx<0||idx>=TEAMS.length) { SpreadsheetApp.getUi().alert("Numéro invalide."); return; }

  const [nom, aliases, region] = TEAMS[idx];
  const cfg    = lireConfig();
  const equipe = cfg.find(e=>e.nom===nom)||{dateDebut:"2023-03-10",dateFin:"2030-12-31"};
  const ss     = SpreadsheetApp.getActiveSpreadsheet();

  toast(`🔄 ${nom}...`, "API Liquipedia", 60);

  const rawMatchs = fetchMatchesForTeam(nom, aliases, equipe.dateDebut, equipe.dateFin);
  Logger.log(`${nom} : ${rawMatchs.length} matchs bruts récupérés`);

  // Filtrer les matchs invalides (myIdx == -1)
  const matchs = rawMatchs
    .map(m => convertMatch(m, aliases))
    .filter(m => m !== null);

  Logger.log(`${nom} : ${matchs.length} matchs après conversion`);

  construireOnglet(ss, nom, region, matchs, aliases, rawMatchs);
  majDateAccueil(ss);
  toast(`✅ ${nom} : ${matchs.length} matchs !`, "🎮", 5);
  SpreadsheetApp.getUi().alert(`✅ ${nom} : ${rawMatchs.length} matchs reçus, ${matchs.length} affichés.`);
}

function buildMaps(veto, games, myIdx) {
  const result = {};
  let banOrderGlobal = 0;
  let myBanCount     = 0;
  let oppBanCount    = 0;
  let pickOrderGlobal = 0;
  let pickOrderMy     = 0;

  // Détecter BO5 : si le veto contient plus de 2 steps de type pick
  const pickSteps = Object.values(veto).filter(v => v && v.type === "pick");
  const isBO5 = pickSteps.length > 2;

  Object.keys(veto).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(step => {
    const v = veto[step];
    if (!v) return;

    if (v.type==="decider" && v.decider) {
      pickOrderGlobal++;
      result[v.decider] = {type:"decider", playOrder:pickOrderGlobal, isBO5};

    } else if (v.type==="ban") {
      const t1 = v.team1&&v.team1!=="-"?v.team1:null;
      const t2 = v.team2&&v.team2!=="-"?v.team2:null;

      // Dans un BO3 : t1 ET t2 sont dans le même step (ban simultané)
      // Dans un BO1 : soit t1 soit t2 (ban alternatif)
      if (t1) {
        banOrderGlobal++;
        const byOpponent = (myIdx !== 0);
        if (byOpponent) oppBanCount++;
        else            myBanCount++;
        result[t1] = {type:"ban", banOrderGlobal, byOpponent,
                      myCount:  byOpponent ? oppBanCount : myBanCount,
                      isFirst:  banOrderGlobal === 1};
      }
      if (t2) {
        banOrderGlobal++;
        const byOpponent = (myIdx !== 1);
        if (byOpponent) oppBanCount++;
        else            myBanCount++;
        result[t2] = {type:"ban", banOrderGlobal, byOpponent,
                      myCount:  byOpponent ? oppBanCount : myBanCount,
                      isFirst:  banOrderGlobal === 1};
      }

    } else if (v.type==="pick") {
      const t1 = v.team1&&v.team1!=="-"?v.team1:null;
      const t2 = v.team2&&v.team2!=="-"?v.team2:null;
      if (t1) {
        pickOrderGlobal++;
        const isMyPick = (myIdx===0);
        if (isMyPick) pickOrderMy++;
        result[t1] = {type:"played", playOrder:pickOrderGlobal,
                      myPickOrder: isMyPick ? pickOrderMy : null,
                      isBO5};
      }
      if (t2) {
        pickOrderGlobal++;
        const isMyPick = (myIdx===1);
        if (isMyPick) pickOrderMy++;
        result[t2] = {type:"played", playOrder:pickOrderGlobal,
                      myPickOrder: isMyPick ? pickOrderMy : null,
                      isBO5};
      }
    }
  });

  // Enrichir avec les données de jeu
  let gameOrder = 0;
  games.forEach(g => {
    if (!g.map || g.status==="notplayed") return;
    gameOrder++;
    const scores   = g.scores||[];
    const myScore  = scores[myIdx]  !== undefined ? scores[myIdx]  : "-";
    const oppScore = scores[myIdx===0?1:0] !== undefined ? scores[myIdx===0?1:0] : "-";
    const ed       = g.extradata||{};
    const myHalfs  = myIdx===0 ? ed.t1halfs : ed.t2halfs;
    const atkR     = myHalfs?.atk!=null ? parseInt(myHalfs.atk) : null;
    const defR     = myHalfs?.def!=null ? parseInt(myHalfs.def) : null;
    const myBans   = myIdx===0 ? ed.t1bans  : ed.t2bans;
    const myTypes  = myIdx===0 ? ed.t1bantypes : ed.t2bantypes;
    const sortedKeys = Object.keys(myBans||{}).sort((a,b)=>parseInt(a)-parseInt(b));
    const allAtkBans = sortedKeys.filter(k=>(myTypes||{})[k]==="atk"&&(myBans||{})[k]).map(k=>myBans[k]);
    const allDefBans = sortedKeys.filter(k=>(myTypes||{})[k]==="def"&&(myBans||{})[k]).map(k=>myBans[k]);
    const existing = result[g.map]||{};
    result[g.map] = {
      ...existing, type: existing.type||"played",
      playOrder:   existing.playOrder   || gameOrder,
      myPickOrder: existing.myPickOrder || null,
      scoreTeam: myScore,  scoreOpp: oppScore,
      atkRounds: atkR,     defRounds: defR,
      allAtkBans, allDefBans,
    };
  });
  return result;
}

function banLabel(md) {
  // md contient : banOrderGlobal, byOpponent, myCount, isFirst
  const n = md.myCount;          // numéro du ban pour cette équipe (1,2,3,4)
  const isFirst = md.isFirst;    // est-ce le tout premier ban du match ?

  if (!md.byOpponent) {
    // Notre équipe
    if (isFirst) return "[1] Ban"; // on banne en tout premier
    if (n === 1)  return "Ban 1";  // notre 1er ban mais pas le premier global
    if (n === 2)  return "Ban 2";
    if (n === 3)  return "Ban 3";
    return `Ban ${n}`;
  } else {
    // Adversaire
    if (isFirst) return "[1] Ban O"; // adverse banne en tout premier
    if (n === 1)  return "Ban 1 O";  // adverse 1er ban mais pas le premier global
    if (n === 2)  return "Ban 2 O";
    if (n === 3)  return "Ban 3 O";
    return `Ban ${n} O`;
  }
}


function cellValue(md) {
  if (!md) return "";

  // ── BAN ──────────────────────────────────────────────
  if (md.type==="ban") {
    return banLabel(md);
  }

  // ── DECIDER ──────────────────────────────────────────
  if (md.type==="decider") {
    if (md.scoreTeam!==undefined && md.scoreTeam!=="" && md.scoreTeam!=="-") {
      // [N] seulement si ce n'est pas la seule carte du match (BO1 = playOrder 1)
      const prefix = (md.playOrder && md.playOrder > 1) ? "[" + md.playOrder + "] " : "";
      let s = prefix + md.scoreTeam + "-" + md.scoreOpp;
      if (md.atkRounds!=null && md.defRounds!=null)
        s += " (" + md.atkRounds + "-" + md.defRounds + ")";
      return s;
    }
    return "DECIDER";
  }

  // ── MAP JOUÉE ─────────────────────────────────────────
  if (md.type==="played") {
    // Notre pick   → [N]
    // Pick adverse en BO5 → [N O]
    // Pick adverse en BO3 → pas de crochet
    let prefix = "";
    if (md.myPickOrder != null) {
      prefix = "[" + md.playOrder + "] ";
    } else if (md.isBO5) {
      prefix = "[" + md.playOrder + " O] ";
    }
    let s = prefix + md.scoreTeam + "-" + md.scoreOpp;
    if (md.atkRounds!=null && md.defRounds!=null)
      s += " (" + md.atkRounds + "-" + md.defRounds + ")";
    return s;
  }
  return "";
}


// ════════════════════════════════════════════════════════════════
//  ONGLET ÉQUIPE
// ════════════════════════════════════════════════════════════════


// ── Stats cartes ─────────────────────────────────────────────────────────────
// Écrit une ligne bleue : nom de ligue + stats de cette ligue, couleur uniforme #1565c0
function ecrireLigneBleuStats(sh, row, leagueLabel, matchsLigue, C_MAP1, MAP_W, C_COMP) {
  const stats = calculerStatsCartes(matchsLigue);
  const BG    = "#1565c0";

  // Fond uniforme sur toute la ligne
  sh.getRange(row, 1, 1, C_COMP + 4).setBackground(BG);
  sh.setRowHeight(row, 24);

  // Cols 1-3 : label ligue
  sh.getRange(row, 1, 1, 3).merge()
    .setValue(leagueLabel)
    .setBackground(BG).setFontColor("#ffffff")
    .setFontWeight("bold").setFontSize(11)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Stats par carte : fusion col à col+MAP_W-1 (séparateur inclus, comme bans non joués)
  MAPS_DISPLAY.forEach((carte, ci) => {
    const col = C_MAP1 + ci * MAP_W;
    const s   = stats[carte];
    // Fusion sur toute la largeur de la carte (col+0 séparateur + col+1 à col+MAP_W-1)
    const cell = sh.getRange(row, col, 1, MAP_W).merge()
      .setBackground(BG).setHorizontalAlignment("center").setVerticalAlignment("middle");
    if (!s || s.played === 0) {
      cell.setValue("—").setFontColor("#aaccff").setFontSize(9);
    } else {
      const pct = Math.round(s.wins / s.played * 100);
      cell.setValue(s.wins + "/" + s.played + " " + pct + "%")
          .setFontColor("#ffffff").setFontSize(9).setFontWeight("bold");
    }
  });
  sh.getRange(row, C_COMP).setBackground(BG);
}


function calculerStatsCartes(matchs) {
  // Retourne un objet { nomCarte: { wins, played } } pour chaque carte jouée
  const stats = {};
  MAPS_DISPLAY.forEach(c => stats[c] = { wins: 0, played: 0 });
  matchs.forEach(m => {
    MAPS_DISPLAY.forEach(c => {
      const md = m.maps[c];
      if (!md) return;
      const played = md.scoreTeam !== undefined && md.scoreTeam !== "" &&
                     md.scoreTeam !== "-" && (md.type === "played" || md.type === "decider");
      if (!played) return;
      stats[c].played++;
      const myScore  = parseInt(md.scoreTeam) || 0;
      const oppScore = parseInt(md.scoreOpp)  || 0;
      if (myScore > oppScore) stats[c].wins++;
    });
  });
  return stats;
}


function construireOnglet(ss, nom, region, matchs, aliases, rawMatchs) {
  let sh=ss.getSheetByName("🎮 "+nom);
  if(sh)ss.deleteSheet(sh);
  sh=ss.insertSheet("🎮 "+nom);
  // Feuille nouvellement créée = vide, pas besoin de breakApart
  const C_DATE=1, C_ADV=2, C_SCORE=3, C_MAP1=4;
  const MAP_W = 7;  // 7 colonnes : col0=séparateur, cols1-6=data (ATK 1-3, DEF 4-6)
  const C_COMP = C_MAP1 + MAPS_DISPLAY.length * MAP_W;  // après toutes les cartes

  // Logo équipe en A1, nom en B1+C1 fusionnés
  sh.getRange(1,1,1,C_COMP+1).setBackground("#0f0f23").setVerticalAlignment("middle");
  // Logos chargés une seule fois pour toute la construction de l'onglet
  const ALL_LOGOS = chargerLogosOperateurs();
  const logoEquipe = ALL_LOGOS[nom.toLowerCase()];
  if (logoEquipe) {
    sh.getRange(1,1).setFormula('=IMAGE("' + logoEquipe + '";1)')
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
  } else {
    sh.getRange(1,1).setValue("🎮").setHorizontalAlignment("center");
  }
  sh.getRange(1,2).setValue(nom)
    .setFontSize(13).setFontWeight("bold").setFontColor("#fff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBackground("#0f0f23");
  sh.getRange(1,3).setValue(region)
    .setFontSize(11).setFontWeight("bold").setFontColor("#aaccff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBackground("#0f0f23");
  sh.setRowHeight(1, 45);

  // En-têtes : fusionner 6 colonnes par carte
  ["Date","Team","Score"].forEach((h,i) => {
    sh.getRange(2, i+1).setValue(h)
      .setBackground("#1c2a4a").setFontColor("#aaccff")
      .setFontWeight("bold").setFontSize(10)
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
  });
  // Charger les images de cartes depuis Drive
  const mapLogos = ALL_LOGOS;

  MAPS_DISPLAY.forEach((carte, ci) => {
    const col     = C_MAP1 + ci * MAP_W;
    const mapUrl  = mapLogos[carte.toLowerCase()];

    // Séparateur (col+0) : fond sombre
    sh.getRange(1, col).setBackground("#0f0f23");
    sh.getRange(2, col).setBackground("#1c2a4a");

    // Ligne 1 : image de la carte dans les 6 colonnes data fusionnées
    sh.getRange(1, col + 1, 1, MAP_W - 1).merge()
      .setBackground("#0f0f23")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
    if (mapUrl) {
      sh.getRange(1, col + 1).setFormula('=IMAGE("' + mapUrl + '";3)')
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
    }

    // Ligne 2 : nom carte horizontal dans les 6 colonnes data
    sh.getRange(2, col + 1, 1, MAP_W - 1).merge()
      .setValue(MAPS_FR[carte] || carte)
      .setBackground("#1c2a4a").setFontColor("#aaccff")
      .setFontWeight("bold").setFontSize(10)
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
  });

  sh.setRowHeight(1, 50);
  sh.getRange(2, C_COMP, 1, 1).setValue("LEAGUE")
    .setBackground("#1c2a4a").setFontColor("#aaccff")
    .setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  // BP2 (C_COMP+1) : même fond noir que BP1
  sh.getRange(2, C_COMP + 1).setBackground("#0f0f23");
  sh.setFrozenRows(2); sh.setFrozenColumns(3);

  const rowBansList   = []; // positions des lignes bans
  const rowScoreList  = []; // positions des lignes score
  const rowFinLigues  = []; // {endRow, competition} pour chaque fin de ligue
  const rowHeights    = []; // hauteurs de lignes à appliquer en batch

  if(!matchs.length){
    sh.getRange(3,1).setValue("Aucun match dans le JSON pour cette équipe.")
      .setFontStyle("italic").setFontColor("#999");
  } else {
    let row = 3;
    const logos = ALL_LOGOS;
    const totalCols = C_COMP + 1;

    // Ligne bleue première ligue (avec stats de cette ligue)
    if (matchs.length > 0) {
      const firstLeague   = matchs[0].competition || "";
      const matchsFirst   = matchs.filter(mm => mm.competition === firstLeague);
      ecrireLigneBleuStats(sh, row, firstLeague.toUpperCase(), matchsFirst, C_MAP1, MAP_W, C_COMP);
      row++;
    }

    matchs.forEach(m => {
      const bg       = m.resultat==="V" ? "#e6f4ea" : m.resultat==="D" ? "#fce8e6" : "#fff8e1";
      const rowScore = row;
      const rowBans  = row + 1;
      const rowSep   = row + 2;
      rowScoreList.push(rowScore);

      const S = r => r.setBackground(bg).setFontSize(12).setFontColor("#000000")
        .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");

      // ── Pré-nettoyer les 3 lignes (score+bans+sep) ──────────
      const totalColsBA = C_COMP + 4;
      safeBreakApart(sh.getRange(rowScore, 1, 3, totalColsBA));

      // ── Colonnes fixes : fusion verticale sur 2 lignes (score+bans) ──
      // On fusionne EN PREMIER avant d'écrire quoi que ce soit
      [C_DATE, C_ADV, C_SCORE, C_COMP].forEach(col => {
        sh.getRange(rowScore, col, 2, 1).merge();
      });

      // ── Écrire les valeurs dans les cellules fusionnées ──────
      S(sh.getRange(rowScore, C_DATE)).setValue(m.date);
      S(sh.getRange(rowScore, C_ADV )).setValue(m.adversaire);
      S(sh.getRange(rowScore, C_SCORE)).setValue(m.scoreGlobal);
      S(sh.getRange(rowScore, C_COMP )).setValue(m.competition).setWrap(true);
      // Colonnes après LEAGUE : fond blanc (pas de couleur du match)
      sh.getRange(rowScore, C_COMP + 1, 2, 4).setBackground("#ffffff");

      // ── Ligne score : cartes ─────────────────────────────────
      const mapBg = {};
      MAPS_DISPLAY.forEach((c, ci) => {
        const col    = C_MAP1 + ci * MAP_W;
        const md     = m.maps[c];
        const v      = cellValue(md);
        // Une carte est "jouée" si elle a un score (played ou decider joué)
        const played = md !== undefined && md.scoreTeam !== undefined &&
                       md.scoreTeam !== "" && md.scoreTeam !== "-" &&
                       (md.type === "played" || md.type === "decider");

        let cellBg = bg;
        if (/^\[1\] Ban$|^Ban \d+$/.test(v))          cellBg = "#e040fb";
        else if (/^\[1\] Ban O$|^Ban \d+ O$/.test(v)) cellBg = "#00e5ff";
        else if (v === "DECIDER")                       cellBg = "#ffffff";
        else if (played)
          cellBg = md.scoreTeam > md.scoreOpp ? "#c8e6c9" : "#ffcdd2";
        mapBg[c] = {bg: cellBg, played};

        // Séparateur inclus dans la fusion → pas besoin de setBorder séparé
        const sepBg = cellBg;

        if (played) {
          // Séparateur (col+0) : même couleur, aucune bordure visible
          sh.getRange(rowScore, col)
            .setBackground(cellBg)
            .setBorder(false,false,false,false,null,null,null,null);
          // Carte jouée → fusion sur 6 colonnes data (col+1 à col+6)
          // Pas de bordure gauche sur la fusion (déjà sur le séparateur)
          const cell = sh.getRange(rowScore, col + 1, 1, MAP_W - 1).merge();
          S(cell).setValue(v).setWrap(true).setBackground(cellBg)
            .setBorder(true,false,true,true,null,null,"#000000",SpreadsheetApp.BorderStyle.SOLID);
        } else {
          // Carte non jouée → fusion 2 lignes × MAP_W colonnes, avec couleur ban
          // La bordure BAS est sur le bord bas de la fusion (= bas de rowBans)
          const cell = sh.getRange(rowScore, col, 2, MAP_W).merge();
          S(cell).setValue(v).setWrap(true).setBackground(cellBg)
            .setBorder(true,true,true,true,null,null,"#000000",SpreadsheetApp.BorderStyle.SOLID);
        }
      });

      // ── Ligne bans : fond uniforme d'abord, puis logos ─────
      // Un seul appel pour toute la ligne, puis corrections par carte
      sh.getRange(rowBans, 1, 1, C_COMP + 2).setBackground(bg);

      MAPS_DISPLAY.forEach((c, ci) => {
        const col = C_MAP1 + ci * MAP_W;
        const md  = m.maps[c];
        // Séparateur (col+0) ligne bans : couleur uniquement (grille globale gère les bordures)
        sh.getRange(rowBans, col)
          .setBackground(mapBg[c]?.bg || bg);

        if (!mapBg[c]?.played) {
          // Carte non jouée → fusionnée sur 2 lignes, pas de bans à écrire
          // Mais s'assurer que la ligne bans n'a pas de contenu résiduel
          return;
        }
        const atkBans = md?.allAtkBans || [];
        const defBans = md?.allDefBans || [];
        const banBg   = mapBg[c].bg;

        // Le pré-nettoyage (3 lignes) a défusionné toutes les cellules
        // Les fusions score ont été recréées → rowBans est libre pour les cartes jouées
        // Pour les cartes non jouées (fusion 2 lignes), on skip l'écriture des bans

        // Bordure gérée par la grille globale ci-dessus

        // ATK : colonnes 1, 2, 3 (col 0 = séparateur)
        atkBans.slice(0, 3).forEach((op, bi) => {
          if (!op) return;
          const opKey = op.toLowerCase().trim();
          const url   = logos[opKey];
          const r     = sh.getRange(rowBans, col + bi + 1);
          r.setBackground(banBg).setHorizontalAlignment("center").setVerticalAlignment("middle");
          if (url) {
            r.setFormula('=IMAGE("' + url + '";4;46;46)');
          } else {
            r.setValue(opKey).setFontSize(7).setFontColor("#ffffff");
            Logger.log("Logo manquant ATK " + bi + ": '" + opKey + "'");
          }
        });
        for (let bi = atkBans.length; bi < 3; bi++)
          sh.getRange(rowBans, col + bi + 1).setValue("").setBackground(banBg);

        // DEF : colonnes 4, 5, 6
        defBans.slice(0, 3).forEach((op, bi) => {
          if (!op) return;
          const opKey = op.toLowerCase().trim();
          const url   = logos[opKey];
          const r     = sh.getRange(rowBans, col + bi + 4);
          r.setBackground(banBg).setHorizontalAlignment("center").setVerticalAlignment("middle");
          if (url) {
            r.setFormula('=IMAGE("' + url + '";4;46;46)');
          } else {
            r.setValue(opKey).setFontSize(7).setFontColor("#ffffff");
            Logger.log("Logo manquant DEF " + bi + ": '" + opKey + "'");
          }
        });
        for (let bi = defBans.length; bi < 3; bi++)
          sh.getRange(rowBans, col + bi + 4).setValue("").setBackground(banBg);
      });

      rowHeights.push([rowScore, 30], [rowBans, 50]);
      rowBansList.push(rowBans); // mémoriser pour les bordures

      // Les bordures sont gérées par appliquerBorduresVerticales en fin de fonction

      // ── Grille logos : bordure sur chaque case ──────────────
      sh.getRange(rowBans, C_MAP1, 1, MAPS_DISPLAY.length * MAP_W)
        .setBorder(true, true, true, true, true, true,
                   "#000000", SpreadsheetApp.BorderStyle.SOLID);

      // ── Ajustements bordures par carte ───────────────────────
      MAPS_DISPLAY.forEach((c2, ci2) => {
        const col2 = C_MAP1 + ci2 * MAP_W;
        const played2 = mapBg[c2]?.played;
        if (played2) {
          // Carte JOUÉE ligne bans :
          // Séparateur (col+0) : supprimer gauche ET droite (invisible entre les cartes)
          sh.getRange(rowBans, col2)
            .setBorder(null, false, null, false, null, null, null, null);
          // ATK1 (col+1) : supprimer bordure gauche
          sh.getRange(rowBans, col2 + 1)
            .setBorder(null, false, null, null, null, null, null, null);
        } else {
          // Carte NON JOUÉE (ban) :
          // Remettre la bordure droite sur la dernière colonne (col+6)
          // car la grille peut l'avoir écrasée
          sh.getRange(rowBans, col2 + MAP_W - 1)
            .setBorder(null, null, null, true, null, null,
                       "#000000", SpreadsheetApp.BorderStyle.SOLID);
          // Supprimer bordure gauche du séparateur (col+0)
          // car la bordure droite de la carte précédente suffit
          sh.getRange(rowBans, col2)
            .setBorder(null, false, null, null, null, null, null, null);
        }
      });
      // Note: bordure du bas tracée par appliquerBorduresVerticales en dernier

      // ── Séparateur blanc ─────────────────────────────────────
      sh.getRange(rowSep, 1, 1, totalCols).setBackground("#ffffff")
        .setBorder(false, false, false, false, false, false, null, null);
      row += 3;

      // ── Lignes vides supplémentaires si ligue avec peu de matchs ──
      // Objectif : avoir assez de lignes pour afficher tous les joueurs (5+)
      // en colonne "équipe du match". On ajoute des lignes si on est
      // à la dernière ligne de la ligue et que le bloc est trop petit.
      const mi_cur = matchs.indexOf(m);
      const nextM  = matchs[mi_cur + 1];
      const ligueChange = !nextM || nextM.competition !== m.competition;
      if (ligueChange) {
        // Compter les lignes de cette ligue
        const ligiStart = rowScoreList[rowScoreList.indexOf(rowScore) - (
          // trouver le premier match de cette ligue
          matchs.slice(0, mi_cur + 1).filter(mm => mm.competition === m.competition).length - 1
        )] || rowScore;
        const lignesDispo = rowSep - ligiStart + 1;
        const MIN_LIGNES = 8; // 1 ligue bleue + 5 joueurs + 1 marge + 1 sep
        if (lignesDispo < MIN_LIGNES) {
          const extra = MIN_LIGNES - lignesDispo;
          for (let e = 0; e < extra; e++) {
            sh.getRange(row + e, 1, 1, totalCols).setBackground("#ffffff");
          }
          row += extra;
        }
      }

      // ── Stocker la fin de ligue (après extras) ───────────────
      if (ligueChange) {
        rowFinLigues.push({ endRow: row - 1, competition: m.competition });
      }

      // ── Ligne bleue changement de ligue = en-tête de la NOUVELLE ligue avec ses stats ─
      const mi = matchs.indexOf(m);
      if (mi >= 0 && mi < matchs.length - 1 &&
          matchs[mi + 1].competition !== m.competition) {
        const nextLeague  = matchs[mi + 1].competition || "";
        const matchsNext  = matchs.filter(mm => mm.competition === nextLeague);
        ecrireLigneBleuStats(sh, row, nextLeague.toUpperCase(), matchsNext, C_MAP1, MAP_W, C_COMP);
        row++;
      }
    });

    // ── Ligne stats globales avec fusions ──
    {
      const statsGlob = calculerStatsCartes(matchs);
      sh.getRange(row, 1, 1, C_COMP + 4).setBackground("#1565c0");
      sh.setRowHeight(row, 24);
      sh.getRange(row, 1, 1, 3).merge()
        .setValue("📊 STATS GLOBALES")
        .setBackground("#1565c0").setFontColor("#ffffff")
        .setFontWeight("bold").setFontSize(11)
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
      MAPS_DISPLAY.forEach((carte, ci) => {
        const col = C_MAP1 + ci * MAP_W;
        const s   = statsGlob[carte];
        // Fusion sur toute la largeur (séparateur inclus)
        const cell = sh.getRange(row, col, 1, MAP_W).merge()
          .setHorizontalAlignment("center").setVerticalAlignment("middle");
        if (!s || s.played === 0) {
          cell.setValue("—").setFontColor("#aaccff").setFontSize(9).setBackground("#1565c0");
        } else {
          const pct = Math.round(s.wins / s.played * 100);
          const txt = s.wins + "/" + s.played + " " + pct + "%";
          const bg  = pct > 50 ? "#c8e6c9" : pct < 50 ? "#ffcdd2" : "#1565c0";
          const fg  = pct > 50 ? "#1b5e20" : pct < 50 ? "#b71c1c" : "#ffffff";
          cell.setValue(txt).setFontColor(fg).setFontSize(9).setFontWeight("bold").setBackground(bg);
        }
      });
      sh.getRange(row, C_COMP).setBackground("#1565c0");
      row++;
    }
  }
  // Batch toutes les hauteurs de lignes (évite N appels API séparés)
  rowHeights.forEach(([r, h]) => { try { sh.setRowHeight(r, h); } catch(e) {} });

  sh.setColumnWidth(C_DATE,  100);
  sh.setColumnWidth(C_ADV,   160);
  sh.setColumnWidth(C_SCORE,  70);
  // 6 colonnes par carte de 32px chacune = 192px par carte
  // MAP_W=7 : col0=séparateur(18px), cols1-6=data(50px)
  MAPS_DISPLAY.forEach((_, i) => {
    sh.setColumnWidth(C_MAP1 + i * MAP_W,     18); // séparateur
    for (let j = 1; j < MAP_W; j++) {
      sh.setColumnWidth(C_MAP1 + i * MAP_W + j, 50);
    }
  });
  sh.setColumnWidth(C_COMP, 220);
  sh.autoResizeColumn(C_COMP);
  // Hauteur ligne principale
  if (matchs.length) sh.setRowHeight(2, 25);

  // ── Roster à droite ──────────────────────────────────────
  // Changements de roster à droite du tableau (colonnes BH, BI, BJ)
  afficherChangementsRoster(sh, matchs, aliases, rawMatchs, C_COMP + 2, rowScoreList);

  // Pas de fusion D3:BR3 : la ligne 3 contient les stats par carte (cellules individuelles par carte)

  // Roster en dessous du tableau (colonnes A et B)
  // +3 pour s'assurer d'être hors de toute fusion existante
  const lastDataRow = sh.getLastRow();
  const rosterStartRow = lastDataRow + 3;
  construireRosterOnglet(ss, sh, nom, aliases, rawMatchs, rosterStartRow, ALL_LOGOS);

  // Bordures verticales structurelles — appelé EN DERNIER
  appliquerBorduresVerticales(sh, matchs, rowBansList, rowScoreList);

  // Groupement des lignes par ligue (système +/-) — skip si trop de matchs (perf)
  try { grouperLignesParLigue(sh, matchs, rowScoreList, rowFinLigues); }
  catch(e) { Logger.log("grouperLignesParLigue échoué : " + e.message); }

  // Groupement des colonnes par carte (système +/-)
  try { grouperColonnesParCarte(sh); }
  catch(e) { Logger.log("grouperColonnesParCarte échoué : " + e.message); }

  // Supprimer toutes les colonnes après C_COMP+3 (Actuel) → BS et au-delà
  try {
    const lastCol = sh.getMaxColumns();
    const startDel = C_COMP + 4; // col après "Actuel"
    if (lastCol >= startDel) {
      sh.deleteColumns(startDel, lastCol - startDel + 1);
    }
  } catch(e) { Logger.log("deleteColumns : " + e.message); }
}

// ════════════════════════════════════════════════════════════════
//  PAGE D'ACCUEIL + CRÉDIT LIQUIPEDIA
// ════════════════════════════════════════════════════════════════
function construirePageAccueil(ss) {
  // Supprimer et recréer la feuille pour éviter tout conflit de fusion résiduelle
  let sh = ss.getSheetByName("🏠 Home");
  const pos = sh ? sh.getIndex() : 1;
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet("🏠 Home", pos - 1);
  sh.setTabColor("#0f0f23");
  sh.getRange("A1:Z60").setBackground("#0f0f23");

  // ── Titre ───────────────────────────────────────────────
  safeBreakApart(sh.getRange("B2:H2")).merge()
    .setValue("EML Stage 1 2026")
    .setFontSize(22).setFontWeight("bold").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#0f0f23");
  safeBreakApart(sh.getRange("B3:H3")).merge()
    .setValue("Match Tracker — 10 Teams")
    .setFontSize(13).setFontColor("#aaccff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#0f0f23");
  sh.setRowHeight(2, 55);

  // ── Description ─────────────────────────────────────────
  safeBreakApart(sh.getRange("B5:H5")).merge().setBackground("#1c2a4a");
  safeBreakApart(sh.getRange("B6:H6")).merge()
    .setValue("Real-time match tracker for all 10 EML Stage 1 2026 teams. Displays map veto sequences, per-map scores (ATK/DEF halves), operator bans and player rosters — powered by the LiquipediaDB API.")
    .setFontSize(11).setFontColor("#cccccc").setBackground("#0f0f23")
    .setWrap(true).setHorizontalAlignment("left").setVerticalAlignment("middle");
  sh.setRowHeight(6, 60);

  // ── Auteur ──────────────────────────────────────────────
  safeBreakApart(sh.getRange("B8:H8")).merge().setBackground("#1c2a4a");
  safeBreakApart(sh.getRange("B9:H9")).merge()
    .setValue("✏️  Author")
    .setFontSize(13).setFontWeight("bold").setFontColor("#ffffff")
    .setBackground("#1a0a2e").setVerticalAlignment("middle");

  safeBreakApart(sh.getRange("B10:H10")).merge()
    .setValue("Fio'  —  Fiorenzo Elba  |  Rainbow Six Siege caster (French stream)")
    .setFontSize(11).setFontColor("#dddddd").setBackground("#0f0f23").setVerticalAlignment("middle");

  safeBreakApart(sh.getRange("B11:H11")).merge()
    .setValue("Built with the assistance of Claude (Anthropic AI)")
    .setFontSize(11).setFontColor("#dddddd").setBackground("#0f0f23").setVerticalAlignment("middle");

  // Lien X cliquable
  const urlX  = "https://x.com/fofiopathe";
  const textX = "𝕏  @fofiopathe";
  const rtvX  = SpreadsheetApp.newRichTextValue()
    .setText(textX).setLinkUrl(0, textX.length, urlX).build();
  safeBreakApart(sh.getRange("B12:H12")).merge().setRichTextValue(rtvX);
  sh.getRange("B12:H12")
    .setFontSize(12).setFontWeight("bold").setFontColor("#4fc3f7")
    .setBackground("#0f0f23").setVerticalAlignment("middle");

  // ── Remerciements Liquipedia ─────────────────────────────
  safeBreakApart(sh.getRange("B14:H14")).merge().setBackground("#1c2a4a");
  safeBreakApart(sh.getRange("B15:H15")).merge()
    .setValue("🙏  Special Thanks")
    .setFontSize(13).setFontWeight("bold").setFontColor("#ffffff")
    .setBackground("#1a0a2e").setVerticalAlignment("middle");

  safeBreakApart(sh.getRange("B16:H18")).merge()
    .setValue("A huge and warm thank you to the entire Liquipedia team for their incredible work in building and maintaining such a comprehensive esports database, and for making this data freely accessible through their API. This tool would simply not exist without them.")
    .setFontSize(11).setFontColor("#dddddd").setBackground("#0f0f23")
    .setWrap(true).setHorizontalAlignment("left").setVerticalAlignment("middle");

  // Remerciements FuZeAL
  safeBreakApart(sh.getRange("B19:H19")).merge().setBackground("#1c2a4a");
  safeBreakApart(sh.getRange("B20:H20")).merge()
    .setValue("🙌  Special Thanks — Community")
    .setFontSize(13).setFontWeight("bold").setFontColor("#ffffff")
    .setBackground("#1a0a2e").setVerticalAlignment("middle");
  safeBreakApart(sh.getRange("B21:H23")).merge()
    .setValue("A huge thank you to @notFuZeAL for the incredible improvement ideas and his absolutely unwavering, legendary admiration for Enterprise Esports. This tool is better because of you — and Enterprise would be proud... probably.")
    .setFontSize(11).setFontColor("#dddddd").setBackground("#0f0f23")
    .setWrap(true).setHorizontalAlignment("left").setVerticalAlignment("middle");

  const rtvFuze = SpreadsheetApp.newRichTextValue()
    .setText("𝕏  @notFuZeAL")
    .setLinkUrl(0, 13, "https://x.com/notFuZeAL")
    .build();
  safeBreakApart(sh.getRange("B24:H24")).merge().setRichTextValue(rtvFuze);
  sh.getRange("B24:H24")
    .setFontSize(12).setFontWeight("bold").setFontColor("#4fc3f7")
    .setBackground("#0f0f23").setVerticalAlignment("middle");
  sh.setRowHeight(16, 30); sh.setRowHeight(17, 30); sh.setRowHeight(18, 30);

  // Lien Liquipedia cliquable
  const url1  = "https://liquipedia.net/rainbowsix";
  const text1 = "Liquipedia Rainbow Six";
  const rtv1  = SpreadsheetApp.newRichTextValue()
    .setText(text1).setLinkUrl(0, text1.length, url1).build();
  safeBreakApart(sh.getRange("B19:H19")).merge().setRichTextValue(rtv1);
  sh.getRange("B19:H19")
    .setFontSize(12).setFontWeight("bold").setFontColor("#4fc3f7")
    .setBackground("#0f0f23").setVerticalAlignment("middle");

  // Lien Copyrights cliquable
  const url2  = "https://liquipedia.net/commons/Liquipedia:Copyrights";
  const text2 = "Liquipedia:Copyrights — CC-BY-SA License";
  const rtv2  = SpreadsheetApp.newRichTextValue()
    .setText(text2).setLinkUrl(0, text2.length, url2).build();
  safeBreakApart(sh.getRange("B20:H20")).merge().setRichTextValue(rtv2);
  sh.getRange("B20:H20")
    .setFontSize(12).setFontColor("#4fc3f7")
    .setBackground("#0f0f23").setVerticalAlignment("middle");

  safeBreakApart(sh.getRange("B21:H21")).merge()
    .setValue("Data licensed under CC-BY-SA. Please credit Liquipedia when sharing.")
    .setFontSize(10).setFontColor("#888888").setBackground("#0f0f23").setVerticalAlignment("middle");

  // ── Dernière mise à jour ─────────────────────────────────
  safeBreakApart(sh.getRange("B23:H23")).merge().setBackground("#1c2a4a");
  majDateAccueil(ss);
}

function majDateAccueil(ss) {
  let sh = ss.getSheetByName("🏠 Home");
  if (!sh) return;
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  safeBreakApart(sh.getRange("B24:H24")).merge()
    .setValue("🕐  Last updated: " + now)
    .setFontSize(10).setFontColor("#888888").setBackground("#0f0f23").setVerticalAlignment("middle");

  // Largeurs & hauteurs
  sh.setColumnWidth(1, 20);
  for (let i = 2; i <= 8; i++) sh.setColumnWidth(i, 130);
  sh.setRowHeight(2, 55); sh.setRowHeight(3, 35);
}


// ════════════════════════════════════════════════════════════════
//  ROSTER — FETCH VIA LIQUIPEDIADB
// ════════════════════════════════════════════════════════════════
// Normalisation des handles (aliases de joueurs)
const PLAYER_ALIASES = {
  "terdsta": "Terd",
  "terd":    "Terd",
};
function normalizeHandle(h) {
  if (!h) return h;
  return PLAYER_ALIASES[h.toLowerCase()] || h;
}

function fetchRosterHistory(aliases, rawMatches) {
  const history = [];
  const sorted = [...rawMatches].sort((a,b) => (a.date||"").localeCompare(b.date||""));
  sorted.forEach((m, idx) => {
    const opps  = m.match2opponents || [];
    const myOpp = opps.find(o => aliases.includes(o.name));
    if (!myOpp) return;
    const players = (myOpp.match2players || []).map(p => ({
      handle: normalizeHandle(p.displayname || p.name || ""),
      flag:   p.flag || "",
    }));
    if (players.length > 0) history.push({matchIdx: idx, players});
  });
  return history;
}

function fetchRoster(teamName, aliases, rawMatches) {
  // Extract roster from the most recent matches already fetched
  // match2opponents contains match2players with flag and displayname
  const FLAGS = {
    "France":"🇫🇷","Belgium":"🇧🇪","Germany":"🇩🇪","Spain":"🇪🇸","Sweden":"🇸🇪",
    "United Kingdom":"🇬🇧","Netherlands":"🇳🇱","Norway":"🇳🇴","Denmark":"🇩🇰",
    "Finland":"🇫🇮","Poland":"🇵🇱","Russia":"🇷🇺","Ukraine":"🇺🇦","Czech Republic":"🇨🇿",
    "Turkey":"🇹🇷","Saudi Arabia":"🇸🇦","United Arab Emirates":"🇦🇪",
    "United States":"🇺🇸","Canada":"🇨🇦","Mexico":"🇲🇽","Brazil":"🇧🇷",
    "Argentina":"🇦🇷","Chile":"🇨🇱","Colombia":"🇨🇴","South Korea":"🇰🇷",
    "Japan":"🇯🇵","China":"🇨🇳","Australia":"🇦🇺","New Zealand":"🇳🇿",
    "Singapore":"🇸🇬","Morocco":"🇲🇦","Taiwan":"🇹🇼","Switzerland":"🇨🇭",
    "Portugal":"🇵🇹","Italy":"🇮🇹","Romania":"🇷🇴","Bulgaria":"🇧🇬",
    "Serbia":"🇷🇸","Kazakhstan":"🇰🇿","Georgia":"🇬🇪",
  };

  // Use the most recent match to get the current roster
  // Sort matches by date DESC to get the latest
  const sorted = [...rawMatches].sort((a,b) => (b.date||"").localeCompare(a.date||""));

  const playerMap = {}; // handle → {handle, flag, nationality}

  for (const m of sorted) {
    const opps = m.match2opponents || [];
    // Find our team's opponent entry
    const myOpp = opps.find(o => aliases.includes(o.name));
    if (!myOpp) continue;

    const players = myOpp.match2players || [];
    for (const p of players) {
      const handle = p.displayname || p.name || "";
      if (!handle) continue;
      if (!playerMap[handle]) {
        const nat = p.flag || "";
        playerMap[handle] = {
          handle,
          nationality: nat,
          flag: FLAGS[nat] || "🏳️",
        };
      }
    }
    // Stop after finding players in the most recent match
    if (Object.keys(playerMap).length > 0) break;
  }

  return {
    players: Object.values(playerMap),
    staff:   [],
  };
}

function construireRosterOnglet(ss, sh, teamName, aliases, rawMatchs, startRow) {
  const {players, staff} = fetchRoster(teamName, aliases, rawMatchs);
  if (!players.length && !staff.length) return;

  const NAT_FR = {
    "France":"France","Belgium":"Belgique","Germany":"Allemagne","Spain":"Espagne",
    "Sweden":"Suède","United Kingdom":"Royaume-Uni","Netherlands":"Pays-Bas",
    "Norway":"Norvège","Denmark":"Danemark","Finland":"Finlande","Poland":"Pologne",
    "Russia":"Russie","Ukraine":"Ukraine","Czech Republic":"Tchéquie","Turkey":"Turquie",
    "Saudi Arabia":"Arabie Saoudite","United Arab Emirates":"Émirats Arabes Unis",
    "United States":"États-Unis","Canada":"Canada","Mexico":"Mexique","Brazil":"Brésil",
    "Argentina":"Argentine","Chile":"Chili","Colombia":"Colombie","South Korea":"Corée du Sud",
    "Japan":"Japon","China":"Chine","Australia":"Australie","New Zealand":"Nouvelle-Zélande",
    "Singapore":"Singapour","Morocco":"Maroc","Taiwan":"Taïwan","Switzerland":"Suisse",
    "Portugal":"Portugal","Italy":"Italie","Romania":"Roumanie","Bulgaria":"Bulgarie",
    "Serbia":"Serbie","Kazakhstan":"Kazakhstan","Georgia":"Géorgie",
    "Algeria":"Algérie","Tunisia":"Tunisie","Israel":"Israël","Lebanon":"Liban",
    "Kuwait":"Koweït","Jordan":"Jordanie",
  };

  let row = startRow;
  const logoEquipe = chargerLogosOperateurs()[teamName.toLowerCase()];

  // Titre colonnes : logo équipe | Joueur
  const natTitleCell = sh.getRange(row, 1);
  if (logoEquipe) {
    natTitleCell.setFormula('=IMAGE("' + logoEquipe + '";4;28;28)')
      .setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setBackground("#1a0a2e")
      .setBorder(true,true,true,true,false,false,"#000000",SpreadsheetApp.BorderStyle.SOLID);
  } else {
    natTitleCell.setValue("🎮").setFontSize(14)
      .setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setBackground("#1a0a2e")
      .setBorder(true,true,true,true,false,false,"#000000",SpreadsheetApp.BorderStyle.SOLID);
  }
  sh.getRange(row, 2).setValue("Joueur").setBackground("#1a0a2e").setFontColor("#d0aaff")
    .setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBorder(true,true,true,true,false,false,"#000000",SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(row, 20);
  row++;

  // Joueurs
  players.forEach((p) => {
    const natFR   = NAT_FR[p.nationality] || p.nationality || "";
    const flagUrl = getFlagUrl(p.nationality);
    const natCell = sh.getRange(row, 1);
    if (flagUrl) {
      natCell.setFormula('=IMAGE("' + flagUrl + '";4;30;45)')
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
    } else {
      natCell.setValue(natFR).setFontSize(10).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
    }
    sh.getRange(row, 2).setValue(p.handle).setFontWeight("bold").setFontSize(11)
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
    sh.getRange(row, 1, 1, 2).setBackground("#ffffff").setFontColor("#000000")
      .setBorder(true,true,true,true,true,true,"#000000",SpreadsheetApp.BorderStyle.SOLID);
    sh.setRowHeight(row, 48);
    row++;
  });

  // Staff
  if (staff.length) {
    sh.getRange(row, 1, 1, 2).merge()
      .setValue("— Staff —")
      .setBackground("#1a0a2e").setFontColor("#d0aaff")
      .setFontWeight("bold").setFontSize(10)
      .setHorizontalAlignment("center")
      .setBorder(true,true,true,true,false,false,"#000000",SpreadsheetApp.BorderStyle.SOLID);
    sh.setRowHeight(row, 20);
    row++;
    staff.forEach((p) => {
      const natFR   = NAT_FR[p.nationality] || p.nationality || "";
      const flagUrl = getFlagUrl(p.nationality);
      const natCell = sh.getRange(row, 1);
      if (flagUrl) {
        natCell.setFormula('=IMAGE("' + flagUrl + '";4;30;45)')
          .setHorizontalAlignment("center").setVerticalAlignment("middle");
      } else {
        natCell.setValue(natFR).setFontSize(10).setFontWeight("bold")
          .setHorizontalAlignment("center").setVerticalAlignment("middle");
      }
      sh.getRange(row, 2).setValue(p.handle).setFontWeight("bold")
        .setFontStyle("italic").setFontSize(11)
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
      sh.getRange(row, 1, 1, 2).setBackground("#ffffff").setFontColor("#000000")
        .setBorder(true,true,true,true,true,true,"#000000",SpreadsheetApp.BorderStyle.SOLID);
      sh.setRowHeight(row, 48);
      row++;
    });
  }
}


function chargerLogosOperateurs() {
  if (_opLogos) return _opLogos;
  _opLogos = {};
  try {
    const folder = DriveApp.getFolderById(OPERATORS_FOLDER_ID);
    const imgTypes = ['image/png','image/jpeg','image/gif','image/webp'];
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      try {
        const mime = file.getMimeType();
        if (!imgTypes.includes(mime)) continue;
        const name = file.getName().replace(/\.[^.]+$/, "").trim();
        _opLogos[name.toLowerCase()] = "https://lh3.googleusercontent.com/d/" + file.getId();
      } catch(e2) { continue; }
    }
    Logger.log("Logos chargés : " + Object.keys(_opLogos).length);
  } catch(e) {
    Logger.log("Erreur logos : " + e.message);
  }
  return _opLogos;
}

function getOpUrl(opName) {
  if (!opName) return null;
  const logos = chargerLogosOperateurs();
  const key   = opName.toLowerCase().trim();
  return logos[key]
      || logos[key.replace(/\s+/g, '')]
      || logos[key.replace(/\s+/g, '_')]
      || logos[key.replace(/\s+/g, '-')]
      || null;
}

function getFlagUrl(nationality) {
  if (!nationality) return null;
  const logos = chargerLogosOperateurs(); // même dossier Drive
  return logos[nationality.toLowerCase().trim()] || null;
}

function debugLogos() {
  const logos = chargerLogosOperateurs();
  const keys  = Object.keys(logos).sort();
  SpreadsheetApp.getUi().alert(
    keys.length + " logos chargés :\n" + keys.join("\n")
  );
}


// ════════════════════════════════════════════════════════════════
//  BORDURES VERTICALES STRUCTURELLES
// ════════════════════════════════════════════════════════════════
function appliquerBorduresVerticales(sh, matchs, rowBansList, rowScoreList) {
  // Réinitialiser le fond des colonnes BQ+ en blanc sur les lignes séparateurs
  const C_COMP_LOCAL = 4 + 9 * 7; // 67
  (rowBansList || []).forEach(r => {
    // rowBans et rowScore (r-1) : blanc après C_COMP
    try {
      sh.getRange(r - 1, C_COMP_LOCAL + 1, 2, 10).setBackground("#ffffff");
    } catch(e) {}
  });
  // Lignes séparateurs blanches aussi
  (rowBansList || []).forEach(r => {
    try { sh.getRange(r + 1, C_COMP_LOCAL + 1, 1, 10).setBackground("#ffffff"); } catch(e) {}
  });
  const C_MAP1 = 4, MAP_W = 7, C_COMP = C_MAP1 + 9 * MAP_W; // = 67
  const MEDIUM  = SpreadsheetApp.BorderStyle.SOLID_MEDIUM;
  const lastCol = C_COMP;

  // Colonnes de séparation structurelles (entre groupes : A|B, B|C, et entre cartes)
  // On ne trace les bordures verticales QUE sur les séparateurs stricts :
  // A|B(1), B|C(2), C|D(3), et après chaque carte : col+6 de chaque carte → C_MAP1+i*MAP_W+6
  // PLUS la colonne LEAGUE (C_COMP)
  const sepColsRight = [1, 2, 3]; // bordure droite sur A, B, C
  for (let i = 0; i < 9; i++) {
    sepColsRight.push(C_MAP1 + i * MAP_W + MAP_W - 1); // dernière data de chaque carte
  }
  sepColsRight.push(C_COMP); // LEAGUE

  // 1. Bordures verticales sur lignes 1,2 et toutes lignes de contenu
  const allRows = [1, 2, ...(rowScoreList||[]), ...(rowBansList||[])];
  allRows.forEach(row => {
    sepColsRight.forEach(col => {
      try { sh.getRange(row,col,1,1).setBorder(null,null,null,true,null,null,"#000000",MEDIUM); } catch(e){}
    });
  });

  // 2. Bordure BAS sur chaque rowBans
  (rowBansList||[]).forEach(r => {
    for (let c = 1; c <= lastCol; c++) {
      try { sh.getRange(r,c,1,1).setBorder(null,null,true,null,null,null,"#000000",MEDIUM); } catch(e){}
    }
    const rScore = r - 1;
    [1, 2, 3, C_COMP].forEach(c => {
      try { sh.getRange(rScore,c,2,1).setBorder(null,null,true,null,null,null,"#000000",MEDIUM); } catch(e){}
    });
  });

  // 3. Bordure HAUT sur chaque rowScore
  (rowScoreList||[]).forEach(r => {
    for (let c = 1; c <= lastCol; c++) {
      try { sh.getRange(r,c,1,1).setBorder(true,null,null,null,null,null,"#000000",MEDIUM); } catch(e){}
    }
  });
}


// ════════════════════════════════════════════════════════════════
//  GROUPEMENT DES LIGNES PAR LIGUE
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
//  CHANGEMENTS DE ROSTER
// ════════════════════════════════════════════════════════════════
function afficherChangementsRoster(sh, matchs, aliases, rawMatchs, startCol, rowScoreList) {
  const history = fetchRosterHistory(aliases, rawMatchs);
  if (!history.length) return;

  const lastH             = history[history.length - 1];
  const lastRosterLower   = lastH.players.map(p => p.handle.toLowerCase());
  const lastRosterHandles = lastH.players.map(p => p.handle);

  // En-têtes ligne 2
  sh.getRange(2, startCol    ).setValue("Équipe du match").setBackground("#1a0a2e")
    .setFontColor("#d0aaff").setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.getRange(2, startCol + 1).setValue("Actuel").setBackground("#1a0a2e")
    .setFontColor("#d0aaff").setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.getRange(2, startCol + 2).setValue("BS").setBackground("#1a0a2e")
    .setFontColor("#d0aaff").setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setColumnWidth(startCol,     130);
  sh.setColumnWidth(startCol + 1, 130);
  sh.setColumnWidth(startCol + 2,  60);

  let lastKey      = null;
  let currentLigue = matchs[0]?.competition || "";
  let blueRow      = null; // position de la prochaine ligne bleue à écrire

  // Écrire le séparateur de la première ligue
  // On utilise la ligne 3 pour le premier séparateur
  let separatorRow = 3;
  // Ne rien écrire sur separatorRow : la ligne bleue du tableau principal la couvre déjà

  matchs.forEach((m, mi) => {
    // Utiliser la vraie position rowScore du tableau
    const rowScore = rowScoreList ? rowScoreList[mi] : (4 + mi * 3);

    // Changement de ligue : écrire séparateur à la bonne ligne
    if (m.competition !== currentLigue) {
      currentLigue = m.competition;
      lastKey = null;
      // La ligne bleue de ligue dans le tableau est rowScore - 1
      const blueLine = rowScore - 1;
      // Ne rien écrire sur blueLine : la ligne bleue du tableau principal la couvre déjà
    }

    const h = history.find(hh => hh.matchIdx === mi);
    const matchPlayers = h ? h.players : [];
    const matchLower   = matchPlayers.map(p => p.handle.toLowerCase());
    const key = matchLower.slice().sort().join(",");

    if (key !== lastKey) {
      lastKey = key;

      // Ne pas afficher si équipe identique au roster actuel
      const allCurrent = matchPlayers.length > 0 &&
        matchPlayers.every(p => lastRosterLower.includes(p.handle.toLowerCase())) &&
        lastRosterHandles.every(h => matchLower.includes(h.toLowerCase()));

      if (!allCurrent) {
        // Colonne 1 : tous les joueurs du match
        matchPlayers.forEach((p, i) => {
          const isCurrent = lastRosterLower.includes(p.handle.toLowerCase());
          sh.getRange(rowScore + i, startCol)
            .setValue(p.handle)
            .setFontSize(10).setFontWeight("bold")
            .setFontColor(isCurrent ? "#1b5e20" : "#b71c1c")
            .setBackground(isCurrent ? "#e8f5e9" : "#fce8e6")
            .setHorizontalAlignment("center").setVerticalAlignment("middle")
            .setBorder(true,true,true,true,false,false,"#000000",SpreadsheetApp.BorderStyle.SOLID);
        });

        // Colonne 2 : remplaçants actuels en face des rouges
        const rouges     = matchPlayers.filter(p => !lastRosterLower.includes(p.handle.toLowerCase()));
        const remplacants = lastRosterHandles.filter(h => !matchLower.includes(h.toLowerCase()));
        rouges.forEach((rouge, i) => {
          const remplacant = remplacants[i] || "";
          if (!remplacant) return;
          const rIdx = matchPlayers.findIndex(p => p.handle.toLowerCase() === rouge.handle.toLowerCase());
          if (rIdx < 0) return;
          sh.getRange(rowScore + rIdx, startCol + 1)
            .setValue(remplacant)
            .setFontSize(10).setFontWeight("bold")
            .setFontColor("#1b5e20").setBackground("#e8f5e9")
            .setHorizontalAlignment("center").setVerticalAlignment("middle")
            .setBorder(true,true,true,true,false,false,"#000000",SpreadsheetApp.BorderStyle.SOLID);
        });
      }
    }
  });
}

function grouperLignesParLigue(sh, matchs, rowScoreList, rowFinLigues) {
  if (!matchs || matchs.length === 0 || !rowScoreList || !rowScoreList.length) return;

  const ligues = [];
  let ligueStart = rowScoreList[0];
  let finIdx     = 0;

  matchs.forEach((m, i) => {
    const nextM = matchs[i + 1];
    if (!nextM || nextM.competition !== m.competition) {
      const rowFin = (rowFinLigues && rowFinLigues[finIdx])
        ? rowFinLigues[finIdx].endRow
        : rowScoreList[i] + 2;
      finIdx++;
      ligues.push({ startRow: ligueStart, endRow: rowFin, isLast: !nextM });
      if (nextM) ligueStart = rowScoreList[i + 1];
    }
  });

  // Utiliser shiftRowGroupDepth cellule par cellule sur la colonne 1
  // pour éviter les conflits avec les fusions horizontales
  ligues.forEach(({startRow, endRow, isLast}) => {
    const nRows = endRow - startRow + 1;
    if (nRows < 1) return;
    // Grouper en une seule fois (plus rapide, erreur ignorée)
    try {
      sh.getRange(startRow, 1, nRows, 1).shiftRowGroupDepth(1);
    } catch(e) {
      // Si erreur, grouper ligne par ligne
      for (let r = startRow; r <= endRow; r++) {
        try { sh.getRange(r, 1, 1, 1).shiftRowGroupDepth(1); } catch(e2) {}
      }
    }
    if (!isLast) {
      try { sh.getRange(startRow, 1, nRows, 1).collapseGroups(); } catch(e) {}
    }
  });
}

function grouperColonnesParCarte(sh) {
  // MAP_W=7 : col0=séparateur, cols1-6=data
  // Groupe sur les 6 colonnes DATA de chaque carte (pas le séparateur)
  // Les groupes ne sont PAS adjacents car séparés par col0 → indépendants !
  const C_MAP1 = 4, MAP_W = 7, N = 9;
  // Créer dans l'ordre inverse
  // Utiliser une ligne APRÈS tout le contenu pour éviter les fusions
  // shiftColumnGroupDepth affecte toute la colonne indépendamment de la ligne
  const groupRow = Math.max(sh.getLastRow() + 2, 200);
  for (let i = N - 1; i >= 0; i--) {
    const dataStart = C_MAP1 + i * MAP_W + 1; // col 1 de la carte
    try {
      sh.getRange(groupRow, dataStart, 1, 6).shiftColumnGroupDepth(1);
    } catch(e) { Logger.log("Groupe carte " + i + ": " + e.message); }
  }

  // Écrire le nom de la carte dans la colonne séparatrice (col 0) en vertical
  MAPS_DISPLAY.forEach((carte, i) => {
    const sepCol  = C_MAP1 + i * MAP_W; // col séparatrice
    const label   = (MAPS_FR[carte] || carte).toUpperCase();
    // Écrire le nom vertical via rotation de texte
    const lastRow = sh.getLastRow() || 100;
    // Ne colorer que la ligne 1 (titre vertical) et ligne 2 (en-tête)
    sh.getRange(1, sepCol, 2, 1)
      .setBackground("#1c2a4a").setFontColor("#aaccff")
      .setFontWeight("bold").setFontSize(8);
    // Écrire sur la ligne 2 (en-tête) avec rotation
    // Écrire le nom vertical dans la ligne 1 (pas ligne 2 qui a l'en-tête data)
    sh.getRange(1, sepCol)
      .setValue(label)
      .setTextRotation(90)
      .setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setFontWeight("bold").setFontSize(8)
      .setFontColor("#ffffff").setBackground("#0f0f23");
    sh.setColumnWidth(sepCol, 18);
  });
}

function genererStatsGlobales(){
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = lireConfig();
  let sh = ss.getSheetByName("📊 Stats Globales");
  if (!sh) sh = ss.insertSheet("📊 Stats Globales");
  sh.clearContents(); sh.clearFormats();

  // 2 colonnes par carte : "V/J" (texte) + "%" (nombre entier, triable)
  const mapCols = [];
  MAPS_DISPLAY.forEach(c => {
    const fr = MAPS_FR[c] || c;
    mapCols.push(fr + " V/J", fr + " %");
  });
  const H = ["Équipe","Région","% Victoires", ...mapCols];
  sh.getRange(1,1,1,H.length).setValues([H])
    .setBackground("#1a1a3a").setFontColor("#aaaaff").setFontWeight("bold").setFontSize(10);

  const rows = TEAMS.map(([nom,,region]) => {
    const equipe = cfg.find(e => e.nom === nom) || {dateDebut:"2000-01-01", dateFin:"2099-12-31"};
    const tab = ss.getSheetByName("🎮 " + nom);
    if (!tab || tab.getLastRow() < 3) {
      const empty = MAPS_DISPLAY.flatMap(() => ["—", ""]);
      return [nom, region, 0, ...empty];
    }

    const lastRow      = tab.getLastRow();
    const nRows        = lastRow - 2;
    const dateVals     = tab.getRange(3,1,nRows,1).getValues();
    const scoreVals    = tab.getRange(3,3,nRows,1).getValues();
    const compVals     = tab.getRange(3,4+MAPS_DISPLAY.length*7,nRows,1).getValues();
    const mapScoreVals = MAPS_DISPLAY.map((_,ci) =>
      tab.getRange(3, 4+ci*7+1, nRows, 1).getValues()
    );

    let V=0, D=0, N=0;
    const cs = new Set();
    const mapStats = MAPS_DISPLAY.map(() => ({wins:0, played:0}));

    scoreVals.forEach((r,i) => {
      const scoreStr = (r[0]||"").toString();
      const m = scoreStr.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (!m) return;
      const dateCell = (dateVals[i]?.[0]||"").toString();
      const dp = dateCell.split("/");
      if (dp.length === 3) {
        const iso = dp[2]+"-"+dp[1]+"-"+dp[0];
        if (iso < equipe.dateDebut || iso > equipe.dateFin) return;
      }
      const s1=parseInt(m[1]), s2=parseInt(m[2]);
      if (s1>s2) V++; else if (s1<s2) D++; else N++;
      const c = compVals[i]?.[0];
      if (c) cs.add(c.toString());
      MAPS_DISPLAY.forEach((_,ci) => {
        const cv = (mapScoreVals[ci]?.[i]?.[0]||"").toString();
        const sm = cv.match(/(\d+)-(\d+)/);
        if (!sm) return;
        mapStats[ci].played++;
        if (parseInt(sm[1]) > parseInt(sm[2])) mapStats[ci].wins++;
      });
    });

    const t = V+D+N;
    // 2 colonnes par carte : texte "V/J" + nombre % (pour tri)
    const mapStatsCols = mapStats.flatMap(s => {
      if (s.played === 0) return ["—", ""];
      const pct = Math.round(s.wins / s.played * 100);
      return [s.wins + "/" + s.played, pct];
    });
    // % victoires en nombre pour tri
    return [nom, region, t>0 ? Math.round(V/t*100) : 0, ...mapStatsCols];
  });

  // Tri par défaut : % victoires décroissant
  rows.sort((a,b) => b[2] - a[2]);
  if (rows.length) sh.getRange(2,1,rows.length,H.length).setValues(rows);

  // Formatage
  rows.forEach((r,i) => {
    const pct = r[2];
    const g = Math.min(Math.round(pct*2.55),255);
    // Col 3 (% victoires) : format "XX%"
    sh.getRange(i+2,3).setNumberFormat('0"%"')
      .setBackground("rgb("+(255-g)+","+g+",80)").setFontWeight("bold");
    sh.getRange(i+2,1,1,H.length).setBackground(i%2===0?"#f5f5ff":"#fff");
    // Colonnes % cartes (colonnes paires à partir de col 6)
    MAPS_DISPLAY.forEach((_,ci) => {
      const colPct = 4 + ci*2 + 1; // col % de cette carte
      const cell   = sh.getRange(i+2, colPct);
      const val    = r[3 + ci*2 + 1];
      if (val === "" || val === undefined) return;
      const p = parseInt(val);
      const mapBg = p>50 ? "#e8f5e9" : p<50 ? "#fce8e6" : (i%2===0?"#f5f5ff":"#fff");
      const mapFg = p>50 ? "#1b5e20" : p<50 ? "#b71c1c" : "#333";
      cell.setNumberFormat('0"%"')
          .setBackground(mapBg).setFontColor(mapFg)
          .setFontWeight("bold");
      // Col V/J : même couleur que col %
      sh.getRange(i+2, 4 + ci*2)
        .setBackground(mapBg).setFontColor(mapFg)
        .setHorizontalAlignment("center").setFontWeight("bold");
    });
  });

  // Largeurs : équipe, région, matchs, V, D, N, %, compétitions, puis 2 cols/carte
  const widths = [180,80,60, ...MAPS_DISPLAY.flatMap(()=>[55,45])];
  widths.forEach((w,i) => sh.setColumnWidth(i+1,w));
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
  try { if (sh.getFilter()) sh.getFilter().remove(); } catch(e) {}
  if (rows.length) sh.getRange(1,1,rows.length+1,H.length).createFilter();
  toast("✅ Stats globales !","📊",5);
}

function genererStatsCartes(){
  // Fonctionnalité à implémenter — pas d'alert() depuis un trigger
  Logger.log("genererStatsCartes : non implémentée");
}


function lireConfig(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const sh=ss.getSheets().find(s=>s.getName().toLowerCase().includes('configuration'));
  if(!sh){Logger.log("⚠️ Config introuvable. Onglets: "+ss.getSheets().map(s=>s.getName()).join(", "));return[];}
  Logger.log("✅ Config trouvée : "+sh.getName());
  const lastRow=sh.getLastRow();if(lastRow<2)return[];
  return sh.getRange(2,1,lastRow-1,5).getValues()
    .filter(r=>r[0]&&r[2]===true)
    .map(r=>({nom:r[0].toString().trim(),dateDebut:formatDate(r[3])||"2025-09-01",dateFin:formatDate(r[4])||"2030-12-31"}));
}

function formatDate(val){
  if(!val)return"";
  if(typeof val==="string"&&/^\d{4}-\d{2}-\d{2}/.test(val))return val.substring(0,10);
  if(val instanceof Date){const y=val.getFullYear(),m=String(val.getMonth()+1).padStart(2,"0"),d=String(val.getDate()).padStart(2,"0");return y+"-"+m+"-"+d;}
  const s=val.toString(),match=s.match(/(\d{4})-(\d{2})-(\d{2})/);return match?match[0]:"";
}

function ouvrirConfig(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheets().find(s=>s.getName().toLowerCase().includes('configuration'));
  if(!sh){
    sh=ss.insertSheet("⚙️ Configuration");
    const H=["Équipe","Région","✅ Actif","Date début (AAAA-MM-JJ)","Date fin (AAAA-MM-JJ)"];
    sh.getRange(1,1,1,H.length).setValues([H]).setBackground("#0f0f23").setFontColor("#e0e0ff").setFontWeight("bold");
    const today=Utilities.formatDate(new Date(),"UTC","yyyy-MM-dd");
    const rows=TEAMS.map(([n,,r])=>[n,r,true,"2025-09-01",today]);
    sh.getRange(2,1,rows.length,H.length).setValues(rows);
    sh.getRange(2,3,rows.length,1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    [180,160,100,180,180].forEach((w,i)=>sh.setColumnWidth(i+1,w));
    sh.setFrozenRows(1);
  }
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sh);
}

function setDocumentCible(){
  const ui=SpreadsheetApp.getUi();
  const rep=ui.prompt("📋 Document cible","Entre l'ID du Google Sheets cible :",ui.ButtonSet.OK_CANCEL);
  if(rep.getSelectedButton()===ui.Button.OK){
    const id=rep.getResponseText().trim();
    if(id){PropertiesService.getScriptProperties().setProperty('TARGET_SHEET_ID',id);ui.alert('✅ Document cible enregistré !');}
  }
}

function exporterVersCible(){
  const targetId=PropertiesService.getScriptProperties().getProperty('TARGET_SHEET_ID');
  if(!targetId){SpreadsheetApp.getUi().alert("❌ Aucun document cible configuré.");return;}
  const src=SpreadsheetApp.getActiveSpreadsheet();
  let dst;
  try{dst=SpreadsheetApp.openById(targetId);}catch(e){SpreadsheetApp.getUi().alert("❌ Impossible d'ouvrir le document cible : "+e.message);return;}
  const dstByName={};dst.getSheets().forEach(s=>dstByName[s.getName()]=s);
  let count=0;
  const EXCLUDE=['configuration','config'];
  src.getSheets().forEach(sh=>{
    const name=sh.getName();
    if(EXCLUDE.some(p=>name.toLowerCase().includes(p)))return;
    toast('📋 Export '+name+'...','📤',10);
    const copy=sh.copyTo(dst);copy.setName('__tmp__'+name);
    if(dstByName[name])dst.deleteSheet(dstByName[name]);
    copy.setName(name);count++;
  });
  toast('✅ '+count+' feuilles exportées !','📤',5);
}


function toast(msg,title,t){SpreadsheetApp.getActiveSpreadsheet().toast(msg,title||"🎮",t||5);}