# Likipedia-R6-Tracker
# 🎮 BLAST R6 Major Salt Lake City 2026 — Match Tracker

> Real-time match tracker for all 20 BLAST Major SLC 2026 teams. Displays map veto sequences, per-map scores (ATK/DEF halves), operator bans and player rosters — powered by the LiquipediaDB API.

---

## ✏️ Author

**Fio' — Fiorenzo Elba**
Rainbow Six Siege caster for the French broadcast stream.
Built with the assistance of [Claude](https://claude.ai) (Anthropic AI).

📬 Contact & follow: **[𝕏 @fofiopathe](https://x.com/fofiopathe)**

---

## 📖 Description

This Google Sheets tool automatically retrieves and displays match data for every team competing at the BLAST R6 Major Salt Lake City 2026 tournament. For each team, it shows:

- **Map veto** — ban and pick order with color coding (magenta = our team's ban, cyan = opponent's ban)
- **Per-map results** — scores with ATK/DEF half breakdown
- **Operator bans** — all ATK and DEF bans per map
- **Pick order** — `[1]`, `[2]`, `[3]` for our team's picks; `[2 O]`, `[4 O]` for opponent picks (BO5)
- **Player roster** — extracted from the most recent match data
- **Summary stats** — map win rates and global win percentages per team

Data is fetched live from the **LiquipediaDB API** — no static files needed.

---

## 🚀 Setup & Installation

### Prerequisites
- A Google account with access to Google Sheets
- A **LiquipediaDB API key** — request one at [api.liquipedia.net](https://api.liquipedia.net)

### Step-by-step

**1. Create a new Google Sheet**

**2. Open Apps Script**
Go to **Extensions → Apps Script** in the menu bar.

**3. Paste the code**
Delete any existing content in the editor and paste the full contents of `BLAST_R6_Tracker_v23.gs`.

**4. Configure your API key**
On **line 16**, replace `YOUR_TOKEN_HERE` with your LiquipediaDB API key:
```javascript
const LIQUIPEDIA_KEY = "your_actual_api_key_here";
```

**5. Save**
Press `Ctrl+S` (or `Cmd+S` on Mac). Authorize the script when prompted.

**6. Reload the spreadsheet**
Close and reopen the Google Sheet. A new menu **🎮 BLAST Major** will appear.

**7. Build the tracker**
Click **🎮 BLAST Major → 🚀 Build All (Liquipedia API)**

The script will fetch all match data for all 20 teams sequentially (~3–5 minutes depending on your API quota).

---

## 📋 Menu Options

| Menu item | Description |
|---|---|
| 🚀 Build All | Fetches all 20 teams from LiquipediaDB and builds every tab |
| 🔄 Rebuild one team | Prompts you to choose a single team to rebuild |
| 🗺️ Recalculate Map Stats | Rebuilds the `🗺️ Stats Cartes` summary tab |
| 📊 Recalculate Global Stats | Rebuilds the `📊 Stats Globales` summary tab |
| 🔍 Debug API | Tests a single API call for Team Falcons and shows the raw response |
| ⚙️ Date filters | Opens a configuration tab to set per-team date ranges |

---

## 🗂️ Tabs

| Tab | Content |
|---|---|
| 🏠 Home | Introduction, author info, Liquipedia attribution |
| 🎮 [Team Name] | One tab per team with full match history |
| 🗺️ Stats Cartes | Map win rates across all teams |
| 📊 Stats Globales | Global win/loss stats per team |
| ⚙️ Configuration | Date filters per team (optional) |

---

## ⚙️ Date Filters

By default, the tracker fetches matches from **March 10, 2023** onwards.
To customize per team:

1. Go to **🎮 BLAST Major → ⚙️ Date filters**
2. Adjust the **Start date** and **End date** columns for each team (format: `YYYY-MM-DD`)
3. Uncheck the ✅ checkbox to exclude a team from bulk builds

---

## ⚠️ API Rate Limits

The LiquipediaDB API allows **60 requests per hour** per key.
- Building all 20 teams uses ~40–60 requests
- If you hit the rate limit (error 429), wait 1 hour and retry
- Use **🔄 Rebuild one team** to test a single team without consuming your full quota

---

## 🙏 Special Thanks — Liquipedia

A huge and warm thank you to the entire **Liquipedia** team for their incredible work building and maintaining one of the most comprehensive esports databases in the world, and for making this data freely accessible through their API.

This tool would simply not exist without them.

- 🔗 [Liquipedia Rainbow Six](https://liquipedia.net/rainbowsix)
- 📜 [Liquipedia:Copyrights — CC-BY-SA](https://liquipedia.net/commons/Liquipedia:Copyrights)

> As noted by the CC-BY-SA license, please credit Liquipedia in close proximity to any data derived from their platform, ideally with a backlink.

---

## 📄 License

This tool's code is shared freely. Data belongs to Liquipedia and is licensed under **CC-BY-SA**.
Please credit both **Fio' (Fiorenzo Elba)** and **Liquipedia** if you share or adapt this work.
