# Albishorn Climbers

Ein Koop-Plattformer für 2 Spieler im Stil der SNES-Klassiker (Phaser 3): Zwei Geschwister wandern von Ebertswil hinauf aufs Albishorn – ein Geburtstagsgeschenk zum 30.

## Starten
- Einfach `index.html` per Doppelklick im Browser öffnen. Es braucht keinen Build und keinen Server, nur Internet für Phaser und die Schrift vom CDN.
- Alternativ mit lokalem Server: `python -m http.server` und dann http://localhost:8000 öffnen.

## Grafiken
Das Spiel verwendet **keine Bilddateien**. Alle Sprites und Tile-Texturen werden beim Start in der `BootScene` dynamisch per Code erzeugt (Phaser Graphics- und Canvas-API):
- `js/scenes/BootScene.js`: Figuren und Porträts (als Pixel-Raster im Code), Schalter, Hebel, Fahnen, Edelweiss, Deko (Haus, Tanne, Restaurant, Turm)
- `js/art.js` (aufgerufen aus der BootScene): Gelände-Kacheln, Wasser, Kisten, Felsbrocken, Mechaniken (Aufzug, Förderband, Zugbrücke, Farbtasten) und der Parallax-Hintergrund

Neue Grafiken legt man dort als Textur mit einem eindeutigen Schlüssel an und verwendet sie im Spiel über diesen Schlüssel.

## Personalisierung
Alle Namen und Texte stehen zentral in `js/config.js`:
- `CAST`: Jessica (Spielerin 1), Simon (Spieler 2), Sven, Tante Edith & Onkel Kurt
- `CONSOLE`: KES – Kammer Entertainment Systems (Startlogo)
- `STORY`: Intro-Dialog in Ebertswil und Svens Gipfel-Gruss
- `BIRTHDAY`: Glückwunsch-Nachricht im Finale
- `CREDITS`: Abspann

In Infotafeln und Dialogen werden Platzhalter wie `{P1}`, `{P2}`, `{COUSIN}`, `{AUNT}`, `{UNCLE}` und `{PARENTS}` automatisch durch die Namen ersetzt.

## Ablauf
KES-Startlogo → Menü → Intro mit Tante Edith & Onkel Kurt → Level 1–5 → Gipfel: Sven wartet am Aussichtsturm → Geburtstagsfeier → Abspann

## Steuerung
| | Bewegen | Springen | Hebel |
|---|---|---|---|
| Jessica (Spielerin 1) | A / D | Leertaste | W |
| Simon (Spieler 2) | ← / → | Enter | ↑ |
| Controller 1 / 2 | Linker Stick / D-Pad | A / Kreuz | Stick hoch |

`ESC` = Menü, `R` = Level neu starten, `M` = Ton an/aus. Controller werden erst nach dem ersten Tastendruck auf dem Pad erkannt (Browser-Regel).

## Level & Passwörter
| Level | Code | Neue Mechanik |
|---|---|---|
| 1 Der Start in Ebertswil | 1291 | Schalter + Tor + Hebel (mit Infotafeln) |
| 2 Der steile Waldaufstieg | 3842 | Kisten & Felsbrocken schieben (Brocken nur zu zweit) |
| 3 Der Bachlauf | 7156 | Wasserstand absenken, Aufzug per Schalter |
| 4 Die Felswand | 2468 | Aufzug mit zwei Schaltern, Farbtasten-Reihenfolge + Pendel-Plattform, Zugbrücke |
| 5 Gipfelsturm Albishorn | 0909 | Alles kombiniert + Förderband mit Kiste → Geburtstags-Finale |

Die beiden Figuren können **nicht** aufeinander stehen – jede Höhe über 3 Kacheln wird mit einer Mechanik gelöst. Steckt jemand in einer erscheinenden Kiste, Brücke oder einem Tor fest, wird er automatisch an die nächste freie Stelle geschoben.

Geheim-Code **3030** springt direkt zur Geburtstagsfeier.

## Projektstruktur
```
index.html                 Einstieg, lädt Phaser + Scripts
js/config.js               Physik, Steuerung, Namen, Dialoge, Abspann
js/levels.js               Alle Level als ASCII-Karten (Legende im Dateikopf)
js/input.js                Tastatur + Gamepad API → einheitliche Spieler-Eingabe
js/sfx.js                  Retro-Sounds & Melodien per Web Audio
js/dialog.js               Dialogbox mit Porträt & Schreibmaschinen-Text
js/art.js                  Gelände, Mechaniken, Parallax-Hintergrund & Licht ("Modern Pixel")
js/scenes/BootScene.js     Erzeugt alle Texturen zur Laufzeit (Figuren, Objekte, ruft art.js auf)
js/scenes/IntroScene.js    KES-Startlogo und Story-Intro in Ebertswil
js/scenes/MenuScene.js     Titel, Menü, Passwort-Eingabe
js/scenes/GameScene.js     Gameplay: Level-Aufbau, Physik, Koop-Mechaniken, HUD
js/scenes/VictoryScene.js  Level geschafft + nächstes Passwort
js/scenes/FinaleScene.js   Gipfel-Treffen mit Sven + Geburtstagsfeier
js/scenes/CreditsScene.js  Abspann
```

## Neues Level bauen
In `js/levels.js` ein Objekt mit `map`, `password`, `triggers`, `targets` (und optional `sequences`, `anecdote`) anlegen – die Legende oben in der Datei erklärt alle Zeichen und Optionen.

- **Auslöser:** Bodenschalter (`plate`), Hebel (`lever`), Farbtasten (`button`, für eine Reihenfolge in `sequences`). Mit `owner: 1/2` legt man fest, wer einen Auslöser benutzen darf. Schalter ohne `owner` werden auch von Kisten und Felsbrocken gedrückt.
- **Ziele:** Tore (`door`), Kisten-Stufen (`bridge`), Wasser (`water`), Aufzüge (`lift`, hält oder pendelt), Zugbrücken (`drawbridge`), Förderbänder (`conveyor`).
- **Infotafeln** (`i` + `hints`) gibt es nur in Level 1. Die lustigen Kindheits-Erinnerungen stehen als `anecdote` in der Einblendung zum Levelstart.
