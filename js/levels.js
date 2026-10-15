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
 * GESCHICKLICHKEITS-HINDERNISSE (js/game/obstacles/, laufen immer)
 *   '='  Bröckel-Plattform: wackelt beim Betreten, sackt nach 1 s weg,
 *        ist nach 4 s wieder da (nur von oben fest)
 *   '&'  Pendel-Aufhängung: darunter schwingt eine Plattform (2 Kacheln breit).
 *        Wer abspringt, nimmt den Schwung mit.
 *   '>'  '<'  Baumstamm-Quelle in der Luftzeile direkt über Wasser: Stämme
 *        treiben nach rechts bzw. links bis ans Ende des Wassers und gehen dort
 *        unter. Mitfahren ist erlaubt – ins Wasser fallen nicht.
 *   '@'  Steinschlag-Höhle: lässt regelmässig Felsbrocken rollen (Standard:
 *        nach links). Ausweichen: drüberspringen oder in eine 1 Kachel tiefe
 *        Nische ducken. Brocken zerbrechen an jeder Wand ab 1 Kachel Höhe.
 *   Einstellungen pro Level: obstacles: { '&': { length, angle, period, width,
 *   phase }, '>': { speed, interval, length }, '@': { dir, speed, interval,
 *   warn, first }, '=': { delay, respawn } } – Listen gelten der Reihe nach.
 *
 * Die Spieler können NICHT aufeinander stehen – jede Höhe über 3 Kacheln
 * braucht eine Mechanik (Aufzug, Kiste, Brücke …).
 *
 * MECHANIK-ZEICHEN (frei wählbar, werden pro Level konfiguriert)
 *   triggers: Auslöser
 *     { type: 'plate', owner, targets }   Bodenschalter, aktiv solange jemand
 *                                         (oder ein Block, wenn ohne owner) draufsteht
 *     { type: 'lever', owner, targets }   Hebel, mit "Hoch" umlegen, bleibt umgelegt
 *     { type: 'button', color, group }    Farbtaste (red/blue/yellow/green) für eine Sequenz
 *     { type: 'scale', pan, min, targets } Waagen-Lämpli: aktiv, solange die Waage der
 *                                         Schale "pan" im Gleichgewicht steht und auf
 *                                         jeder Seite mindestens "min" Gewicht liegt
 *     owner = 1 (Jessica) / 2 (Simon) / null (alle) – gilt auch für Farbtasten
 *     timer = Sekunden → Zeitschalter: bleibt nach dem Betätigen (Bodenschalter:
 *             nach dem Verlassen) nur so lange aktiv, mit Countdown-Ring & Ticken
 *   sequences: { S: { order: ['red', …], targets, board: '%', hidden, timeLimit } }
 *     Die Farbtasten der Gruppe müssen in dieser Reihenfolge gedrückt werden,
 *     ein falscher Knopf setzt alles zurück. Das Zeichen bei "board" zeigt die
 *     Reihenfolge als Tafel an – mit hidden: true nur als "?" (die Lösung
 *     steht dann z. B. als Rätsel auf einer Infotafel). timeLimit = Sekunden
 *     ab dem ersten richtigen Knopf.
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
 *     { kind: 'balance', partner, travel, perWeight, speed, ballast }
 *        Waage: zwei verbundene Schalen (Partner = { kind: 'balance' }). Sinkt
 *        die eine, steigt die andere gleich viel – perWeight Kacheln pro
 *        Gewichts-Unterschied, höchstens travel. Spieler/Kiste = 1, Brocken = 2.
 *        ballast: Sandsack über der Schale, Signal = Sandsack ablassen.
 *   Ein Ziel ist aktiv, sobald MINDESTENS EIN Auslöser mit diesem Ziel aktiv ist,
 *   mit { all: true } erst, wenn ALLE seine Auslöser gleichzeitig aktiv sind.
 *
 * CHOPFNÜSS (Bonus-Level): bonus: true, stehen am Ende der Liste.
 *
 * TEXTE
 *   hints     Infotafeln (Level 1 und Chopfnüss)
 *   anecdote  Kindheits-Erinnerung, erscheint beim Levelstart
 *   Platzhalter {P1} {P2} {COUSIN} {AUNT} {UNCLE} {PARENTS} → Namen aus config.js
 * ===================================================================== */

const LEVELS = [
  // -------------------------------------------------------------------
  // LEVEL 1 – Der Start in Ebertswil (Einführung)
  // Jessica hält den Bodenschalter → Tor im Felsband öffnet sich →
  // Simon geht durch und legt dahinter den Hebel um → Tor bleibt offen.
  // NEU: Bröckel-Brättli über dem Weiher (Infotafel erklärt sie).
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
      'Bröckel-Brättli! Wänn öpper druf staht, wackled si – und nach 1 Sekunde gheied si abe. Schnäll wiiter! Nach es paar Sekunde sind si wieder do.',
      'Es Felsband! {P1}: Stell di uf de BLAU Schalter – solang du druf stahsch, isch s Tor offe.',
      'En Hebel leit mer mit UFE um. {P2}: Dä Hebel hebt s Tor für immer offe.'
    ],
    map: [
      '                                                                      RR',
      '                                                                      RR',
      '                                                                      RR',
      '                                                                      RR',
      '                                                                      RR',
      '                                                                      RR                          *',
      '                                                                      RR                                      T     G    T',
      '                                                                      RR                          --       #################',
      '                                                                      RR    *      L  F   T                #################',
      '                                                          *           RR    --  #################    #######################',
      '                                                         ---          DD        #################~~~~#######################',
      '                                                                      DD     ####################~~~~#######################',
      '                                             **         T    i     P  DD  i  ###############################################',
      '                                                      ######################################################################',
      '                          *            T          F   ######################################################################',
      '                                    ########    ############################################################################',
      '   1 2  H  i  T   H  i  == ==       ########~~~~############################################################################',
      '#######################~~~~~~~##############~~~~############################################################################',
      '#######################~~~~~~~##############################################################################################',
      '############################################################################################################################'
    ]
  },

  // -------------------------------------------------------------------
  // LEVEL 2 – Der steile Waldaufstieg
  //  1) Holzkiste allein an die Stufe schieben.
  //  2) Felsbrocken ZU ZWEIT an die 5er-Felswand schieben → Treppenstufe.
  //  3) Zweiten Felsbrocken auf den Schalter schieben → Kiste erscheint
  //     als Stufe über die Felsrippe (und bleibt, weil der Brocken liegt).
  // NEU: Türlersee – auf treibenden Baumstämmen übers Wasser (gleich nach
  //      dem Start), und Waldschaukeln über der Schlucht vor dem Ziel.
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
    obstacles: {
      '>': { speed: 60, interval: 2600 },
      '&': { length: 4.5, angle: 32, period: 2800 }
    },
    map: [
      '                                                                                                          &    &',
      '',
      '                                                                                  RR                *',
      '                                                                                  RR               ---      *',
      '                                                                          *       RR   F  T       T                    G    T',
      '                                                                                 BRR###################            ###########',
      '                                                             *                    RR###################            ###########',
      '                                                            ---     R  K        P RR###################            ###########',
      '                                                                   ####################################            ###########',
      '                                                    F  T      T    ####################################            ###########',
      '                                                 ######################################################            ###########',
      '                                             *   ######################################################            ###########',
      '                                                 ######################################################            ###########',
      '                                                 ######################################################            ###########',
      '                                    TF R  K      ######################################################            ###########',
      '                   *              #####################################################################            ###########',
      '                                  #####################################################################            ###########',
      '                                  #####################################################################            ###########',
      '  1 2    T   >                 k  #####################################################################            ###########',
      '#############~~~~~~~~~~~~##############################################################################            ###########',
      '#############~~~~~~~~~~~~##############################################################################            ###########',
      '#######################################################################################################            ###########'
    ]
  },

  // -------------------------------------------------------------------
  // LEVEL 3 – Der Bachlauf
  //  Bach 1: Wer auf dem Schalter steht, lässt das Wasser ab – der andere
  //          hüpft über die Steine und legt drüben den Hebel um.
  //  Bach 2: Die Schleuse liegt auf einem hohen Brett. Einer hält den
  //          Schalter Q, damit der Aufzug den anderen hinauffährt.
  // NEU: Wacklige Bachsteine (einzelne Bröckel-Platten) vor dem Ziel.
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
      '                                        M                                                   *',
      '                                      ----                                                 ---',
      '',
      '                                                                           *                       G    T',
      '                     *   *                           *                                  ###################',
      '  1 2    T   P                LF Q  EE     T                    F      =  =  = =     T  ###################',
      '###############WWWWWWWWWWWWWW################VVVVVVVVVVVVVVVVVV#######~~~~~~~~~~~##########################',
      '###############WWooWWooWWooWW################VVooVVooVVooVVooVV#######~~~~~~~~~~~##########################',
      '###############~~~~~~~~~~~~~~################~~~~~~~~~~~~~~~~~~############################################',
      '###########################################################################################################',
      '###########################################################################################################',
      '###########################################################################################################',
      '###########################################################################################################'
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
  // NEU: Steinschlag-Treppe vor dem Ziel: Unter dem Felsdach rollen
  //      Brocken die Stufen herunter → drüberspringen oder in die Nischen.
  //      Die Fels-Schwelle unten (2 Kacheln hoch) hält sie auf – Brücke,
  //      Schalter und Checkpoint bleiben sicher.
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
    obstacles: {
      '@': { dir: -1, speed: 140, interval: 3600, warn: 900 }
    },
    map: [
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR                                   @',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRR                              RRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR                                              RRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR                                            *',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR                                          ########',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR                                       # ##########',
      'RRRRRRRRRRRRRRRR                                                    ################',
      'RRRRRRRRRRRRRRRR                                   *        R    # ##################',
      'RRRRRRRRRRRRRRRR                    F   T   X           Y TFR ########################  G  T',
      'RRRRRRRRRRRRRRRR                  ##############ZZZZZZ######################################',
      'RRRRRRRRRRRRRRRR                  ##############      ######################################',
      'RRRRRRRRRRRRRRRR                  ##############      ######################################',
      'RRRRRRRRRRRRRRRR                 *##############      ######################################',
      'RRRRRRRRRRRRRRRR           *      ##############      ######################################',
      '                                  ##############      ######################################',
      '                  yC  r  %  b F   ##############      ######################################',
      '                ################UU##############      ######################################',
      '                ################  ##############      ######################################',
      '                ################################      ######################################',
      '                ################################      ######################################',
      '       *        ################################      ######################################',
      '   1 2   P    EE################################      ######################################',
      '################################################      ######################################',
      '################################################      ######################################',
      '################################################      ######################################'
    ]
  },

  // -------------------------------------------------------------------
  // LEVEL 5 – Gipfelsturm Albishorn (Finale)
  //  Felsbrocken → Bach (Jessicas Schalter + Hebel) → Felsband mit Tor
  //  (Simons Schalter + Hebel) → Förderband: läuft normal rückwärts.
  //  Simon hält Schalter X → Band läuft zur Gipfelwand, Jessica bringt die
  //  Kiste hin, klettert hoch und stellt das Band mit Hebel Y dauerhaft um.
  // NEU: Gleich nach dem Start eine Schlucht: Bröckel-Platten → Pendel →
  //      Bröckel-Platten.
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
    obstacles: {
      '&': { length: 4.5, angle: 32, period: 3200 }
    },
    map: [
      '                                                                                              RR',
      '                                                                                              RR',
      '                                                                                              RR',
      '                                                                                              RR',
      '                                                                                              RR                                      *',
      '                                                                                              RR                                     ---',
      '                                                                                              RR',
      '                                                                                              RR                        Y  F  T        T      A        T     G     T',
      '                                                                                              RR                     #################################################',
      '                                                                                              DD              *      #################################################',
      '                                                                       *   *                  DD                     #################################################',
      '                                                     F  T     P                  L F      Q   DD T N XF  k           #################################################',
      '                                                   ##############WWWWWWWWWWWWWW#########################CCCCCCCCCCCCC#################################################',
      '             &                                     ##############WWooWWooWWooWW#######################################################################################',
      '                                            *      ##############~~~~~~~~~~~~~~#######################################################################################',
      '                                                   ###################################################################################################################',
      '           *                      FR   K           ###################################################################################################################',
      '                                ######################################################################################################################################',
      '  1 2   ==       ==       T  H  ######################################################################################################################################',
      '#######              #################################################################################################################################################',
      '#######              #################################################################################################################################################',
      '#######              #################################################################################################################################################'
    ]
  },

  // ===================================================================
  // CHOPFNÜSS – zwei optionale Rätsel-Level (Menü "CHOPFNÜSS" oder Passwort).
  // Sie gehören nicht zur Geschichte: nach Level 5 kommt weiterhin direkt
  // die Gipfelfeier. Erkennbar an "bonus: true" – sie müssen am Schluss stehen.
  // ===================================================================

  // -------------------------------------------------------------------
  // CHOPFNUSS 1 – S Farbeschloss
  //  A) Zeitschalter: Hebel L hält das Tor nur 4 Sekunden offen → rennen!
  //  B) UND-Tor E: Jessicas Hebel j UND Simons Hebel s (je 5 s) müssen
  //     gleichzeitig laufen. Simons Hebel steht weit weg auf dem Felsband →
  //     gleichzeitig ziehen ("3 – 2 – 1 – jetzt!") und sofort losrennen.
  //  C) Verdecktes Farbeschloss: Die Tafel zeigt nur "????", die Reihenfolge
  //     steht als Rätsel auf der Infotafel (Himmel, Sonne, Wiese, Fahne =
  //     Blau, Gelb, Grün, Rot). Blau & Grün darf nur Jessica drücken, Gelb &
  //     Rot nur Simon → abwechselnd, und alles innert 12 Sekunden.
  // -------------------------------------------------------------------
  {
    name: 'S Farbeschloss',
    bonus: true,
    password: '4711',
    sky: [0xb8a8e8, 0xfdf0ff],
    anecdote: '{UNCLE}: "Das isch kei Rätsel, das isch Logik!" – {AUNT}: "Dänn lös dus doch!"',
    triggers: {
      L: { type: 'lever', owner: null, timer: 4, targets: ['D'] },
      s: { type: 'lever', owner: 2, timer: 5, targets: ['E'] },
      j: { type: 'lever', owner: 1, timer: 5, targets: ['E'] },
      b: { type: 'button', color: 'blue', group: 'S', owner: 1 },
      g: { type: 'button', color: 'green', group: 'S', owner: 1 },
      r: { type: 'button', color: 'red', group: 'S', owner: 2 },
      y: { type: 'button', color: 'yellow', group: 'S', owner: 2 }
    },
    sequences: {
      S: { order: ['blue', 'yellow', 'green', 'red'], targets: ['Q'], board: '%', hidden: true, timeLimit: 12 }
    },
    targets: {
      D: 'door',
      E: { kind: 'door', all: true },
      Q: 'door'
    },
    hints: [
      'Dä Hebel hät e STOPPUHR: S Tor blibt nume 4 Sekunde offe. Hebel zieh – und RÄNNE!',
      'Zwei Hebel, eis Tor: Es gaht nume uf, solang BEIDI Uhre laufed. {P2}s Hebel isch wiit weg … zellt zäme: 3 – 2 – 1 – JETZ!',
      'S FARBESCHLOSS: Zerscht de Himmel überem Albis, dänn d Sunne, wo drab lacht, dänn d Wiese under eune Füess – und zletscht d Farb, wo s wiisse Chrüz drin staht. Jede druckt nume sini Chnöpf – und d Uhr lauft!'
    ],
    map: [
      '                    RR                            RR                                      RR',
      '                    RR                            RR                                      RR',
      '                    RR                            RR                                      RR',
      '                    RR                            RR                                      RR',
      '                    RR                            RR                                      RR',
      '                    RR                            RR                                      RR',
      '                    RR                            RR                                      RR',
      '                    RR                            RR                                      RR',
      '                    RR      *                     RR                                      RR',
      '                    RR                            RR                                      RR',
      '                    RR       s                    RR                                      RR',
      '              *     RR     RRRRR                  RR                                      RR',
      '                    DD     RRRRR                  EE                     *                QQ',
      '              R     DD    RRRRRRR                 EE                                      QQ',
      'T 1 2 i L     R     DD F RRRRRRRRR i  T      j    EE F i  %   b    g           r     y    QQ T G   T',
      '#####################################################################################################',
      '#####################################################################################################',
      '#####################################################################################################',
      '#####################################################################################################',
      '#####################################################################################################'
    ]
  },

  // -------------------------------------------------------------------
  // CHOPFNUSS 2 – D Waag vom Albis
  //  Gewichte: Spieler 1, Chischte 1, Felsbrocke 2, Sandsack 2. Unter den
  //  Schächten liegt Wasser: wer unter eine hochgefahrene Schale fällt,
  //  startet am Checkpoint neu (statt im Schacht festzusitzen).
  //  A) Waage a/b (2 Kachle pro Gwicht, max. 4): Simon muss auf Schale b
  //     ganz nach oben (+4) → auf a braucht es 2 Gewicht MEHR als auf b.
  //     Chischte auf a schieben, Jessica hält Schalter P (Sandsack auf a):
  //     1 + 2 = 3 gegen 1. Oben zieht Simon den Zeithebel L (Sandsack, 6 s),
  //     während Jessica auf b wartet: wieder 3 gegen 1.
  //  B) Waage c/d (1 Kachel pro Gwicht) mit Waagen-Lämpli S: Das Tor E geht
  //     nur auf, wenn die Waage GENAU im Gleichgewicht steht – mit mindestens
  //     2 Gewicht auf jeder Seite (1 gegen 1 zählt nicht). Dann bleibt es noch
  //     4 Sekunden offen. Lösung: Felsbrocke (2) zu zweit auf c schieben,
  //     dann BEIDE auf d (2 gegen 2) – absteigen und zum Tor rennen.
  // -------------------------------------------------------------------
  {
    name: 'D Waag vom Albis',
    bonus: true,
    password: '2525',
    sky: [0x9ec8e8, 0xfff4e0],
    anecdote: 'Was isch schwärer: es Kilo Stei oder es Kilo Edelwiiss? {COUSIN} studiert hüt no dra ume.',
    triggers: {
      P: { type: 'plate', owner: null, targets: ['a'] },
      L: { type: 'lever', owner: null, timer: 6, targets: ['a'] },
      S: { type: 'scale', pan: 'c', min: 2, timer: 4, targets: ['E'] }
    },
    targets: {
      a: { kind: 'balance', partner: 'b', travel: 4, perWeight: 2, speed: 80, ballast: 2 },
      b: { kind: 'balance' },
      c: { kind: 'balance', partner: 'd', travel: 3, perWeight: 1, speed: 70 },
      d: { kind: 'balance' },
      E: 'door'
    },
    hints: [
      'D WAAG: Wo s schwärer isch, gaht d Schale abe – di anderi gaht gliich viel ufe. Pro Gwicht 2 Stuck. {P1} = 1, {P2} = 1, Chischte = 1, Sandsack = 2. D Zahle obe zeiged s Gwicht.',
      'DI ZWEIT WAAG: S Tor gaht nume uf, wänn s Lämpli lüchtet – und das lüchtet nume, wänn d Waag GANZ GENAU im Gliichgwicht isch, mit mindestens 2 Gwicht uf jedere Siite. Dänn händ ihr 4 Sekunde! Felsbrocke = 2.'
    ],
    map: [
      '                                          RR',
      '                                          RR',
      '                                          RR',
      '                                          RR',
      '                                 *        RR',
      '                                          EE',
      '                                          EE',
      '                     F  L iK    ##   S    EE T G   T',
      '                    ##########cc##dd#################',
      '                 *  ##########  ##  #################',
      '                    ##########  ##  #################',
      '                    ##########  ##  #################',
      '                ##  ##########~~##~~#################',
      '                ##  #################################',
      'T1 2 i P  k     ##  #################################',
      '##############aa##bb#################################',
      '##############  ##  #################################',
      '##############  ##  #################################',
      '##############  ##  #################################',
      '##############  ##  #################################',
      '##############~~##~~#################################',
      '#####################################################'
    ]
  }
];

/** Anzahl Level der Geschichte (die Chopfnüss stehen am Schluss und zählen nicht dazu). */
const STORY_LEVELS = LEVELS.filter(l => !l.bonus).length;

/** Anzeige-Name eines Levels: "LEVEL 3" bzw. "CHOPFNUSS 1". */
function levelLabel(index) {
  return index >= STORY_LEVELS ? `${TXT.bonusLevel} ${index - STORY_LEVELS + 1}` : `${TXT.level} ${index + 1}`;
}
