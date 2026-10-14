/* =====================================================================
 * levels.js – Alle Level als ASCII-Karten
 *
 * Jedes Zeichen = eine Kachel (32×32 px). Zeilen dürfen unterschiedlich
 * lang sein, fehlende Zeichen gelten als Luft. So kann man Level direkt
 * im Texteditor bauen.
 *
 * LEGENDE
 *   ' '  Luft
 *   '#'  Erde (bekommt automatisch Gras, wenn oben frei ist)
 *   'R'  Fels (Felsbänder, Überhänge, kleine Stolpersteine)
 *   'o'  Bachstein (fest – liegt meist unter Wasser)
 *   '-'  Holzplattform (von unten durchspringbar)
 *   '~'  Wasser (Gefahr → Respawn am letzten Checkpoint)
 *   'k'  Holzkiste, schiebbar – schafft EIN Spieler allein
 *   'K'  Felsbrocken (2×2 Kacheln, Zeichen = linke untere Ecke),
 *        schiebbar – nur ZU ZWEIT (hintereinander schieben)
 *   '1'  Startpunkt Jessica        '2'  Startpunkt Simon
 *   'F'  Checkpoint-Fahne (pro Spieler)
 *   '*'  Edelweiss (Sammelobjekt)
 *   'i'  Infotafel – Texte aus "hints", von links nach rechts zugeordnet
 *        (nur in Level 1, wenn eine Grundmechanik neu ist)
 *   'G'  Ziel: Wegweiser "Richtung Albishorn"
 *   'H'  Haus (Deko)   'T'  Tanne (Deko)   'A'  Restaurant Albishorn (Deko)
 *
 * Die Spieler können NICHT aufeinander stehen – jede Höhe über 3 Kacheln
 * braucht eine Mechanik (Aufzug, Kiste, Brücke …).
 *
 * MECHANIK-ZEICHEN (frei wählbar, werden pro Level konfiguriert)
 *   triggers: Auslöser
 *     { type: 'plate', owner, targets }   Bodenschalter, aktiv solange jemand
 *                                         (oder ein Block, wenn ohne owner) draufsteht
 *     { type: 'lever', owner, targets }   Hebel, mit "Hoch" umlegen, bleibt umgelegt
 *     { type: 'button', color, group }    Farbtaste (red/blue/yellow) für eine Sequenz
 *     owner = 1 (Jessica) / 2 (Simon) / null (alle)
 *   sequences: { S: { order: ['red', …], targets, board: '%' } }
 *     Die Farbtasten der Gruppe müssen in dieser Reihenfolge gedrückt werden.
 *     Das Zeichen bei "board" zeigt die Reihenfolge als Tafel an.
 *   targets: Ziel-Kacheln – entweder als Text oder als Objekt mit Optionen:
 *     'door'                              Tor: öffnet bei Signal
 *     'bridge'                            Holzkisten: erscheinen bei Signal
 *     'water'                             Wasser: fliesst bei Signal ab
 *     { kind: 'lift', dy, dx, mode, speed }
 *        Plattform fährt um dx/dy Kacheln. mode 'hold' (Standard): fährt hin,
 *        solange das Signal an ist, sonst zurück. mode 'ferry': pendelt hin
 *        und her, solange das Signal an ist.
 *     { kind: 'drawbridge', pivot: 'left' | 'right' }
 *        Zugbrücke: senkt sich bei Signal, sonst hochgeklappt.
 *     { kind: 'conveyor', off, on }
 *        Förderband: Geschwindigkeit (px/s, + = rechts) ohne bzw. mit Signal.
 *   Ein Ziel ist aktiv, sobald MINDESTENS EIN Auslöser mit diesem Ziel aktiv ist.
 *
 * TEXTE
 *   hints     Infotafeln (nur Level 1)
 *   anecdote  Kindheits-Erinnerung, erscheint beim Levelstart
 *   Platzhalter {P1} {P2} {COUSIN} {AUNT} {UNCLE} {PARENTS} → Namen aus config.js
 * ===================================================================== */

const LEVELS = [
  // -------------------------------------------------------------------
  // LEVEL 1 – Der Start in Ebertswil (Einführung)
  // Jessica hält den Bodenschalter → Tor im Felsband öffnet sich →
  // Simon geht durch und legt dahinter den Hebel um → Tor bleibt offen.
  // -------------------------------------------------------------------
  {
    name: 'De Start z Ebertswil',
    password: '1291',
    sky: [0x8ccbf0, 0xe4f3fb],
    anecdote: '{PARENTS} händ behauptet: "Es isch nüme wiit!" – Das isch glogge gsi.',
    triggers: {
      P: { type: 'plate', owner: 1, targets: ['D'] },
      L: { type: 'lever', owner: null, targets: ['D'] }
    },
    targets: { D: 'door' },
    hints: [
      'Willkomme z Ebertswil! {P1}: A/D + LEERTASCHTE. {P2}: Pfiil + ENTER. Ihr chömed nume zäme as Ziil!',
      'Es Felsband! {P1}: Stell di uf de BLAU Schalter – solang du druf stahsch, isch s Tor offe.',
      'En Hebel leit mer mit UFE um. {P2}: Dä Hebel hebt s Tor für immer offe.'
    ],
    map: [
      '                                                          RR',
      '                                                          RR',
      '                                                          RR',
      '                                                          RR',
      '                                                          RR',
      '                                                          RR                          *',
      '                                                          RR                                      T     G    T',
      '                                                          RR                          --       #################',
      '                                                          RR    *      L  F   T                #################',
      '                                              *           RR    --  #################    #######################',
      '                                             ---          DD        #################~~~~#######################',
      '                                                          DD     ####################~~~~#######################',
      '                                 **         T    i     P  DD  i  ###############################################',
      '                                          ######################################################################',
      '                           T          F   ######################################################################',
      '                        ########    ############################################################################',
      '   1 2  H  i  T   H     ########~~~~############################################################################',
      '################################~~~~############################################################################',
      '################################################################################################################',
      '################################################################################################################'
    ]
  },

  // -------------------------------------------------------------------
  // LEVEL 2 – Der steile Waldaufstieg
  //  1) Holzkiste allein an die Stufe schieben.
  //  2) Felsbrocken ZU ZWEIT an die 5er-Felswand schieben → Treppenstufe.
  //  3) Zweiten Felsbrocken auf den Schalter schieben → Kiste erscheint
  //     als Stufe über die Felsrippe (und bleibt, weil der Brocken liegt).
  // -------------------------------------------------------------------
  {
    name: 'De stotzig Waldufstieg',
    password: '3842',
    sky: [0x9fd8cc, 0xeefaf4],
    anecdote: 'Für de {UNCLE} isch das do "nume es chliises Hügeli". S Vermässigsamt seit: Nei.',
    triggers: {
      P: { type: 'plate', owner: null, targets: ['B'] }
    },
    targets: { B: 'bridge' },
    map: [
      '',
      '',
      '                                                                  RR                *',
      '                                                                  RR               ---',
      '                                                          *       RR   F  T       T      G    T',
      '                                                                 BRR############################',
      '                                             *                    RR############################',
      '                                            ---     R  K        P RR############################',
      '                                                   #############################################',
      '                                    F  T      T    #############################################',
      '                                 ###############################################################',
      '                             *   ###############################################################',
      '                                 ###############################################################',
      '                                 ###############################################################',
      '                    TF R  K      ###############################################################',
      '                  ##############################################################################',
      '                  ##############################################################################',
      '                  ##############################################################################',
      '  1 2    T     k  ##############################################################################',
      '################################################################################################',
      '################################################################################################',
      '################################################################################################'
    ]
  },

  // -------------------------------------------------------------------
  // LEVEL 3 – Der Bachlauf
  //  Bach 1: Wer auf dem Schalter steht, lässt das Wasser ab – der andere
  //          hüpft über die Steine und legt drüben den Hebel um.
  //  Bach 2: Die Schleuse liegt auf einem hohen Brett. Einer hält den
  //          Schalter Q, damit der Aufzug den anderen hinauffährt.
  // -------------------------------------------------------------------
  {
    name: 'De Bachlauf',
    password: '7156',
    sky: [0xa4d4f2, 0xf2f9ff],
    anecdote: 'Wer nassi Füess überchunnt, dörf glich NÖD umchehre. – Underschribe: {AUNT}',
    triggers: {
      P: { type: 'plate', owner: null, targets: ['W'] },
      L: { type: 'lever', owner: null, targets: ['W'] },
      Q: { type: 'plate', owner: null, targets: ['E'] },
      M: { type: 'lever', owner: null, targets: ['V'] }
    },
    targets: {
      W: 'water',
      V: 'water',
      E: { kind: 'lift', dy: -4, speed: 90 }
    },
    map: [
      '',
      '',
      '',
      '',
      '',
      '',
      '                                       *',
      '                                        M                                    *',
      '                                      ----                                  ---',
      '',
      '                                                                                    G    T',
      '                     *   *                           *                   ###################',
      '  1 2    T   P                LF Q  EE     T                    F     T  ###################',
      '###############WWWWWWWWWWWWWW################VVVVVVVVVVVVVVVVVV#############################',
      '###############WWooWWooWWooWW################VVooVVooVVooVVooVV#############################',
      '###############~~~~~~~~~~~~~~################~~~~~~~~~~~~~~~~~~#############################',
      '############################################################################################',
      '############################################################################################',
      '############################################################################################',
      '############################################################################################'
    ]
  },

  // -------------------------------------------------------------------
  // LEVEL 4 – Die Felswand (vertikal)
  //  Stufe 1: Schalter P unten hält den Aufzug oben → einer fährt hoch.
  //           Oben holt Schalter C den Aufzug für den zweiten hoch.
  //  Stufe 2: Farbtasten in der Reihenfolge der Tafel drücken →
  //           die Pendel-Plattform U fährt zum nächsten Felsband.
  //  Stufe 3: Zugbrücke: Einer hält Schalter X, der andere läuft hinüber
  //           und sichert die Brücke mit Hebel Y für den Partner.
  // -------------------------------------------------------------------
  {
    name: 'D Felswand',
    password: '2468',
    sky: [0xb0d8f4, 0xfff2de],
    anecdote: '"Lueged doch emal di schöni Ussicht aa!" – D Ussicht: e Felswand.',
    triggers: {
      P: { type: 'plate', owner: null, targets: ['E'] },
      C: { type: 'plate', owner: null, targets: ['E'] },
      r: { type: 'button', color: 'red', group: 'S' },
      b: { type: 'button', color: 'blue', group: 'S' },
      y: { type: 'button', color: 'yellow', group: 'S' },
      X: { type: 'plate', owner: null, targets: ['Z'] },
      Y: { type: 'lever', owner: null, targets: ['Z'] }
    },
    sequences: {
      S: { order: ['blue', 'red', 'yellow'], targets: ['U'], board: '%' }
    },
    targets: {
      E: { kind: 'lift', dy: -5, speed: 100 },
      U: { kind: 'lift', dy: -7, mode: 'ferry', speed: 80 },
      Z: { kind: 'drawbridge', pivot: 'left' }
    },
    map: [
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRR                                   *',
      'RRRRRRRRRRRRRRRR                    F   T   X           Y T G  T',
      'RRRRRRRRRRRRRRRR                  ##############ZZZZZZ##########',
      'RRRRRRRRRRRRRRRR                  ##############      ##########',
      'RRRRRRRRRRRRRRRR                  ##############      ##########',
      'RRRRRRRRRRRRRRRR                 *##############      ##########',
      'RRRRRRRRRRRRRRRR           *      ##############      ##########',
      '                                  ##############      ##########',
      '                  yC  r  %  b F   ##############      ##########',
      '                ################UU##############      ##########',
      '                ################  ##############      ##########',
      '                ################################      ##########',
      '                ################################      ##########',
      '       *        ################################      ##########',
      '   1 2   P    EE################################      ##########',
      '################################################      ##########',
      '################################################      ##########',
      '################################################      ##########'
    ]
  },

  // -------------------------------------------------------------------
  // LEVEL 5 – Gipfelsturm Albishorn (Finale)
  //  Felsbrocken → Bach (Jessicas Schalter + Hebel) → Felsband mit Tor
  //  (Simons Schalter + Hebel) → Förderband: läuft normal rückwärts.
  //  Simon hält Schalter X → Band läuft zur Gipfelwand, Jessica bringt die
  //  Kiste hin, klettert hoch und stellt das Band mit Hebel Y dauerhaft um.
  // -------------------------------------------------------------------
  {
    name: 'Gipfelsturm Albishorn',
    password: '0909',
    sky: [0xf4b07a, 0xffe9cc],
    anecdote: 'Fascht obe! (Dasmal stimmts würkli. Ehrlich. Vertraued eus.)',
    triggers: {
      P: { type: 'plate', owner: 1, targets: ['W'] },
      L: { type: 'lever', owner: null, targets: ['W'] },
      Q: { type: 'plate', owner: 2, targets: ['D'] },
      N: { type: 'lever', owner: null, targets: ['D'] },
      X: { type: 'plate', owner: 2, targets: ['C'] },
      Y: { type: 'lever', owner: null, targets: ['C'] }
    },
    targets: {
      W: 'water',
      D: 'door',
      C: { kind: 'conveyor', off: -90, on: 80 }
    },
    map: [
      '                                                                              RR',
      '                                                                              RR',
      '                                                                              RR',
      '                                                                              RR',
      '                                                                              RR                                      *',
      '                                                                              RR                                     ---',
      '                                                                              RR',
      '                                                                              RR                        Y  F  T        T      A        T     G     T',
      '                                                                              RR                     #################################################',
      '                                                                              DD              *      #################################################',
      '                                                       *   *                  DD                     #################################################',
      '                                     F  T     P                  L F      Q   DD T N XF  k           #################################################',
      '                                   ##############WWWWWWWWWWWWWW#########################CCCCCCCCCCCCC#################################################',
      '                                   ##############WWooWWooWWooWW#######################################################################################',
      '                            *      ##############~~~~~~~~~~~~~~#######################################################################################',
      '                                   ###################################################################################################################',
      '                  FR   K           ###################################################################################################################',
      '                ######################################################################################################################################',
      '  1 2     T  H  ######################################################################################################################################',
      '######################################################################################################################################################',
      '######################################################################################################################################################',
      '######################################################################################################################################################'
    ]
  }
];
