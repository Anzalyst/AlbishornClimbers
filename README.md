# Albishorn Climbers

Ein Koop-Plattformer für 2 Spieler im Stil der SNES-Klassiker (Phaser 3): Zwei Geschwister wandern von Ebertswil hinauf aufs Albishorn – ein Geburtstagsgeschenk zum 30.

Dazu gibt es die **Super Sempach Party**: Jessica gegen Simon in 5 Camping-Minispielen am Sempachersee (Pedalo-Power, Wasser-Marsch!, Grill-Meister, Camping-Rundkurs, Brennessel-Alarm!) mit Siegerehrung.

## Starten
- Einfach `index.html` per Doppelklick im Browser öffnen. Es braucht keinen Build, keinen Server und **kein Internet**: Phaser 3.80.1 (`js/lib/`) und die Schrift „Press Start 2P“ (`assets/fonts/`) liegen lokal im Projekt.
- Alternativ mit lokalem Server: `python -m http.server` und dann http://localhost:8000 öffnen.

## Konsolen-Betrieb (Linux-Mini-PC, offline)
Empfohlen ist Chromium im Kiosk-Modus:

```
chromium --kiosk --autoplay-policy=no-user-gesture-required --noerrdialogs --disable-features=Translate \
  file:///home/<benutzer>/AlbishornClimbers/index.html
```

- `--autoplay-policy=no-user-gesture-required` ist wichtig: Browser schalten den Ton sonst erst nach einem Tastendruck oder Mausklick frei. Ein Controller-Knopf zählt dafür nicht in jedem Browser.
- Chromium meldet Xbox- und PlayStation-Pads unter Linux mit Standard-Mapping. Firefox liefert dort je nach Treiber eine abweichende Tastenbelegung. Deshalb empfehle ich Chromium.
- Die Symbole ▶ ▼ ▲ ✔ enthält die Pixelschrift nicht. Sie kommen aus einer Systemschrift (z. B. `fonts-dejavu`, auf den meisten Distributionen vorinstalliert).

## Grafiken
Alle Sprites und Tile-Texturen werden beim Start in der `BootScene` dynamisch per Code erzeugt (Phaser Graphics- und Canvas-API):
- `js/scenes/BootScene.js`: Figuren und Porträts (als Pixel-Raster im Code), Schalter, Hebel, Fahnen, Edelweiss, Deko (Haus, Tanne, Restaurant, Turm)
- `js/art.js` (aufgerufen aus der BootScene): Gelände-Kacheln, Wasser, Kisten, Felsbrocken, Mechaniken (Aufzug, Förderband, Zugbrücke, Farbtasten) und der Parallax-Hintergrund

Neue Grafiken legt man dort als Textur mit einem eindeutigen Schlüssel an und verwendet sie im Spiel über diesen Schlüssel.

**Einzige Ausnahme:** das Victory-Bild der `EndScene` (`assets/images/endscreen.jpg`, 720×540). Per Doppelklick (`file://`) darf der Browser Bilddateien weder per XHR laden noch als WebGL-Textur nutzen. Deshalb wird das Bild als Base64 in `js/generated/endscreen-image.js` eingebettet und in der BootScene mit `textures.addBase64` angelegt. Nach einem Austausch des Bildes `node tools/embed-images.js` ausführen und die erzeugte Datei mitcommitten.

## Personalisierung & Sprache
**Albishorn Climbers ist komplett auf Züritüütsch** (Mundart). Die Super Sempach Party bleibt auf Hochdeutsch, nur Grill-Legende Peter Kammer redet Mundart.

Alle Namen und Texte stehen zentral:
- `js/config.js`
  - `CAST`: Jessica (Spielerin 1), Simon (Spieler 2), Sven, Tante Edith & Onkel Kurt (Svens Eltern), Angi (Svens Frau), Hannah (Svens Tochter in der Kraxe), Ginny (die getigerte Katze)
  - `CONSOLE`: KES – Kammer Entertainment Systems (Startlogo)
  - `STORY`: Intro-Dialog in Ebertswil (Tante Edith läuft mit Jessica voraus) und der Empfang auf dem Gipfel
  - `BIRTHDAY`: Glückwunsch-Nachricht im Finale
  - `CREDITS`: Abspann
- `js/texts.js`: alle Menüs, Anzeigen, Meldungen und Hinweise (`TXT`)
- `js/levels.js`: Levelnamen, Infotafeln, Anekdoten

Auf dem Gipfel und im Abspann ist die ganze Familie dabei: Jessica, Simon, Tante Edith, Onkel Kurt, Sven mit Hannah in der Kraxe, Angi und Katze Ginny. Die Figuren sind Pixel-Raster in `js/scenes/BootScene.js` (`PEOPLE`, `GINNY`).

In Infotafeln und Dialogen werden Platzhalter wie `{P1}`, `{P2}`, `{COUSIN}`, `{AUNT}`, `{UNCLE}`, `{PARENTS}`, `{PARTNER}`, `{DAUGHTER}` und `{CAT}` automatisch durch die Namen ersetzt.

## Ablauf
KES-Startlogo → **Spielauswahl** (Albishorn Climbers oder Super Sempach Party)

**Albishorn Climbers:** Menü → Intro mit Tante Edith & Onkel Kurt → Level 1–5 → Gipfel: Sven wartet am Aussichtsturm → Geburtstagsfeier → Abspann → „Danke fürs Spielen!“ (EndScene) → Menü

**Super Sempach Party:** SSP-Menü → *Party* (alle 5 Minispiele, dazwischen Zwischenstand) oder *Minispiel wählen* → Siegerehrung mit Podest, Pokal und Konfetti → SSP-Menü. Jedes Minispiel beginnt mit einer Karte, die Ziel und Steuerung erklärt, danach kommt der Countdown.

Aus **jedem** Spiel und Minispiel führt die Pause (`START` bzw. `ESC`) über „HAUPTMENÜ“ zurück zur Spielauswahl.

## Steuerung
| | Bewegen | Springen / A | Hebel | Aktion / B |
|---|---|---|---|---|
| Jessica (Spielerin 1) | A / D | Leertaste | W | E |
| Simon (Spieler 2) | ← / → | Enter | ↑ | Shift |
| Controller 1 / 2 | Linker Stick / D-Pad | A / Kreuz | Stick / D-Pad hoch | B / Kreis |

Der Aktions-Knopf (B) wird in den Sempach-Minispielen gebraucht (A/B-Wechseln beim Pedalo, Schild bei Brennessel-Alarm!). In Menüs bedeutet B „zurück“.

Tastatur: `ESC` / `P` = Pause, `R` = Level neu starten, `M` = Ton an/aus.
Controller: `START` / `OPTIONS` = Pausenmenü (Weiter, Neu starten, Ton, Hauptmenü). Tastatur und Controller funktionieren gleichzeitig. Das Spiel ist komplett ohne Tastatur bedienbar.

Spieler 1 bekommt den ersten verbundenen Controller, Spieler 2 den zweiten, egal in welchem Browser-Slot sie stecken. Controller werden erst nach dem ersten Tastendruck auf dem Pad erkannt (Browser-Regel).

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
index.html                 Einstieg, lädt Phaser + Scripts (alles lokal)
js/lib/                    Phaser 3.80.1 (phaser.min.js) + Lizenz
assets/fonts/              Schrift Press Start 2P (woff2) + Lizenz
js/config.js               Physik, Steuerung, Namen, Dialoge, Abspann
js/texts.js                Alle Bildschirmtexte von Albishorn Climbers (Züritüütsch)
js/levels.js               Alle Level als ASCII-Karten (Legende im Dateikopf)
js/input.js                Tastatur + Gamepad API → einheitliche Spieler-Eingabe
js/sfx.js                  Retro-Sounds & Melodien per Web Audio
js/dialog.js               Dialogbox mit Porträt & Schreibmaschinen-Text
js/art.js                  Gelände, Mechaniken, Parallax-Hintergrund & Licht ("Modern Pixel")
js/scenes/BootScene.js     Erzeugt alle Texturen zur Laufzeit (Figuren, Objekte, ruft art.js auf)
js/scenes/IntroScene.js    KES-Startlogo und Story-Intro in Ebertswil
js/scenes/MenuScene.js     Titel, Menü, Passwort-Eingabe
js/scenes/GameScene.js     Gameplay-Szene: erzeugt die Module aus js/game/ und taktet sie
js/scenes/PauseScene.js    Pausenmenü für alle Spiele (START/ESC/P): Weiter, Neustart, Ton, Hauptmenü
js/scenes/GameSelectScene.js  Hauptmenü: Wahl zwischen Albishorn Climbers und Super Sempach Party
js/scenes/VictoryScene.js  Level geschafft + nächstes Passwort
js/scenes/FinaleScene.js   Gipfel-Treffen mit Sven + Geburtstagsfeier
js/scenes/CreditsScene.js  Abspann
js/scenes/EndScene.js      Victory-Bild „Danke fürs Spielen!“ mit Konfetti & Sternen
assets/images/             Quelle des Victory-Bilds (endscreen.jpg)
js/generated/              Eingebettete Bilder (erzeugt von tools/embed-images.js)
js/game/LevelParser.js     ASCII-Karte → Datenobjekt, prüft die Leveldaten (ohne Phaser)
js/game/LevelBuilder.js    Datenobjekt → Gelände, Wasser, Deko, Collider
js/game/Player.js          Spielfigur: Bewegung, Sprung, Animation, Respawn
js/game/BlockSystem.js     Schiebbare Kisten & Felsbrocken
js/game/mechanics/         MechanicsSystem + Register triggers.js / targets.js
js/game/Unstuck.js         Feststecken erkennen & freischieben
js/game/CoopRules.js       Kamera, Spielerabstand, Checkpoints, Ziel
js/game/Hud.js, Fx.js      Anzeigen und visuelle Effekte
js/game/constants.js       Darstellungsebenen (DEPTH), Farbtasten-Farben
js/ssp/SspConfig.js        Super Sempach Party: Spieleliste, Party-Ablauf (SspParty), Sounds
js/ssp/sspArt.js           Code-Grafiken der Minispiele (Pedalo, Ente, Grill, Pokal …)
js/ssp/MinigameScene.js    Basisklasse: Intro-Karte, Countdown, HUD, Timer, Pause, Ergebnis
js/ssp/minigames/          Die 5 Minispiele (je eine Szene)
js/ssp/SspMenuScene.js     SSP-Menü (Party / Minispiel wählen)
js/ssp/SspScoreScene.js    Zwischenstand im Party-Modus
js/ssp/SspAwardScene.js    Siegerehrung mit Podest, Pokal und Konfetti
tools/                     Automatische Tests (nur für Entwickler, siehe unten)
```

## Neues Level bauen
In `js/levels.js` ein Objekt mit `map`, `password`, `triggers`, `targets` (und optional `sequences`, `anecdote`) anlegen – die Legende oben in der Datei erklärt alle Zeichen und Optionen.

- **Auslöser:** Bodenschalter (`plate`), Hebel (`lever`), Farbtasten (`button`, für eine Reihenfolge in `sequences`). Mit `owner: 1/2` legt man fest, wer einen Auslöser benutzen darf. Schalter ohne `owner` werden auch von Kisten und Felsbrocken gedrückt.
- **Ziele:** Tore (`door`), Kisten-Stufen (`bridge`), Wasser (`water`), Aufzüge (`lift`, hält oder pendelt), Zugbrücken (`drawbridge`), Förderbänder (`conveyor`).
- **Infotafeln** (`i` + `hints`) gibt es nur in Level 1. Die lustigen Kindheits-Erinnerungen stehen als `anecdote` in der Einblendung zum Levelstart.

Fehler in den Leveldaten (unbekannte Zeichen, fehlender Start/Ziel, Verweise auf unbekannte Ziele …) meldet der LevelParser als Warnung in der Browser-Konsole – oder ohne Browser mit `node tools/test-levels.js`.

## Neue Mechanik bauen
Jeder Mechanik-Typ ist ein Eintrag in einem Register, die GameScene muss dafür nicht angefasst werden:
- **Neuer Auslöser** (z. B. Zeitschalter): Eintrag in `TRIGGER_TYPES` (`js/game/mechanics/triggers.js`) mit `create(sys, trigger, cfg)` und `update(sys, trigger)`, der `trigger.active` setzt.
- **Neues Ziel** (z. B. Federbrett): Eintrag in `TARGET_TYPES` (`js/game/mechanics/targets.js`) mit `cell` / `create` / `apply` / `update` – die Bedeutung jeder Funktion steht im Dateikopf.
- Danach in `levels.js` verwenden (`{ type: '…' }` bzw. `{ kind: '…' }`) und eine Textur in `art.js` anlegen.
- Neue Script-Dateien in `index.html` vor `js/scenes/` eintragen.

## Automatische Tests
Für Entwickler (das Spiel selbst braucht weiterhin nur den Browser):

```
node tools/run-tests.js
```

Der Test braucht Node.js und einen installierten Chrome oder Edge. Er lädt das Spiel headless und spielt jedes Level mit festem Zeitschritt und festem Eingabe-Drehbuch durch (laufen, springen, alle Schalter/Hebel/Farbtasten, Kisten schieben, Zufallsphase, Ziel). Alle 10 Frames wird der Zustand aller Objekte als Prüfsumme mit `tools/golden.json` verglichen. Danach laufen Intro, Menü, Victory, Finale und Abspann kurz an, und simulierte Controller prüfen die Eingabe (Zuordnung, Bewegung, Sprung, Pausenmenü, Menü, Tastatur parallel). Für die Super Sempach Party spielen einfache Bots jedes Minispiel gegen einen untätigen Gegner (der Bot muss gewinnen, auf beiden Seiten), dazu ein kompletter Party-Durchlauf bis zur Siegerehrung, der freie Modus und die Pause im Minispiel. Der Testbrowser hat kein Netzwerk: Lädt das Spiel etwas von aussen nach oder fehlt die Schrift, schlägt der Test fehl. Vorab prüft `tools/test-levels.js` die Leveldaten. JS-Fehler, fehlende Texturen und Level-Probleme lassen den Test scheitern.

- Bei einer Abweichung zeigt `--dump <Level>:<Messpunkt>` den kompletten Zustand an dieser Stelle.
- `--gameplay` vergleicht nur den Spielablauf (ohne Texte und HUD). Damit lässt sich nach Übersetzungen oder Textänderungen beweisen, dass sich am Spiel selbst nichts geändert hat.
- Geprüft werden ausserdem: fehlende Texturen in jeder Szene, die ganze Familie auf dem Gipfel und im Abspann, und die Fairness bei Pedalo-Power (8 Zufalls-Layouts, ein Bot muss allen Enten ausweichen können).
- Ändert sich das Verhalten **absichtlich** (z. B. neue Level, andere Physik), die Referenz mit `--update-golden` neu schreiben und mitcommitten.

## Neues Sempach-Minispiel bauen
1. In `js/ssp/minigames/` eine Szene anlegen, die von `MinigameScene` erbt: `constructor() { super('SspMeinSpiel'); this.duration = 45; }`, dazu `setup()` (Aufbau) und `tick(dt)` (Logik). Am Ende `this.finish(1 | 2 | 0)` aufrufen. Ohne `duration` (Rennen) gewinnt, wer zuerst ankommt; mit `duration` gewinnt nach Ablauf der Zeit, wer mehr Punkte (`this.score`) hat.
2. In `SSP.minigames` (`js/ssp/SspConfig.js`) mit Name, Beschreibung und Steuerung eintragen. Damit erscheint es im Menü und in der Party.
3. Die Szene in `index.html` und `js/main.js` eintragen (vor `PauseScene`), Grafiken in `js/ssp/sspArt.js` anlegen.
4. Einen Bot in `tools/harness.js` (`SSP_BOTS`) ergänzen, damit der Test das Spiel automatisch durchspielt.
