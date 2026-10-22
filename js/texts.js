/* =====================================================================
 * texts.js – Alle Bildschirmtexte von Albishorn Climbers auf Züritüütsch
 *
 * Menüs, Anzeigen, Meldungen ("Toasts") und Hinweise. Story-Dialoge,
 * Geburtstags-Nachricht und Abspann stehen in config.js, Levelnamen,
 * Infotafeln und Anekdoten in levels.js – ebenfalls in Mundart.
 * (Die Super Sempach Party bleibt auf Hochdeutsch.)
 *
 * "GUMP" = Sprung-Taste (Leertaste / Enter / Controller A).
 * Platzhalter wie {name} werden im Code ersetzt.
 * ===================================================================== */

const TXT = {
  // Startbildschirm der Konsole & Intro
  powerOn: 'DRÜCK E TASCHTE ZUM IISCHALTE',
  skipIntro: 'ESC = ÜBERSPRINGE',
  signpost: 'Albishorn 1h30',

  // Titelmenü
  menuSubtitle: 'Vo Ebertswil ufe ufs Albishorn',
  menuItems: ['SPIIL STARTE', 'PASSWORT', 'CHOPFNÜSS', 'HAUPTMENÜ'],
  passwordTitle: 'PASSWORT IIGÄ',
  passwordHelp: 'GUMP = OK   ESC = ZRUGG',
  passwordSecret: 'PSST … E ÜBERRASCHIG!',
  passwordWrong: 'FALSCHS PASSWORT!',
  footerKeys1: 'WASD + LEERTASCHTE',
  footerKeys2: 'PFIIL + ENTER',
  soundOffHint: 'M = TON US',
  soundIsOff: 'TON US (M)',

  // Im Level
  level: 'LEVEL',
  bonusLevel: 'CHOPFNUSS',
  hudKeys: 'ESC/START Pause  R Nomal  M Ton',
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
    help: 'GUMP = OK   START = WIITER'
  },

  // Level geschafft
  victoryTitle: 'LEVEL GSCHAFFT!',
  victoryAll: 'ALLI GFUNDE!',
  victoryPrompt: 'GUMP = WIITER   ESC / B = MENÜ',
  victoryPassword: 'PASSWORT FÜR {label}',
  bonusTitle: 'CHOPFNUSS GKNACKT!',
  bonusAllDone: 'ALLI CHOPFNÜSS GKNACKT!\nIhr sind es Superteam!',
  victoryWriteDown: 'Guet ufschriibe!',

  // Ladebildschirm (Familienbilder, LoadingScene) – Reihenfolge = Bildergalerie
  loading: 'LADET',
  loadingChill: 'CHILL MAL EN MOMENT',
  loadingSkip: 'A / ENTER = WIITER',
  loadingSlides: {
    dreck: 'CHILL MAL... FRÜENER HÄT MER AU DÖRFE IM DRÄCK SPIELE UND D ELTERE HÄND NÖD GRAD D KRISE BECHO!',
    muetze: 'DE SPILER 2, WENN SIE IRGENDWO RUNTERFÄLLT...',
    clowns: 'AM CAMPING-FESTIVAL GITS AMIGS AU KULTURELLES... BITTE GEDULD!',
    hochzeit: 'BEVOR S ABENTÜÜR GESTARTET ISCH... DAHINDE STECKED D GRÜNDER!',
    badewanne: 'NACH EM WANDERE GITS NUR EIS: AB ID WANNE!',
    kinderwagen: 'ZWEI-SPIELER-MODUS VOR EINIGE JAHRE... NO OHNE CONTROLLER!'
  },

  // Bildergalerie im Hauptmenü (GalleryScene)
  galleryMenu: 'BILDERGALLERIE',
  galleryCount: 'BILD {n} / {all}',
  galleryPrompt: '< > = BLÄTTERE     B / ESC = ZRUGG',

  // Finale, Abspann, Endbild
  finaleTitle: 'HAPPY BIRTHDAY!',
  finaleGreeting: 'Alles Gueti zum {age}. Geburtstag,\n{who}!',
  finaleGreetingFallback: 'ihr zwöi Gipfelstürmer',
  finaleEdelweiss: 'Edelwiiss gsammlet: {got} / {all}',
  finalePrompt: 'GUMP = ABSPANN',
  creditsEnd: 'ÄNDI',
  creditsPrompt: 'GUMP = WIITER',
  endPrompt: 'GUMP = HAUPTMENÜ'
};

/** Text mit Platzhaltern füllen: tx('Wart uf {name}!', { name: 'Simon' }). */
function tx(text, values = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));
}
