# Albishorn Climbers – Code- & Projektanalyse

**Für:** Projektleitung
**Von:** Lead Developer
**Stand:** 14.10.2026, Analyse des kompletten Quellcodes (≈ 5 100 Zeilen JS/HTML)

---

## Kurzfazit

Albishorn Climbers ist ein kleines, aber sehr sauber gebautes Koop-Jump-and-Run für 2 Spieler auf **Phaser 3**. Es braucht keinen Build-Schritt und keine Audio- oder Bilddateien (HD-PNGs sind optional). Level entstehen datengetrieben aus ASCII-Karten. Das Spielgefühl ist ausgereift (Coyote Time, Jump Buffer, Squash & Stretch), dazu kommt ein durchdachtes Koop-Mechanik-System aus Auslösern und Zielen.

Die grösste technische Schuld ist die **`GameScene` mit rund 1 400 Zeilen**: Spieler, Physik, alle Mechaniken, HUD und Effekte stecken in einer Klasse. Für die nächsten Ausbaustufen (Gegner, neue Objekte, mehr Level) empfehle ich, zuerst gezielt zu refaktorisieren, ohne die Architektur umzuwerfen.

---

## 1. Projekt-Übersicht & Architektur

### Technologie-Stack

| Bereich | Technologie |
|---|---|
| Engine | **Phaser 3.80.1** (per CDN von jsDelivr) |
| Physik | Phaser **Arcade Physics** (AABB, Schwerkraft 1400) |
| Sprache | Vanilla JavaScript (ES2015+), **klassische Scripts, keine ES-Module** |
| Rendering | `Phaser.AUTO` (WebGL mit Canvas-Fallback), 960×540, `pixelArt: true`, Skalierung `FIT` |
| Grafik | Prozedural per Canvas/Graphics erzeugt; optional HD-PNGs aus `assets/` (nur über Webserver) |
| Audio | Prozedural per **Web Audio API** (Synthesizer-Rezepte, keine Audiodateien) |
| Schrift | „Press Start 2P“ von Google Fonts (Fallback: monospace) |
| Build/Tooling | Keins: kein npm, kein Bundler, keine Tests, **kein Git-Repository** |

Gestartet wird mit einem Doppelklick auf `index.html` oder über `python -m http.server`, dann sind auch die HD-PNGs aktiv.

### Ordnerstruktur

```
index.html                Einstieg; lädt Phaser + alle Scripts in fester Reihenfolge
assets/                   6 HD-PNGs (Figuren, Tileset, Parallax) – optional
js/
  config.js        173    Physik-Konstanten, Steuerung, Namen, Dialoge, Abspann, Passwort-Helfer
  levels.js        312    5 Level als ASCII-Karten + Mechanik-Konfiguration
  input.js         102    Tastatur + Gamepad → einheitliche PlayerInput-Klasse
  sfx.js           227    Sound-Synthesizer, ~35 Effekt-Rezepte, 2 Melodien
  dialog.js        110    RPG-Dialogbox mit Porträt & Schreibmaschinen-Effekt
  asset-layout.js   72    Raster/Koordinaten der HD-PNGs
  art.js           525    „Modern Pixel“-Texturen, Parallax-Hintergrund, Vignette
  main.js           26    Phaser-Game-Konfiguration
  scenes/
    BootScene.js   977    Figuren-Pixel-Art, Textur-Erzeugung, HD-PNG-Import, Animationen
    IntroScene.js  193    Konsolen-Startlogo „KES“ + Story-Intro
    MenuScene.js   250    Titel, Menü, Passwort-Eingabe (SNES-Stil)
    GameScene.js  1397    Gesamtes Gameplay
    VictoryScene.js 91    Level geschafft + Passwort
    FinaleScene.js 382    Geburtstags-Finale (Feuerwerk, Song)
    CreditsScene.js 147   Abspann
```

### Szenenfluss

```
BootScene → IntroScene(logo) → MenuScene ─┬→ IntroScene(story) → GameScene(L1)
                                          └→ Passwort → GameScene(Ln) / FinaleScene (Code 3030)
GameScene ──(Level geschafft)──→ VictoryScene → GameScene(Ln+1) … → FinaleScene → CreditsScene → MenuScene
```

### Architekturmuster

- **Globale Module statt Imports:** Alle Konstanten und Klassen liegen im globalen Scope (`LEVELS`, `Sfx`, `Art`, `PLAYER_DEFS` …). Deshalb ist die Script-Reihenfolge in `index.html` verbindlich. Das ist bewusst so gewählt, damit das Spiel ohne Server per `file://` läuft.
- **Szenen als Controller:** Jede Spielphase ist eine eigene Phaser-Szene, Daten werden über `scene.start(key, data)` bzw. die `registry` weitergereicht.
- **Datengetriebene Level:** ASCII-Karte plus deklarative `triggers`/`targets`/`sequences`. Der Code ist generisch, die Leveldaten sind reine Konfiguration.
- **Trigger-/Target-Signalsystem:** Auslöser (Schalter, Hebel, Farbtasten-Sequenz) senden Signale an Ziel-Gruppen (Tor, Brücke, Wasser, Aufzug, Zugbrücke, Förderband), verknüpft über ODER. Das ist das Herzstück des Koop-Designs.
- **Trennung Physik ↔ Darstellung beim Spieler:** Ein unsichtbarer Physik-Körper und ein sichtbares Sprite, das gestaucht und gestreckt wird, ohne die Hitbox zu verändern.
- **Fallback-Kette für Grafik:** zuerst einfache Code-Texturen (BootScene), dann feinere Texturen aus `art.js`, dann optional HD-PNGs. Spätere Stufen überschreiben dabei die früheren Textur-Keys.
- **Keine** formale State Machine, kein Entity-Component-System. Spieler, Blöcke und Mechaniken sind einfache Objekte (Plain Objects), die die `GameScene` direkt bearbeitet.

---

## 2. Ist-Zustand & Kernmechaniken

### Umgesetzte Features

| Bereich | Status | Details |
|---|---|---|
| **Movement** | ✅ ausgereift | Beschleunigung/Bremsen am Boden und in der Luft, variable Sprunghöhe (Jump Cut), Coyote Time 90 ms, Jump Buffer 120 ms, max. Fallgeschwindigkeit |
| **Game Feel** | ✅ | Squash & Stretch, Staubwolken, Landeschatten, Atem-Animation, Screenshake, Konfetti |
| **Kollision** | ✅ | Arcade Physics; Kanten-Culling an Innenkanten (kein Hängenbleiben an Fugen); Einweg-Plattformen; **automatisches Freischieben** („Unstuck“), wenn jemand in einem erscheinenden Tor/einer Kiste steckt |
| **Koop** | ✅ | 2 Spieler lokal; Spieler kollidieren bewusst *nicht* miteinander; Kamera folgt dem Mittelpunkt; Spieler dürfen nicht weiter als eine Bildschirmbreite auseinander; Ziel erst erreicht, wenn **beide** dort sind |
| **Mechaniken** | ✅ 9 Typen | Bodenschalter (mit Besitzer 1/2/alle), Hebel (rastend), Farbtasten-Sequenz mit Anzeigetafel; Tor, Kisten-Brücke, Wasser ablassen, Aufzug (halten/pendeln, mit Quetschschutz), Zugbrücke, Förderband |
| **Schiebbare Blöcke** | ✅ | Kiste (1 Spieler), Felsbrocken 2×2 (nur zu zweit), drücken auch Schalter |
| **Gefahren** | ✅ | Wasser und Absturz → Respawn am persönlichen Checkpoint |
| **Sammelobjekte** | ✅ | Edelweiss mit Zähler, Bestwert pro Level (nur pro Sitzung) |
| **Level** | ✅ 5 Level | ASCII-Karten, jedes Level führt eine neue Mechanik ein |
| **Animationen** | ✅ | Spritesheet-Frames (4 Code-Frames bzw. 9 HD-Frames), Wasser-Animation, Tweens für Mechaniken |
| **Input** | ✅ | Tastatur (2 Belegungen) + Gamepad API (2 Controller), vereinheitlicht inkl. `justPressed/justReleased`; kurze Tipper gehen nicht verloren |
| **UI** | ✅ | HUD (Level, Spielerstatus, Edelweiss, Controller-Erkennung), Toasts, Infotafeln, Level-Intro-Banner, Dialogbox mit Porträts, Menü, SNES-Passwortsystem |
| **Audio** | ✅ | ~35 synthetisierte Effekte, 2 Melodien (Abspann, Happy Birthday), Stumm-Schaltung wird gespeichert |
| **Story/Finale** | ✅ | Intro-Dialog, Geburtstags-Finale mit Feuerwerk, Abspann |
| Speicherstand | ⚠️ teilweise | Nur Passwörter; Edelweiss-Ergebnisse gehen beim Neuladen verloren |
| Pause-Menü | ❌ | Nur ESC → Hauptmenü, R → Neustart |
| Gegner / Schaden / Leben | ❌ | Nicht vorhanden |
| Musik im Level | ❌ | Musik nur in Finale und Abspann |
| Optionen (Lautstärke, Tastenbelegung) | ❌ | – |

### Technische Besonderheiten

- **Keine externen Assets nötig:** Alle Grafiken und Sounds werden zur Laufzeit erzeugt. Das hält das Projekt winzig und portabel.
- **Personalisierung zentral:** Namen werden über Platzhalter (`{P1}`, `{COUSIN}` …) in alle Texte eingesetzt.
- **Deterministische Varianz:** Gras- und Erdkacheln wählen ihre Variante per Positions-Hash; Licht und Tiefe entstehen über Tinting.
- **Robustheit:** Quetschschutz bei Aufzügen, Block-Respawn nach einem Absturz, Freischieben nach dem Erscheinen von Geometrie.

---

## 3. Technische Schulden & Optimierungspotenziale

### Was gut ist

- **Konsequente, verständliche Dokumentation:** Jede Datei hat einen Kopfkommentar, die Level-Legende ist vollständig, die Kommentare erklären das *Warum*.
- **Klare Konfiguration:** Physik, Steuerung, Texte und Level sind sauber vom Code getrennt. Game-Designer können Level ohne Code-Kenntnisse bauen.
- **`input.js`, `dialog.js`, `sfx.js`** sind kleine, in sich geschlossene und wiederverwendbare Module.
- **Generisches Trigger/Target-System** statt Sonderlogik pro Level.
- Alle Dateien sind syntaktisch fehlerfrei (geprüft mit `node --check`).

### Refactoring-Bedarf (priorisiert)

| Prio | Thema | Befund | Empfehlung |
|---|---|---|---|
| **Hoch** | **God-Class `GameScene`** (1 397 Zeilen) | Levelaufbau, Spielersteuerung, 9 Mechanik-Typen, Blöcke, Unstuck, HUD, Effekte in einer Klasse | Aufteilen in z. B. `LevelBuilder`, `Player`, `MechanicsSystem`, `BlockSystem`, `Hud`, `Fx`. Kein Rewrite nötig, die Methoden sind schon gut gegliedert. |
| **Hoch** | **Mechanik-Typen als `if/else`-Ketten** | Wer einen neuen Ziel- oder Auslöser-Typ einführt, muss 4–5 Stellen ändern (`buildLevel`, `addTargetCell`, Erzeugung, `applyTargetState`, `updateTriggers`) | **Registry/Strategy-Pattern:** pro Typ ein Objekt mit `create / apply / update`, das unter seinem Namen registriert wird |
| **Hoch** | **Keine Versionskontrolle** | Projektordner ist kein Git-Repository | Vor allen Änderungen `git init` + Initial-Commit, damit jeder Schritt nachvollziehbar und umkehrbar ist |
| Mittel | **Spieleranzahl fest auf 2** | `updateCameraTarget` (`[a, b]`), `updateGoal` (`other`), `limitPlayerSpread` | Nur relevant, falls ein 1-Spieler-Modus kommen soll |
| Mittel | **Toter Code in `BootScene`** | ~250 Zeilen alte Texturen (`earth`, `grass`, `rock`, `water`, `door`, `crate`, `boulder`, `stone`, `cloud`, `mountains`, `hills` …), die `art.js` danach überschreibt oder die gar nicht benutzt werden | Entfernen; Figuren-Pixel-Art in eine eigene Datei (`characters.js`) auslagern |
| Mittel | **Fehlende Datei** | README verweist auf `generate-assets.html` (HD-PNG-Generator), die Datei existiert nicht | Datei wiederherstellen oder README anpassen; ohne sie lassen sich die PNGs nicht neu erzeugen |
| Mittel | **Offline-Fähigkeit** | Phaser und Schrift kommen vom CDN; ohne Internet startet das Spiel nicht | Phaser und Schrift lokal in `vendor/` ablegen |
| Niedrig | **Bug: doppelter Sound-Key** | `Sfx.presets.pop` ist zweimal definiert (`sfx.js` Z. 122 und 150), der zweite Eintrag überschreibt den ersten | Einen der beiden umbenennen |
| Niedrig | **Veraltete Texte nach Sprint 4** | `config.js`: Physik-Kommentar und Finale-Text erwähnen noch die „Räuberleiter“, die es nicht mehr gibt | Texte anpassen |
| Niedrig | **Hartcodierte UI-Texte** | Toasts und Meldungen stehen in der GameScene, nicht in `config.js` | Nur relevant, falls Mehrsprachigkeit geplant ist |
| Niedrig | **Förderband bewegt Spieler über `sprite.x +=`** | Umgeht die Physik; das Unstuck-System fängt Fehler zwar ab, sauber ist das aber nicht | Auf Geschwindigkeit bzw. Plattform-Mitnahme umstellen |

### Performance

Bei der aktuellen Grösse läuft das Spiel unkritisch, für grössere Level gibt es aber klares Potenzial:

- **Jede Geländekachel ist ein eigener statischer Physik-Körper plus Sprite.** Level 5 hat ≈ 1 460 feste Kacheln, Level 4 ≈ 1 320. Dazu kommen pro freier Kante Schatten- und Grasbilder und pro Grasbüschel ein eigener Endlos-Tween.
  → **Empfehlung:** Auf eine **Phaser-Tilemap** (`TilemapLayer` mit Kachel-Kollision) umstellen. Die ASCII-Karten bleiben dabei unverändert als Quelle erhalten. Das bringt deutlich weniger Draw Calls und Physik-Körper und ermöglicht grössere Level.
- **Effekte (Staub, Spritzer, Konfetti) erzeugen pro Partikel ein Image plus Tween.** Für das jetzige Volumen reicht das; Phaser-`ParticleEmitter` wären effizienter.
- `resolveStuck()` führt pro Frame `overlapRect`-Abfragen für alle Spieler und Blöcke aus. Bei wenigen Blöcken ist das unproblematisch.

---

## 4. Schnittstellen für Erweiterungen

| Erweiterung | Aufwand | Wie |
|---|---|---|
| **Neues Level** | 🟢 sehr gering | Objekt in `levels.js` anlegen: ASCII-Karte + Trigger/Targets + Passwort. Keine Code-Änderung nötig. |
| **Sound-Effekt** | 🟢 sehr gering | Rezept in `Sfx.presets` ergänzen, mit `Sfx.play(scene, 'name')` abspielen |
| **Melodie / Level-Musik** | 🟢 gering | Notenliste in `Sfx.songs`; `melody()` gibt `stop()` zurück. Für Hintergrundmusik im Level fehlt nur der Loop-Aufruf in der GameScene. |
| **Dialoge / Story** | 🟢 gering | Zeilen in `config.js`, `DialogBox` wiederverwenden; neue Sprecher in `SPEAKERS` |
| **Deko-Objekt** | 🟢 gering | Textur erzeugen + ein `case` im Karten-`switch` |
| **Neues Collectible** | 🟡 mittel | Neues Kartenzeichen, eigene Physik-Gruppe, Overlap-Handler, HUD-Zähler. Heute als Sonderfall für Edelweiss gebaut, sinnvoll wäre ein generischer Collectible-Typ |
| **Neuer Mechanik-Typ** (z. B. Federbrett, Ventilator, Zeitschalter) | 🟡 mittel | Das Signalsystem trägt das gut, allerdings müssen heute 4–5 Stellen angepasst werden. Mit der empfohlenen Registry wäre es ein einziges neues Modul. |
| **UI / Menüpunkte** (Optionen, Pause) | 🟡 mittel | Menü ist eine einfache Liste in `MenuScene`; Pause als Overlay-Szene (`scene.launch` + `scene.pause`) gut machbar |
| **Gegner** | 🟠 höher | Gibt es noch nicht. Es fehlen Gegner-Entity/KI, Schadens- und Treffer-Logik (Stampfen, Rückstoss, Unverwundbarkeit). Die vorhandene Respawn-/Checkpoint-Logik ist wiederverwendbar. **Empfehlung:** vorher die `GameScene` aufteilen und eine kleine Entity-Basis schaffen. |
| **Speicherstand** | 🟢 gering | `localStorage` wird schon für die Stummschaltung genutzt; Edelweiss-Bestwerte und freigeschaltete Level lassen sich analog speichern |
| **HD-Grafiken** | 🟡 mittel | Layout steht in `asset-layout.js`; der Generator fehlt aber (s. o.). Neue Frames brauchen Anpassungen am Layout und an `applyHdAssets()`. |

---

## Empfohlene nächste Schritte

1. **Fundament (klein, risikoarm):** Git-Repository anlegen, `generate-assets.html` klären, doppelten `pop`-Sound und veraltete Texte korrigieren, toten Code aus der BootScene entfernen.
2. **Refactoring GameScene:** Mechaniken in eine Typ-Registry überführen, Spieler/HUD/Effekte auslagern. Das Verhalten bleibt dabei identisch; danach jedes Level einmal durchspielen.
3. **Feature-Ausbau** nach Priorität der Projektleitung, z. B. Pause-Menü, Level-Musik, Speicherstand, neue Mechaniken, danach Gegner.
4. **Optional:** Tilemap-Umstellung (sobald grössere Level geplant sind), Offline-Fähigkeit durch lokale Phaser-Kopie.
