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

**Einzige Ausnahme:** die Bilder in `assets/images/loading/` – das Victory-Bild der `EndScene` (`endscreen.jpg`, 720×540) und die Pixel-Art-Familienbilder. Per Doppelklick (`file://`) darf der Browser Bilddateien weder per XHR laden noch als WebGL-Textur nutzen. Deshalb werden sie mit `node tools/embed-images.js` als Base64 in `js/generated/` eingebettet und in der BootScene mit `textures.addBase64` angelegt. Nach einem Austausch eines Bildes das Script ausführen und die erzeugten Dateien mitcommitten.

**Ladebildschirme (Dia-Show):** Vor jedem Level (also auch nach jedem bestandenen Level), vor jedem Sempach-Minispiel und nach dem letzten Minispiel vor der Siegerehrung zeigt die `LoadingScene` ein zufälliges Familienbild (512×384 = 4:3, im Dia-Rahmen), darunter die KES-Textbox (schwarz, gelbe Kontur) mit einem Spruch auf Züritüütsch und einen Ladebalken, auf dem Ginny mitläuft („LADET…“). Nach 4 s blendet die Szene weich aus; A / Sprung, START oder ENTER überspringt sofort. Die Bilder werden nie zweimal hintereinander gezeigt: Erst kommen alle einmal dran, dann wird neu gemischt.

**Bildergalerie:** Im Hauptmenü (Spielauswahl) führt „BILDERGALLERIE“ (Runter, dann A / ENTER) zur `GalleryScene`: dieselben Bilder gross, darunter der Spruch; Links/Rechts blättert, B / ESC führt zurück.
- Originale: `assets/images/loading/` (Pixel-Art, 4:3 bzw. breiter)
- `node tools/embed-images.js` schneidet mittig auf 4:3 zu und verkleinert auf 512×384 (im Canvas eines headless Chrome/Edge, ohne npm-Paket). Ergebnis: `js/generated/loading-images.js` (JPEG als Base64). Mit `--preview <Ordner>` werden die verkleinerten Bilder zusätzlich abgelegt.
- Die Zuordnung Datei → Schlüssel steht in `SLIDES` im Script, die Sprüche (und die Reihenfolge der Galerie) in `TXT.loadingSlides` (`js/texts.js`). Für ein neues Bild: Datei ablegen, in `SLIDES` eintragen, Spruch mit gleichem Schlüssel ergänzen, Script ausführen.

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

**Albishorn Climbers:** Menü → Intro mit Tante Edith & Onkel Kurt → Level 1–5 (vor jedem Level ein Ladebildschirm mit Familienfoto) → Gipfel: Sven wartet am Aussichtsturm → Geburtstagsfeier → Abspann → „Danke fürs Spielen!“ (EndScene) → Menü

**Super Sempach Party:** SSP-Menü → *Party* (alle 5 Minispiele, dazwischen Zwischenstand; vor jedem Minispiel der Ladebildschirm) oder *Minispiel wählen* → Siegerehrung mit Podest, Pokal und Konfetti → SSP-Menü. Jedes Minispiel beginnt mit einer Karte, die Ziel und Steuerung erklärt, danach kommt der Countdown.

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
| Level | Code | Neue Mechanik | Geschicklichkeit |
|---|---|---|---|
| 1 Der Start in Ebertswil | 1291 | Schalter + Tor + Hebel (mit Infotafeln) | Bröckel-Brättli über dem Weiher |
| 2 Der steile Waldaufstieg | 3842 | Kisten & Felsbrocken schieben (Brocken nur zu zweit) | Türlersee mit treibenden Baumstämmen, Waldschaukeln über der Schlucht |
| 3 Der Bachlauf | 7156 | Wasserstand absenken, Aufzug per Schalter | Wacklige Bachsteine (einzelne Bröckel-Platten) |
| 4 Die Felswand | 2468 | Aufzug mit zwei Schaltern, Farbtasten-Reihenfolge + Pendel-Plattform, Zugbrücke | Steinschlag-Treppe mit Ausweich-Nischen |
| 5 Gipfelsturm Albishorn | 0909 | Alles kombiniert + Förderband mit Kiste → Geburtstags-Finale | Schlucht: Bröckel-Platten → Pendel → Bröckel-Platten |

**Chopfnüss** – zwei optionale, schwerere Rätsel-Level (Menüpunkt *CHOPFNÜSS* oder Passwort). Sie gehören nicht zur Geschichte: Nach Level 5 kommt weiterhin direkt die Gipfelfeier.

| Chopfnuss | Code | Rätsel |
|---|---|---|
| 1 S Farbeschloss | 4711 | Zeitschalter-Tor (4 s), UND-Tor (beide Hebel gleichzeitig, je 5 s, Simons Hebel weit weg), verdecktes Farbeschloss: Reihenfolge als Rätsel auf der Infotafel, Blau/Grün nur Jessica, Gelb/Rot nur Simon, 12 s Zeitlimit |
| 2 D Waag vom Albis | 2525 | Waage mit Kiste, Sandsack-Schalter und Zeithebel (proportional: 2 Kacheln pro Gewicht), zweite Waage mit Gleichgewichts-Lämpli und Zeittor |

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
js/scenes/GameSelectScene.js  Hauptmenü: Albishorn Climbers, Super Sempach Party oder Bildergalerie
js/scenes/VictoryScene.js  Level geschafft + nächstes Passwort
js/scenes/FinaleScene.js   Gipfel-Treffen mit Sven + Geburtstagsfeier
js/scenes/CreditsScene.js  Abspann
js/scenes/EndScene.js      Victory-Bild „Danke fürs Spielen!“ mit Konfetti & Sternen
js/scenes/LoadingScene.js  Ladebildschirm: Dia-Show mit Familienbildern, Spruch, Ginny auf dem Ladebalken
js/scenes/GalleryScene.js  Bildergalerie: Familienbilder mit Sprüchen durchblättern
assets/images/loading/     Quellen: Victory-Bild (endscreen.jpg) und Familienbilder (Ladebildschirm, Galerie)
js/generated/              Eingebettete Bilder (tools/embed-images.js)
js/game/LevelParser.js     ASCII-Karte → Datenobjekt, prüft die Leveldaten (ohne Phaser)
js/game/LevelBuilder.js    Datenobjekt → Gelände, Wasser, Deko, Collider
js/game/Player.js          Spielfigur: Bewegung, Sprung, Animation, Respawn
js/game/BlockSystem.js     Schiebbare Kisten & Felsbrocken
js/game/mechanics/         MechanicsSystem + Register triggers.js / targets.js
js/game/obstacles/         ObstacleSystem + Register obstacles.js (Bröckel, Pendel, Stämme, Steinschlag)
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

- **Auslöser:** Bodenschalter (`plate`), Hebel (`lever`), Farbtasten (`button`, rot/blau/gelb/grün, für eine Reihenfolge in `sequences`), Waagen-Lämpli (`scale`). Mit `owner: 1/2` legt man fest, wer einen Auslöser benutzen darf (auch bei Farbtasten). Schalter ohne `owner` werden auch von Kisten und Felsbrocken gedrückt.
- **Zeitschalter:** `timer: 5` an einem Auslöser → er bleibt nur 5 Sekunden aktiv (Bodenschalter und Lämpli: ab dem Loslassen). Ein Ring mit Sekunden zählt über dem Schalter und beim Ziel herunter, es tickt, in den letzten 3 Sekunden schneller.
- **Farbeschloss:** `sequences: { S: { order, targets, board, hidden: true, timeLimit: 12 } }` – falscher Knopf = Fehler-Sound und alles zurück; `hidden` zeigt auf der Tafel nur "?", `timeLimit` startet ab dem ersten Treffer eine Uhr.
- **Ziele:** Tore (`door`), Kisten-Stufen (`bridge`), Wasser (`water`), Aufzüge (`lift`, hält oder pendelt), Zugbrücken (`drawbridge`), Förderbänder (`conveyor`), Waagen (`balance`: zwei verbundene Schalen, proportional zum Gewichts-Unterschied, optional mit Sandsack). Mit `all: true` braucht ein Ziel ALLE seine Auslöser gleichzeitig (UND statt ODER).
- **Hindernisse** (immer aktiv, Geschicklichkeit statt Rätsel): `=` Bröckel-Plattform, `&` Pendel-Aufhängung, `>`/`<` Baumstamm-Quelle über Wasser, `@` Steinschlag-Höhle. Feintuning pro Level mit `obstacles: { '&': { period: 3200 } }` – alle Optionen stehen in der Legende von `levels.js`.
- **Infotafeln** (`i` + `hints`) gibt es in Level 1 und in den Chopfnüss. Die lustigen Kindheits-Erinnerungen stehen als `anecdote` in der Einblendung zum Levelstart.
- **Bonus-Level:** `bonus: true`, am Ende der Liste – sie erscheinen als "CHOPFNUSS n".

Fehler in den Leveldaten (unbekannte Zeichen, fehlender Start/Ziel, Verweise auf unbekannte Ziele …) meldet der LevelParser als Warnung in der Browser-Konsole – oder ohne Browser mit `node tools/test-levels.js`.

## Neue Mechanik bauen
Jeder Mechanik-Typ ist ein Eintrag in einem Register, die GameScene muss dafür nicht angefasst werden:
- **Neuer Auslöser** (z. B. Waagen-Lämpli): Eintrag in `TRIGGER_TYPES` (`js/game/mechanics/triggers.js`) mit `create(sys, trigger, cfg)` und `update(sys, trigger)`, der `trigger.active` setzt.
- **Neues Hindernis** (z. B. Feder-Trampolin): Eintrag in `OBSTACLE_TYPES` (`js/game/obstacles/obstacles.js`) mit `create` / `update` / `render` und ein Kartenzeichen in `OBSTACLE_CHARS` + `LevelParser.CHAR_KINDS`.
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
- **Hindernis-Test** (`tools/harness-puzzles.js`): Bots überwinden jeden neuen Abschnitt in Level 1–5 mit echten Sprüngen (beide Figuren) und prüfen: Bröckel-Platten sacken weg und kommen wieder, Baumstämme nehmen mit und gehen am Ende unter, Wasser → Checkpoint, Pendel-Schwung beim Absprung, Figuren stehen stabil auf Pendel und Stamm (kein Rutschen, kein Durchfallen), das Pendel folgt exakt seiner Formel, Felsbrocken drehen sich passend zur Rollstrecke und rollen über die Nischen, Treffer → Checkpoint, die Fels-Schwelle hält die Brocken auf. Pendel, Stämme und Level 2/5 laufen zusätzlich mit unregelmässiger Bildrate wie auf einem 50/75-Hz-Fernseher (0–2 Physik-Schritte pro Bild).
- **Rätsel-Test** (`tools/harness-puzzles.js`): Zwei Bots lösen beide Chopfnüss nur mit normalen Eingaben (laufen, springen, Hebel/Knöpfe) bis ins Ziel und prüfen dabei jede Mechanik: Countdown und Ticken, Tor zu nach Ablauf, UND-Tor, falsche Reihenfolge/Zeitlimit beim Farbeschloss, Waage proportional, Gleichgewichts-Lämpli, Ablauf Victory → nächste Chopfnuss → Menü.
- **Ladebildschirm-Test**: alle 6 Familienbilder eingebettet (512×384) und jedes mit Spruch; Level geschafft → Victory → Dia-Show → nächstes Level; Bild, Spruch, Ginny und „LADET…“ sichtbar; nach ~4 s weich ausgeblendet; A / Sprung, START und ENTER überspringen sofort; zufällige Reihenfolge ohne direkte Wiederholung; Menü/Passwort, Intro und Sempach-Minispiele laufen über den Ladebildschirm, ebenso der Weg vom letzten Minispiel zur Siegerehrung; Menüs, Zwischenstand und Galerie nicht.
- **Galerie-Test**: Hauptmenü → Runter wählt BILDERGALLERIE (Hoch zurück zur letzten Karte) → A bzw. ENTER öffnet die Galerie; Rechts blättert durch alle 6 Bilder (mit Spruch), am Ende wieder von vorne, Links zurück; B bzw. ESC → Hauptmenü.
- Geprüft werden ausserdem: fehlende Texturen in jeder Szene, die ganze Familie auf dem Gipfel und im Abspann, und die Fairness bei Pedalo-Power (8 Zufalls-Layouts, ein Bot muss allen Enten ausweichen können).
- Ändert sich das Verhalten **absichtlich** (z. B. neue Level, andere Physik), die Referenz mit `--update-golden` neu schreiben und mitcommitten.

## Neues Sempach-Minispiel bauen
1. In `js/ssp/minigames/` eine Szene anlegen, die von `MinigameScene` erbt: `constructor() { super('SspMeinSpiel'); this.duration = 45; }`, dazu `setup()` (Aufbau) und `tick(dt)` (Logik). Am Ende `this.finish(1 | 2 | 0)` aufrufen. Ohne `duration` (Rennen) gewinnt, wer zuerst ankommt; mit `duration` gewinnt nach Ablauf der Zeit, wer mehr Punkte (`this.score`) hat.
2. In `SSP.minigames` (`js/ssp/SspConfig.js`) mit Name, Beschreibung und Steuerung eintragen. Damit erscheint es im Menü und in der Party.
3. Die Szene in `index.html` und `js/main.js` eintragen (vor `PauseScene`), Grafiken in `js/ssp/sspArt.js` anlegen.
4. Einen Bot in `tools/harness.js` (`SSP_BOTS`) ergänzen, damit der Test das Spiel automatisch durchspielt.
