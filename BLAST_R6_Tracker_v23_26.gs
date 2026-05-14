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

// ⚙️ REMPLACE PAR TA CLÉ LIQUIPEDIADB
const LIQUIPEDIA_KEY = "TON_TOKEN_ICI";

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
  ["G2 Esports",         ["G2 Esports"],                       "Europe"],
  ["Team Falcons",       ["Team Falcons"],                      "Europe"],
  ["Twisted Minds",      ["Twisted Minds"],                     "Europe"],
  ["Virtus.pro",         ["Virtus.pro","Virtus Pro"],           "Europe"],
  ["DarkZero Esports",   ["DarkZero","DarkZero Esports"],       "Amérique du Nord"],
  ["Five Fears",         ["Five Fears","FEARX"],                "Amérique du Nord"],
  ["Shopify Rebellion",  ["Shopify Rebellion"],                 "Amérique du Nord"],
  ["Wildcard",           ["Wildcard","Wildcard Gaming"],        "Amérique du Nord"],
  ["FaZe Clan",          ["FaZe Clan"],                         "Amérique du Sud"],
  ["FURIA",              ["FURIA","FURIA Esports"],             "Amérique du Sud"],
  ["LOS",                ["LOS","Zero Zero Sete","Fluxo W7M"],  "Amérique du Sud"],
  ["Ninjas in Pyjamas",  ["Ninjas in Pyjamas","NiP"],           "Amérique du Sud"],
  ["CAG Osaka",          ["CAG Osaka","Cyclops Athlete Gaming"],"APAC"],
  ["Daystar",            ["Daystar"],                           "APAC"],
  ["ENTERPRISE Esports", ["ENTERPRISE Esports","ENTER FORCE.36"],"APAC"],
  ["Weibo Gaming",       ["Weibo Gaming"],                      "APAC"],
  ["All Gamers",         ["All Gamers"],                        "Chine"],
  ["EDward Gaming",      ["EDward Gaming","Geekay Esports"],    "Chine"],
  ["Four Angry Men",     ["Four Angry Men"],                    "Chine"],
  ["Wolves Esports",     ["Wolves Esports"],                    "Chine"],
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
      Utilities.sleep(1500); // respecter le rate limit

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
    .addItem("🔍  Debug API (Team Falcons)",               "debugAPI")
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
function construireTout() {
  if (LIQUIPEDIA_KEY === "TON_TOKEN_ICI") {
    SpreadsheetApp.getUi().alert("⚠️ Configure ta clé LiquipediaDB ligne 16 !");
    return;
  }

  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = lireConfig();

  // Crédit Liquipedia sur la première feuille
  construirePageAccueil(ss);

  TEAMS.forEach(([nom, aliases, region], i) => {
    toast(`🔄 ${nom} (${i+1}/${TEAMS.length})`, "API Liquipedia", 30);

    const equipe    = cfg.find(e => e.nom === nom) || {dateDebut:"2023-03-10", dateFin:"2030-12-31"};
    const rawMatchs = fetchMatchesForTeam(nom, aliases, equipe.dateDebut, equipe.dateFin);
    const matchs    = rawMatchs.map(m => convertMatch(m, aliases)).filter(m => m !== null);

    construireOnglet(ss, nom, region, matchs, aliases, rawMatchs);
  });

  genererStatsCartes();
  genererStatsGlobales();
  toast("✅ Terminé !", "🎮", 8);
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
      const atkStr = (md.allAtkBans||[]).join(", ");
      const defStr = (md.allDefBans||[]).join(", ");
      if (atkStr||defStr) s += "\nATK: " + atkStr + "\nDEF: " + defStr;
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
    const atkStr = (md.allAtkBans||[]).join(", ");
    const defStr = (md.allDefBans||[]).join(", ");
    if (atkStr||defStr) s += "\nATK: " + atkStr + "\nDEF: " + defStr;
    return s;
  }
  return "";
}


// ════════════════════════════════════════════════════════════════
//  ONGLET ÉQUIPE
// ════════════════════════════════════════════════════════════════

function construireOnglet(ss, nom, region, matchs, aliases, rawMatchs) {
  let sh=ss.getSheetByName("🎮 "+nom);
  if(sh)ss.deleteSheet(sh);
  sh=ss.insertSheet("🎮 "+nom);
  const C_DATE=1,C_ADV=2,C_SEP=3,C_SCORE=4,C_MAP1=5;
  const C_COMP=C_MAP1+MAPS_DISPLAY.length;

  sh.getRange(1,1).setValue(nom).setFontSize(13).setFontWeight("bold").setFontColor("#fff").setVerticalAlignment("middle");
  sh.getRange(1,1,1,C_COMP).setBackground("#0f0f23").setVerticalAlignment("middle");

  const hdrs=["Date","Team","","Score",...MAPS_DISPLAY.map(m=>MAPS_FR[m]||m),"LEAGUE"];
  sh.getRange(2,1,1,hdrs.length).setValues([hdrs])
    .setBackground("#1c2a4a").setFontColor("#aaccff").setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setFrozenRows(2); sh.setFrozenColumns(4);

  if(!matchs.length){
    sh.getRange(3,1).setValue("Aucun match dans le JSON pour cette équipe.")
      .setFontStyle("italic").setFontColor("#999");
  } else {
    let row=3;
    matchs.forEach(m=>{
      const vals=MAPS_DISPLAY.map(c=>cellValue(m.maps[c]));
      const rd=[m.date,m.adversaire,"",m.scoreGlobal,...vals,m.competition];
      sh.getRange(row,1,1,rd.length).setValues([rd]);
      sh.getRange(row,1,1,rd.length).setFontSize(12).setFontColor("#000000").setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
      const bg=m.resultat==="V"?"#e6f4ea":m.resultat==="D"?"#fce8e6":"#fff8e1";
      sh.getRange(row,1,1,rd.length).setBackground(bg);
      sh.getRange(row,C_SCORE).setFontSize(12).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontColor("#000000");
      MAPS_DISPLAY.forEach((c,ci)=>{
        const cell=sh.getRange(row,C_MAP1+ci);
        cell.setFontSize(12).setFontColor("#000000").setFontWeight("bold").setHorizontalAlignment("center").setWrap(true).setVerticalAlignment("middle").setFontStyle("normal");
        const v=vals[ci]; if(!v) return;
        if(/^\[1\] Ban$|^Ban \d+$/.test(v)) {
          // Bans de notre équipe → fond magenta, texte noir
          cell.setBackground("#e040fb").setFontColor("#000000").setFontWeight("bold");
        } else if(/^\[1\] Ban O$|^Ban \d+ O$/.test(v.trim())) {
          // Bans adversaires → fond cyan, texte noir
          cell.setBackground("#00e5ff").setFontColor("#000000").setFontWeight("bold");
        } else if(v==="DECIDER") {
          // Decider non joué → fond blanc, texte noir
          cell.setBackground("#ffffff").setFontColor("#000000").setFontWeight("bold");
        } else {
          // Map jouée → vert si victoire, rouge si défaite
          const md=m.maps[c];
          if(md&&md.scoreTeam!==undefined&&md.scoreTeam!==""&&md.scoreTeam!=="-")
            cell.setBackground(md.scoreTeam>md.scoreOpp?"#c8e6c9":"#ffcdd2");
        }
      });
      sh.getRange(row,C_COMP).setFontSize(12).setFontColor("#000000").setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
      row++; row++;
    });
  }
  sh.setColumnWidth(C_DATE,  100);
  sh.setColumnWidth(C_ADV,   180);
  sh.setColumnWidth(C_SEP,     6);
  sh.setColumnWidth(C_SCORE,  75);
  MAPS_DISPLAY.forEach((_,i) => sh.setColumnWidth(C_MAP1+i, 140));
  sh.setColumnWidth(C_COMP, 260);
  sh.autoResizeColumn(C_COMP);

  // Auto-resize height for all data rows to fit wrapped content
  if (matchs.length) {
    const lastRow = 3 + matchs.length * 2 - 1;
    sh.autoResizeRows(3, lastRow - 2);
  }

  // ── Roster à droite ──────────────────────────────────────
  const C_ROSTER = C_COMP + 2;
  construireRosterOnglet(ss, sh, nom, aliases, rawMatchs, C_ROSTER);
}

// ════════════════════════════════════════════════════════════════
//  PAGE D'ACCUEIL + CRÉDIT LIQUIPEDIA
// ════════════════════════════════════════════════════════════════
function construirePageAccueil(ss) {
  let sh = ss.getSheetByName("🏠 Home");
  if (!sh) {
    sh = ss.insertSheet("🏠 Home", 0);
  } else {
    sh.clearContents();
    sh.clearFormats();
  }
  sh.setTabColor("#0f0f23");
  sh.getRange("A1:Z60").setBackground("#0f0f23");

  // ── Titre ───────────────────────────────────────────────
  sh.getRange("B2:H2").merge()
    .setValue("BLAST R6 Major Salt Lake City 2026")
    .setFontSize(22).setFontWeight("bold").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#0f0f23");
  sh.getRange("B3:H3").merge()
    .setValue("Match Tracker — 20 Teams")
    .setFontSize(13).setFontColor("#aaccff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#0f0f23");
  sh.setRowHeight(2, 55);

  // ── Description ─────────────────────────────────────────
  sh.getRange("B5:H5").merge().setBackground("#1c2a4a");
  sh.getRange("B6:H6").merge()
    .setValue("Real-time match tracker for all 20 BLAST Major SLC 2026 teams. Displays map veto sequences, per-map scores (ATK/DEF halves), operator bans and player rosters — powered by the LiquipediaDB API.")
    .setFontSize(11).setFontColor("#cccccc").setBackground("#0f0f23")
    .setWrap(true).setHorizontalAlignment("left").setVerticalAlignment("middle");
  sh.setRowHeight(6, 60);

  // ── Auteur ──────────────────────────────────────────────
  sh.getRange("B8:H8").merge().setBackground("#1c2a4a");
  sh.getRange("B9:H9").merge()
    .setValue("✏️  Author")
    .setFontSize(13).setFontWeight("bold").setFontColor("#ffffff")
    .setBackground("#1a0a2e").setVerticalAlignment("middle");

  sh.getRange("B10:H10").merge()
    .setValue("Fio'  —  Fiorenzo Elba  |  Rainbow Six Siege caster (French stream)")
    .setFontSize(11).setFontColor("#dddddd").setBackground("#0f0f23").setVerticalAlignment("middle");

  sh.getRange("B11:H11").merge()
    .setValue("Built with the assistance of Claude (Anthropic AI)")
    .setFontSize(11).setFontColor("#dddddd").setBackground("#0f0f23").setVerticalAlignment("middle");

  // Lien X cliquable
  const urlX  = "https://x.com/fofiopathe";
  const textX = "𝕏  @fofiopathe";
  const rtvX  = SpreadsheetApp.newRichTextValue()
    .setText(textX).setLinkUrl(0, textX.length, urlX).build();
  sh.getRange("B12:H12").merge().setRichTextValue(rtvX);
  sh.getRange("B12:H12")
    .setFontSize(12).setFontWeight("bold").setFontColor("#4fc3f7")
    .setBackground("#0f0f23").setVerticalAlignment("middle");

  // ── Remerciements Liquipedia ─────────────────────────────
  sh.getRange("B14:H14").merge().setBackground("#1c2a4a");
  sh.getRange("B15:H15").merge()
    .setValue("🙏  Special Thanks")
    .setFontSize(13).setFontWeight("bold").setFontColor("#ffffff")
    .setBackground("#1a0a2e").setVerticalAlignment("middle");

  sh.getRange("B16:H18").merge()
    .setValue("A huge and warm thank you to the entire Liquipedia team for their incredible work in building and maintaining such a comprehensive esports database, and for making this data freely accessible through their API. This tool would simply not exist without them.")
    .setFontSize(11).setFontColor("#dddddd").setBackground("#0f0f23")
    .setWrap(true).setHorizontalAlignment("left").setVerticalAlignment("middle");
  sh.setRowHeight(16, 30); sh.setRowHeight(17, 30); sh.setRowHeight(18, 30);

  // Lien Liquipedia cliquable
  const url1  = "https://liquipedia.net/rainbowsix";
  const text1 = "Liquipedia Rainbow Six";
  const rtv1  = SpreadsheetApp.newRichTextValue()
    .setText(text1).setLinkUrl(0, text1.length, url1).build();
  sh.getRange("B19:H19").merge().setRichTextValue(rtv1);
  sh.getRange("B19:H19")
    .setFontSize(12).setFontWeight("bold").setFontColor("#4fc3f7")
    .setBackground("#0f0f23").setVerticalAlignment("middle");

  // Lien Copyrights cliquable
  const url2  = "https://liquipedia.net/commons/Liquipedia:Copyrights";
  const text2 = "Liquipedia:Copyrights — CC-BY-SA License";
  const rtv2  = SpreadsheetApp.newRichTextValue()
    .setText(text2).setLinkUrl(0, text2.length, url2).build();
  sh.getRange("B20:H20").merge().setRichTextValue(rtv2);
  sh.getRange("B20:H20")
    .setFontSize(12).setFontColor("#4fc3f7")
    .setBackground("#0f0f23").setVerticalAlignment("middle");

  sh.getRange("B21:H21").merge()
    .setValue("Data licensed under CC-BY-SA. Please credit Liquipedia when sharing.")
    .setFontSize(10).setFontColor("#888888").setBackground("#0f0f23").setVerticalAlignment("middle");

  // ── Dernière mise à jour ─────────────────────────────────
  sh.getRange("B23:H23").merge().setBackground("#1c2a4a");
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  sh.getRange("B24:H24").merge()
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

function construireRosterOnglet(ss, sh, teamName, aliases, rawMatchs, startCol) {
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
  };

  // Séparateur
  sh.setColumnWidth(startCol - 1, 15);

  // En-têtes ligne 2 (commence en P2)
  sh.getRange(2, startCol, 1, 2)
    .setValues([["Nationalité", "Joueur"]])
    .setBackground("#1a0a2e").setFontColor("#d0aaff")
    .setFontWeight("bold").setFontSize(11)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Données à partir de la ligne 3
  let row = 3;

  // Joueurs
  players.forEach((p, i) => {
    const natFR = NAT_FR[p.nationality] || p.nationality || "";
    sh.getRange(row, startCol    ).setValue(natFR).setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle");
    sh.getRange(row, startCol + 1).setValue(p.handle).setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle");
    sh.getRange(row, startCol, 1, 2).setBackground("#ffffff").setFontColor("#000000").setVerticalAlignment("middle");
    row++;
  });

  // Staff
  if (staff.length) {
    sh.getRange(row, startCol, 1, 2).merge()
      .setValue("— Staff —")
      .setBackground("#1a0a2e").setFontColor("#d0aaff")
      .setFontWeight("bold").setFontSize(10)
      .setHorizontalAlignment("center");
    row++;

    staff.forEach((p, i) => {
      const natFR = NAT_FR[p.nationality] || p.nationality || "";
      sh.getRange(row, startCol    ).setValue(natFR).setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle");
      sh.getRange(row, startCol + 1).setValue(p.handle).setFontStyle("italic").setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle");
      sh.getRange(row, startCol, 1, 2).setBackground("#ffffff").setFontColor("#000000").setVerticalAlignment("middle");
      row++;
    });
  }

  // Largeurs
  sh.setColumnWidth(startCol,     120);
  sh.setColumnWidth(startCol + 1, 130);
}


function genererStatsCartes(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName("🗺️ Stats Cartes");
  if(!sh)sh=ss.insertSheet("🗺️ Stats Cartes");
  sh.clearContents();sh.clearFormats();
  const equipes=TEAMS.map(([n])=>n);
  const data={};
  equipes.forEach(nom=>{
    data[nom]={};MAPS_DISPLAY.forEach(c=>{data[nom][c]={joue:0,V:0,bans:0};});
    const tab=ss.getSheetByName("🎮 "+nom);
    if(!tab||tab.getLastRow()<3)return;
    const nRows=tab.getLastRow()-2;if(nRows<=0)return;
    tab.getRange(3,5,nRows,MAPS_DISPLAY.length).getValues().forEach(row=>row.forEach((cell,ci)=>{
      const v=cell.toString().trim();if(!v||ci>=MAPS_DISPLAY.length)return;
      const c=MAPS_DISPLAY[ci];
      if(/^BAN/i.test(v))data[nom][c].bans++;
      else if(v!=="DECIDER"){const m=v.match(/(\d+)\s*[-–]\s*(\d+)/);if(m){data[nom][c].joue++;if(parseInt(m[1])>parseInt(m[2]))data[nom][c].V++;}}
    }));
  });
  const mapsSort=[...MAPS_DISPLAY].sort((a,b)=>{
    const ta=equipes.reduce((s,e)=>s+(data[e]?.[a]?.joue||0),0);
    const tb=equipes.reduce((s,e)=>s+(data[e]?.[b]?.joue||0),0);return tb-ta;
  });
  const H=["🗺️ Carte","Total joué","Total bans",...equipes.flatMap(e=>[e+" (J)",e+" (V)",e+" (%)"])];
  sh.getRange(1,1,1,H.length).setValues([H]).setBackground("#1a3a1a").setFontColor("#90ee90").setFontWeight("bold").setFontSize(9);
  mapsSort.forEach((carte,ri)=>{
    const tj=equipes.reduce((s,e)=>s+(data[e]?.[carte]?.joue||0),0);
    const tb=equipes.reduce((s,e)=>s+(data[e]?.[carte]?.bans||0),0);
    const row=[MAPS_FR[carte]||carte,tj,tb,...equipes.flatMap(e=>{
      const d=data[e]?.[carte]||{joue:0,V:0};return[d.joue,d.V,d.joue>0?(d.V/d.joue*100).toFixed(0)+"%":"-"];
    })];
    sh.getRange(ri+2,1,1,H.length).setValues([row]).setBackground(ri%2===0?"#f1f8e9":"#fff");
  });
  sh.setColumnWidth(1,140);sh.setColumnWidth(2,90);sh.setColumnWidth(3,90);
  sh.setFrozenRows(1);sh.getRange(1,1,mapsSort.length+1,H.length).createFilter();
  toast("✅ Stats cartes !","🗺️",5);
}

// ════════════════════════════════════════════════════════════════
//  STATS GLOBALES
// ════════════════════════════════════════════════════════════════
function genererStatsGlobales(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName("📊 Stats Globales");
  if(!sh)sh=ss.insertSheet("📊 Stats Globales");
  sh.clearContents();sh.clearFormats();
  const H=["Équipe","Région","Matchs","V","D","N","% Victoires","Compétitions"];
  sh.getRange(1,1,1,H.length).setValues([H]).setBackground("#1a1a3a").setFontColor("#aaaaff").setFontWeight("bold").setFontSize(10);
  const rows=TEAMS.map(([nom,,region])=>{
    const tab=ss.getSheetByName("🎮 "+nom);
    if(!tab||tab.getLastRow()<3)return[nom,region,0,0,0,0,"0%",0];
    const n=tab.getLastRow()-2;
    const scores=tab.getRange(3,4,n,1).getValues();
    const comps=tab.getRange(3,4+MAPS_DISPLAY.length+1,n,1).getValues();
    let V=0,D=0,N=0;const cs=new Set();
    scores.forEach((r,i)=>{
      const m=r[0].toString().match(/(\d+)\s*[-–]\s*(\d+)/);if(!m)return;
      const s1=parseInt(m[1]),s2=parseInt(m[2]);
      if(s1>s2)V++;else if(s1<s2)D++;else N++;
      const c=comps[i]?.[0];if(c)cs.add(c.toString());
    });
    const t=V+D+N;return[nom,region,t,V,D,N,t>0?(V/t*100).toFixed(1)+"%":"0%",cs.size];
  });
  rows.sort((a,b)=>parseFloat(b[6])-parseFloat(a[6]));
  sh.getRange(2,1,rows.length,H.length).setValues(rows);
  rows.forEach((r,i)=>{
    const pct=parseFloat(r[6]);const g=Math.min(Math.round(pct*2.55),255);
    sh.getRange(i+2,7).setBackground(`rgb(${255-g},${g},80)`).setFontWeight("bold");
    sh.getRange(i+2,1,1,H.length).setBackground(i%2===0?"#f5f5ff":"#fff");
  });
  [180,160,70,50,50,50,100,140].forEach((w,i)=>sh.setColumnWidth(i+1,w));
  sh.setFrozenRows(1);sh.getRange(1,1,rows.length+1,H.length).createFilter();
  toast("✅ Stats globales !","📊",5);
}

// ════════════════════════════════════════════════════════════════
//  CONFIG & UTILITAIRES
// ════════════════════════════════════════════════════════════════
function ouvrirConfig(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName("⚙️ Configuration");
  if(!sh){
    sh=ss.insertSheet("⚙️ Configuration");
    const H=["Équipe","Région","✅ Actif","Date début (AAAA-MM-JJ)","Date fin (AAAA-MM-JJ)"];
    sh.getRange(1,1,1,H.length).setValues([H]).setBackground("#0f0f23").setFontColor("#e0e0ff").setFontWeight("bold");
    const today=Utilities.formatDate(new Date(),"UTC","yyyy-MM-dd");
    const rows=TEAMS.map(([n,,r])=>[n,r,true,"2023-03-10",today]);
    sh.getRange(2,1,rows.length,H.length).setValues(rows);
    sh.getRange(2,3,rows.length,1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    [180,160,100,180,180].forEach((w,i)=>sh.setColumnWidth(i+1,w));
    sh.setFrozenRows(1);
  }
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sh);
}
function lireConfig(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const sh=ss.getSheetByName("⚙️ Configuration");
  if(!sh)return[];
  return sh.getRange(2,1,sh.getLastRow()-1,5).getValues()
    .filter(r=>r[0]&&r[2]===true)
    .map(r=>({
      nom: r[0].toString().trim(),
      dateDebut: formatDate(r[3]) || "2023-03-10",
      dateFin:   formatDate(r[4]) || "2030-12-31",
    }));
}

function formatDate(val) {
  if (!val) return "";
  // Si c'est déjà une string YYYY-MM-DD
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0,10);
  // Si c'est un objet Date (Google Sheets convertit automatiquement)
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth()+1).padStart(2,"0");
    const d = String(val.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }
  // Sinon toString et extraire YYYY-MM-DD
  const s = val.toString();
  const match = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[0] : "";
}
function toast(msg,title,t){SpreadsheetApp.getActiveSpreadsheet().toast(msg,title||"🎮",t||5);}