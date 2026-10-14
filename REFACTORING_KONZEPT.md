# Refactoring-Konzept: Modularisierung der GameScene

**Für:** Projektleitung (zur Freigabe)
**Von:** Lead Developer
**Stand:** 14.10.2026, Basis-Commit `862738e`

---

## Umsetzungsstand (14.10.2026): ✅ abgeschlossen

Alle 6 Stufen sind umgesetzt, je Stufe ein Commit auf `master`. Nach jeder Stufe hat der Replay-Test alle 5 Level **bitgenau identisch** zur Referenz (Stand `862738e` vor dem Refactoring) bestätigt. `GameScene.js` ist von 1 397 auf 141 Zeilen geschrumpft; das Spiel läuft weiterhin ohne Build-Schritt per Doppelklick.

Abweichungen vom Konzept (bewusst):
- **`js/game/constants.js`** zusätzlich: `DEPTH` und `SEQ_COLORS` werden von mehreren Modulen gebraucht.
- **Kein Event-Bus für Toasts:** In `create()` angemeldete Listener auf Szenen-Events bleiben bei einem Neustart der Szene (Taste R) bestehen und müssten jedes Mal manuell abgemeldet werden. Stattdessen rufen die Module die dünne Methode `scene.toast()` auf, die an das Hud weiterleitet – gleiche Entkopplung, weniger Fehlerquellen.
- **`tools/test-levels.js`** zusätzlich: prüft alle Level per LevelParser in Node, ohne Browser.
- Die Absturz-Prüfung („aus der Welt gefallen“) bleibt in der GameScene, weil sie auch nach dem Levelende läuft.

---

## 1. Ziel & Leitplanken

**Ziel:** `GameScene.js` (≈ 1 400 Zeilen) in klar abgegrenzte Module aufteilen, sodass neue Mechaniken, Collectibles und später Gegner jeweils in **einer** Datei entstehen, ohne Eingriffe quer durch die Szene.

**Leitplanken:**
- **Das Verhalten bleibt identisch.** Jeder Schritt ist ein reiner Umbau ohne neue Features. Spielgefühl, Physik-Werte und Level bleiben unverändert.
- **Kein Build-Schritt, keine ES-Module.** Das Spiel muss weiterhin per Doppelklick (`file://`) laufen. Neue Dateien werden wie bisher als klassische Scripts in `index.html` eingebunden.
- **Kein neues Framework, kein ECS.** Wir nutzen einfache Klassen und Objekte im Stil des bestehenden Codes.
- **Kleine Schritte:** pro Modul ein Commit, nach jedem Schritt ein automatischer Smoke-Test und ein kurzer manueller Durchlauf.

---

## 2. Ausgangslage: Was steckt heute in der GameScene?

| Verantwortung | heutige Methoden | ca. Zeilen |
|---|---|---|
| Level-Parsing & Aufbau | `buildLevel`, `styleTerrain`, `createWaterTile`, `addTargetCell`, `cellBounds`, `createGoal` | 300 |
| Mechaniken (Auslöser + Ziele) | `addTrigger`, `createSequences`, `addSequenceBoard`, `createLift/Drawbridge/Conveyor`, `updateTriggers`, `pressSequenceButton`, `updateTargets`, `applyTargetState`, `applyWaterLevel`, `applyDrawbridge`, `updateLifts`, `liftWouldCrush`, `updateConveyors`, `updateDrawbridgeChains` | 420 |
| Spieler | `createPlayers`, `updatePlayer`, `updateViews`, `respawn` | 150 |
| Schiebbare Blöcke | `createBlocks`, `updateBlocks`, `countPushers` | 100 |
| Kollision & Freischieben | `setupCollisions`, `isBlocking`, `embedding`, `freeOffset`, `unstick`, `resolveStuck` | 100 |
| Koop-Regeln, Kamera, Ziel | `setupCamera`, `updateCameraTarget`, `limitPlayerSpread`, `updateCheckpoints`, `updateGoal`, `completeLevel` | 110 |
| HUD & Texte | `createHud`, `updateHud`, `toast`, `showLevelIntro`, `updateInfoSigns` | 120 |
| Effekte | `createAtmosphere`, `puffDust`, `splash`, `confetti`, `collectFlower` | 100 |

**Hinweis zum Input Handling:** Das ist bereits sauber ausgelagert (`input.js` → `PlayerInput`). Die GameScene ruft pro Frame nur `input.update()` auf und liest abstrakte Aktionen (`left`, `justPressed('jump')`). Hier ist kein Umbau nötig.

---

## 3. Zielarchitektur

```
js/
  game/
    LevelParser.js        ASCII-Karte → reines Datenobjekt (ohne Phaser)
    LevelBuilder.js       Datenobjekt → Phaser-Objekte (Gelände, Wasser, Deko, Styling)
    Player.js             Klasse Player: Bewegung, Sprung, Animation, Squash/Stretch, Respawn
    BlockSystem.js        Schiebbare Kisten/Felsbrocken, Schieber zählen
    Unstuck.js            Feststecken erkennen & freischieben
    CoopRules.js          Kamera-Mittelpunkt, Abstandsgrenze, Checkpoints, Ziel
    Hud.js                HUD, Toasts, Level-Banner, Infotafeln
    Fx.js                 Staub, Spritzer, Konfetti, Atmosphäre
    mechanics/
      MechanicsSystem.js  Signal-Verteilung Auslöser → Ziele (Kern des Koop-Designs)
      triggers.js         Registry: plate, lever, button (+ sequence)
      targets.js          Registry: door, bridge, water, lift, drawbridge, conveyor
  scenes/
    GameScene.js          nur noch Orchestrierung (Ziel: ≈ 150–200 Zeilen)
```

### 3.1 LevelParser: Level Parsing
Wandelt `LEVELS[i]` in ein **reines Datenobjekt** um, ohne Abhängigkeit zu Phaser:

```js
LevelParser.parse(level) → {
  cols, rows, terrain: [{c, r, kind}], water: [...], spawns: {1, 2},
  triggers: [...], targetCells: {D: [{c, r}]}, sequences, checkpoints,
  collectibles: [{c, r, type: 'edelweiss'}], signs, blocks, goal, deco
}
```
**Nutzen:** Das Parsing lässt sich mit Node ohne Browser testen. Kartenfehler (unbekannte Zeichen, fehlender Startpunkt oder fehlendes Ziel, Trigger ohne Ziel) werden früh und verständlich gemeldet.

### 3.2 LevelBuilder: Aufbau & Darstellung
Erzeugt aus dem Datenobjekt die Phaser-Objekte und physikalischen Gruppen (`solids`, `oneWays`, `gates`, `hazards`, `collectibles`) und übernimmt das Gelände-Styling (Kanten-Culling, Tiefen-Tint, Graskanten). Wird später eine **Tilemap** eingeführt, ändert sich nur diese Datei.

### 3.3 Mechaniken: Registry statt if/else-Ketten
Der wichtigste Umbau. Heute verteilt sich jeder Mechanik-Typ auf 4–5 `if/else`-Zweige. Künftig ist jeder Typ ein eigenständiges Objekt:

```js
TARGET_TYPES.lift = {
  solid: false,                              // Zellen gehören nicht zum Gelände
  create(sys, group) { … },                  // Sprites & Physik anlegen
  apply(sys, group, active, instant) { … },  // Signal an/aus umsetzen
  update(sys, group, delta) { … }            // optional: pro Frame
};
```

`MechanicsSystem` übernimmt unverändert die heutige Signal-Logik (ein Ziel ist aktiv, sobald mindestens ein Auslöser aktiv ist) und ruft die Typen generisch auf. **Ein neuer Mechanik-Typ wie Federbrett, Ventilator oder Zeitschalter ist dann ein neuer Registry-Eintrag, ohne Änderung an GameScene oder MechanicsSystem.**

### 3.4 Player: Entity-Klasse
`class Player` kapselt Physik-Körper, sichtbare Figur, Schatten, Coyote Time und Jump Buffer, Animationen, Squash & Stretch und Respawn. Die Klasse liefert die Grundlage für spätere **Gegner** (gleiches Muster: `create / update / hit / respawn`).

### 3.5 Collision Handling: Kollisionen & Unstuck
- Die Collider-Verdrahtung wandert in den `LevelBuilder` (Gruppen) bzw. in eine kleine Funktion `setupCollisions(scene, groups, players, blocks)`.
- Die Freischieben-Logik (`embedding`, `freeOffset`, `unstick`, `resolveStuck`) wird zu `Unstuck.js`. Sie ist schon heute in sich geschlossen und wird von Mechaniken genutzt (Tor schliesst, Brücke erscheint).

### 3.6 Hud & Fx: Darstellung
- `Hud` stellt `toast()`, `showLevelIntro()`, `setHint()` und `update(players)` bereit.
- `Fx` stellt `dust()`, `splash()`, `confetti()` und `sparkle()` bereit.
- Die Systeme sprechen über **Szenen-Events** mit dem HUD (`this.events.emit('toast', …)`, `'collect'`, `'respawn'`). So müssen Mechaniken das HUD nicht kennen.

### 3.7 GameScene: Orchestrierung
Die Szene erstellt die Module und legt die **Update-Reihenfolge** fest, die heute implizit in `update()` steckt und für die Physik wichtig ist (Förderband addiert Geschwindigkeit *nach* den Blöcken usw.):

```js
update(time, delta) {
  this.inputs.forEach(i => i.update());
  if (!this.completed) {
    this.players.forEach(p => p.update(time, delta));
    this.coop.limitSpread();
    this.blocks.update(time);
    this.mechanics.update(delta);   // Förderbänder, Auslöser, Ziele, Aufzüge – Reihenfolge wie heute
    this.unstuck.resolve();
    this.coop.update();             // Checkpoints, Ziel
  }
  this.hud.update(this.players);
  this.coop.updateCamera();
  this.backdrop.update(this.cameras.main, this.level.worldHeight, delta);
}
```

---

## 4. Vorgehen (Reihenfolge nach Risiko)

| Schritt | Inhalt | Risiko |
|---|---|---|
| 0 | **Smoke-Test ins Repo** (`tools/smoke-test.html`): startet headless alle Level, das Finale und den Abspann und meldet JS-Fehler und fehlende Texturen. Bei den Quick-Fixes bereits erfolgreich eingesetzt. | – |
| 1 | `Fx.js` + `Hud.js` auslagern | niedrig |
| 2 | `Player.js` | mittel (Spielgefühl muss identisch bleiben) |
| 3 | `Unstuck.js` + `BlockSystem.js` | mittel |
| 4 | **Mechanik-Registry** (`mechanics/`) | mittel–hoch: grösster Nutzen, deshalb sorgfältig mit allen 5 Leveln testen |
| 5 | `LevelParser.js` + `LevelBuilder.js` | mittel |
| 6 | `CoopRules.js`, GameScene aufräumen, README/Architektur-Doku aktualisieren | niedrig |

Jeder Schritt endet mit einem eigenen Commit, einem Smoke-Test und einem manuellen Durchspielen der betroffenen Level. Ein Schritt lässt sich jederzeit einzeln per Git zurückrollen.

---

## 5. Bewusst nicht Teil dieses Schritts

- **Kein** Wechsel auf ES-Module oder einen Bundler (würde den Start per Doppelklick brechen)
- **Keine** Tilemap-Umstellung: wird durch den `LevelBuilder` vorbereitet, aber separat umgesetzt
- **Keine** neuen Features und keine Änderung an Leveln, Physik-Werten oder Texten
- `BootScene`/`art.js` (Grafik-Erzeugung) bleiben, wie sie sind

---

## 6. Ergebnis nach dem Refactoring

| Aufgabe | heute | danach |
|---|---|---|
| Neuer Mechanik-Typ | 4–5 Stellen in GameScene | 1 Registry-Eintrag |
| Neues Collectible | Sonderfall-Code an 4 Stellen | Typ in Parser + Eintrag im Collectible-Handler |
| Gegner einführen | kein Fundament | eigene Entity analog zu `Player` |
| Level-Fehler finden | erst beim Spielen | automatisch beim Parsen (auch ohne Browser testbar) |
| Grösste Datei | 1 400 Zeilen | ≈ 300 Zeilen (Mechaniken) |
