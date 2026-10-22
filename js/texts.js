/* =====================================================================
 * texts.js – Alle Bildschirmtexte von Albishorn Climbers auf Züritüütsch
 *
 * Menüs, Anzeigen, Meldungen ("Toasts") und Hinweise. Story-Dialoge,
 * Geburtstags-Nachricht und Abspann stehen in config.js, Levelnamen,
 * Infotafeln und Anekdoten in levels.js – ebenfalls in Mundart.
 * (Die Super Sempach Party bleibt auf Hochdeutsch.)
 *
 * Bedienhinweise nennen NUR Controller-Knöpfe (A, B, START, Steuerkreuz) –
 * die Konsole wird mit Controllern gespielt. Die Tastatur funktioniert
 * weiterhin (zum Testen), wird aber nirgends angezeigt.
 * Platzhalter wie {name} werden im Code ersetzt.
 * ===================================================================== */

const TXT = {
  // Startbildschirm der Konsole & Intro
  powerOn: 'DRÜCK E TASCHTE ZUM IISCHALTE',
  skipIntro: 'START = ÜBERSPRINGE',
  signpost: 'Albishorn 1h30',

  // Titelmenü
  menuSubtitle: 'Vo Ebertswil ufe ufs Albishorn',
  menuItems: ['SPIIL STARTE', 'PASSWORT', 'CHOPFNÜSS', 'HAUPTMENÜ'],
  passwordTitle: 'PASSWORT IIGÄ',
  passwordHelp: '▲▼ = AVATAR   ◀▶ = STELL   A = OK   B = ZRUGG',
  passwordSecret: 'PSST … E ÜBERRASCHIG!',
  passwordWrong: 'FALSCHS PASSWORT!',
  passwordCredits: 'MIAU! … AB ZUM ABSPANN!',
  konamiCredits: 'GEHEIMCODE! AB ZUM ABSPANN!',
  footerKeys1: 'CONTROLLER 1',
  footerKeys2: 'CONTROLLER 2',
  soundOffHint: 'TON AA',
  soundIsOff: 'TON US',

  // Im Level
  level: 'LEVEL',
  bonusLevel: 'CHOPFNUSS',
  hudKeys: 'START = PAUSE',
  atGoal: '✔ AM ZIIL',
  passwordLabel: 'Passwort',
  goalSign: 'ZIIL',
  goalBoard: 'Albishorn',
  soundOn: 'Ton aa',
  soundOff: 'Ton us',
  levelDone: 'GSCHAFFT!',
  checkpoint: 'Checkpoint für {name}!',
  waitFor: 'Wart uf {name}!',
  onlyFor: 'Nume {name}!',
  tooHeavy: 'Z SCHWÄR!\nZU ZWÖIT!',
  blockBack: 'De Brocke isch wieder do!',
  leverOn: 'Hebel umgleit!',
  leverOff: 'Hebel zruggstellt',
  seqRight: 'Richtigi Reihefolg!',
  seqWrong: 'Falschi Reihefolg!',
  seqClock: 'D Uhr lauft: {s} Sekunde!',
  seqTimeout: 'Z langsam! Nomal vo vorne.',
  timeUp: 'Ziit abgloffe!',
  andPartial: '{n} vo {m} – de Rescht au, gschwind!',
  ballastDown: 'De Sandsack gaht abe!',
  balanced: 'Gliichgwicht!',
  boulderHit: 'Steischlag – autsch!',
  ballastUp: 'De Sandsack gaht ufe!',
  doorOpen: 'S Tor isch offe!',
  doorClose: 'S Tor gaht zue …',
  bridgeReady: 'D Chischte stönd parat!',
  waterDown: 'S Wasser gaht zrugg!',
  waterUp: 'Obacht, s Wasser stiigt!',
  drawbridgeDown: 'D Brugg gaht abe!',
  drawbridgeUp: 'D Brugg klappt ufe!',
  beltRight: 'S Band lauft nach rächts!',
  beltLeft: 'S Band lauft nach links!',
  beltStop: 'S Band staht still.',

  // Pausenmenü (nur im Albishorn-Level)
  pause: {
    title: 'PAUSE', resume: 'WIITER', restart: 'NOMAL VO VORNE',
    soundOn: 'TON: AA', soundOff: 'TON: US', mainMenu: 'HAUPTMENÜ',
    help: 'A = OK   START = WIITER'
  },

  // Level geschafft
  victoryTitle: 'LEVEL GSCHAFFT!',
  victoryAll: 'ALLI GFUNDE!',
  victoryPrompt: 'A = WIITER   B = MENÜ',
  victoryPassword: 'PASSWORT FÜR {label}',
  bonusTitle: 'CHOPFNUSS GKNACKT!',
  bonusAllDone: 'ALLI CHOPFNÜSS GKNACKT!\nIhr sind es Superteam!',
  victoryWriteDown: 'Guet ufschriibe!',

  // Ladebildschirm (Familienbilder, LoadingScene) – Reihenfolge = Bildergalerie
  loading: 'LADET',
  loadingChill: 'CHILL MAL EN MOMENT',
  loadingSkip: 'A = WIITER',
  loadingSlides: {
    dreck: 'CHILL MAL... FRÜENER HÄT MER AU DÖRFE IM DRÄCK SPIELE UND D ELTERE HÄND NÖD GRAD D KRISE BECHO!',
    muetze: 'DE SPILER 2, WENN SIE IRGENDWO ABEGHEIT...',
    clowns: 'AM CAMPING-FESTIVAL GITS AMIGS AU KULTURELLES... BITTE GEDULD!',
    hochzeit: 'BEVOR S ABENTÜÜR GESTARTET ISCH... DAHINDE STECKED D GRÜNDER!',
    badewanne: 'NACH EM WANDERE GITS NUR EIS: AB ID WANNE!',
    kinderwagen: 'ZWEI-SPIELER-MODUS VOR EINIGE JAHRE... NO OHNE CONTROLLER!'
  },

  // Gedenken an Kurt & Peter: Bildunterschrift des Gedenkbilds (letztes Bild
  // der Galerie) und hervorgehobener Abschnitt im Abspann-Lauftext
  memorial: 'In liebevoller Erinnerig an Kurt & Peter. Ihr sind immer Teil vo üsem Abentüür!',
  memorialRoll: ['In liebevoller Erinnerig an', 'KURT & PETER', 'Ihr sind immer Teil vo üsem Abentüür!'],

  // Bildergalerie im Hauptmenü (GalleryScene)
  galleryMenu: 'BILDERGALLERIE',
  galleryCount: 'BILD {n} / {all}',
  galleryPrompt: '◀ ▶ = BLÄTTERE     B = ZRUGG',

  // Finale, Abspann, Endbild
  finaleTitle: 'HAPPY BIRTHDAY!',
  finaleGreeting: 'Alles Gueti zum {age}. Geburtstag,\n{who}!',
  finaleGreetingFallback: 'ihr zwöi Gipfelstürmer',
  finaleEdelweiss: 'Edelwiiss gsammlet: {got} / {all}',
  finalePrompt: 'A = ABSPANN',
  creditsEnd: 'ÄNDI',
  creditsPrompt: 'A = WIITER',
  endPrompt: 'A = HAUPTMENÜ'
};

/** Text mit Platzhaltern füllen: tx('Wart uf {name}!', { name: 'Simon' }). */
function tx(text, values = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));
}
