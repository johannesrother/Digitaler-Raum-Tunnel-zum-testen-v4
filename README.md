# Digitaler Raum – Tunnel V4

Browserbasierte immersive VR-/WebXR-Kunstinstallation aus dem Studiengang Objekt- und Raumdesign. Das Projekt wird aktuell von einem zweiköpfigen Team entwickelt und untersucht Tourette-Syndrom, unwillkürliche Impulse, Kontrollverlust und körperliche Wahrnehmung als räumliche und audiovisuelle Erfahrung.

Die Installation ist keine medizinische Simulation. Sie übersetzt subjektive Zustände in eine Dramaturgie aus Ruhe, Irritation, Kontrollverlust, räumlicher Verdichtung, Überforderung, weißer Entladung und einer veränderten Rückkehr an den Ausgangsort.

## Experience

Der implementierte Ablauf ist:

```text
WARME IDYLLE
→ RIFT
→ TUNNEL
→ WHITE ROOM
→ TWILIGHT-IDYLLE
→ REEXPERIENCE
```

Die Experience startet über einen vorgeschalteten Loading-/Startscreen. Nach dem Start bewegt sich die Kamera automatisch durch die Szene; auf einem kompatiblen Headset bleibt die physische Kopfbewegung innerhalb dieser geführten Route erhalten.

## 1. Idylle

Die erste Phase bildet den ruhigen Gegenpol zum späteren Tunnel. Eine offene Wiesenlandschaft mit dichtem Gras, Blumen, Bäumen, Felsen, sanften Hintergrundformen, einem Haus und einem Toon-Skydome wird von warmem Füll- und Sonnenlicht beleuchtet. Die ruhige Idylle-Audiospur läuft als Schleife.

Die Kamera beginnt in der Landschaft und nähert sich dem Rift-Bereich links neben dem Haus. Die Idylle wurde entlang der transparent sichtbaren Tunnelroute erweitert, damit hinter der Tunnelmembran weiterhin Landschaft statt einer leeren Szenengrenze erscheint.

## 2. Rift und Übergang

Das Rift entsteht erst während der Annäherung. Es verbindet eine unsichtbare technische Stencil-Aperture mit einer transparenten, organischen Portalwirkung und einer Vorschau auf den Tunnel. Die Idylle bleibt durch das Portal teilweise wahrnehmbar.

Vor und während der Öffnung steigern kopfrelative Lichtreflexe, weiche Nachbilder und eine lokale Lichtreaktion die visuelle Irritation. Parallel wird die Idylle-Audiospur abgesenkt, ein Herzschlag eingeblendet und ein eigener Rift-Sound gestartet. Beim räumlichen Crossing werden Idylle und Rift-Audio ausgeblendet; der vorhandene Tunnel-Sound übernimmt mit einem Fade-in. Die Crossing-Ebene, die Stencil-Aperture und der Tunnelanfang werden von einer gemeinsamen Übergangslogik gesteuert.

## 3. Tunnel

Der Tunnel ist eine kontinuierliche, nach innen gerenderte biomorphe Hülle entlang einer gekrümmten Route. Makroformen, Rippen, Finnen, Falten, Normalmaps, bewegte Morph-Targets und kamerabegleitende Lichtquellen erzeugen eine lebendige Wandstruktur. Das transparente Membranmaterial lässt die erweiterte Idylle zunächst weiterhin durchscheinen.

Die Geometrie verengt sich kontinuierlich von einem offenen Eingang bis zu einem stark komprimierten Endprofil. Für die begehbare Route gelten Sicherheitsgrenzen; die minimale vertikale Durchgangshöhe liegt im aktuellen Code bei etwa 1,2 Metern. Gegen Ende wird die Decke dadurch so niedrig, dass stehende Nutzerinnen und Nutzer in VR körperlich reagieren und sich ducken oder gegebenenfalls hinknien müssen. Der Bodenbereich bleibt gegenüber den Wandverformungen stabilisiert.

Die Tunnelroute und ihre geometrische Länge bleiben unverändert. Die nominelle Tunnelprogression reicht von 0 bis 60; durch die variable Geschwindigkeitssteuerung entspricht dieser Wert nicht durchgehend einer starren Echtzeitdauer.

## 4. Video-System

Die Videos werden nicht auf separaten Screens oder Planes gezeigt. Ein Material-Plugin mischt eine `VideoTexture` über die vollständige Tunnelhülle. Die vorhandenen Tunnel-UVs werden dafür zu einer durchgehenden Full-Tunnel-Projektionsfläche umgerechnet; Materialstruktur und Video bleiben gleichzeitig sichtbar.

Aktuell werden vier Videos verwendet:

```text
12 → 2 → 25 → 16
```

Video 12 wird beim Aufbau des Systems als Startquelle angelegt und beginnt mit der Tunnelphase. Die Wechsel zu Video 2, 25 und 16 sind an ausgewählte Tic-Ereignisse gekoppelt. Das jeweils nächste Video wird 1,5 Sekunden vor dem Wechsel vorbereitet und erst nach einem verfügbaren Bild übernommen. Danach wird die vorherige Quelle pausiert und freigegeben. Damit sind dauerhaft höchstens die aktuelle und eine vorbereitete Videoquelle aktiv. Beim Reset wird Video 12 wieder als erste Quelle hergestellt.

## 5. Tic-System

Die Tourette-inspirierten Bewegungen sind keine kontinuierliche Verwacklung und kein sinusförmiges Camera Shake. Acht einzelne Ereignisse setzen abrupt ein, schlagen kurz aus und kehren anschließend vollständig zum normalen Rotationsoffset zurück. Die Sequenz enthält einen Einzel-Tic, vier Doppel-Tics und drei Dreifach-Tics mit unregelmäßigen Abständen und unterschiedlichen Richtungen.

Der Schwerpunkt liegt auf Ausschlägen nach rechts. Die aktuelle Konfiguration erreicht punktuell bis zu 70° nach rechts und verwendet kleinere linke Gegenimpulse bis 22°. Drei der stärkeren Ereignisse lösen gleichzeitig die Video-Cuts zu 2, 25 und 16 aus.

Für Desktop und WebXR wird der Offset auf den gemeinsamen Locomotion-Root angewendet. Der vorherige Offset wird vor jedem neuen Frame entfernt. Dadurch bleibt die XR-Kamera für reales Headtracking frei, und kein Tic hinterlässt eine dauerhafte Veränderung der Blickrichtung oder Position.

## 6. Variable Geschwindigkeit

Die Vorwärtsbewegung folgt weiterhin derselben geometrischen Route, ihre Geschwindigkeit verändert sich jedoch entlang einer eigenen Dramaturgie. Der aktuelle Multiplikator reicht von `0,45×` bis `2,8×` der normalen Tunnelgeschwindigkeit.

Langsame Hemmungsphasen wechseln mit normaler Fahrt und kurzen, starken Beschleunigungen. Mehrere Wechsel liegen unmittelbar nach ausgewählten Tic-Ereignissen; nicht jedes Tic verändert die Geschwindigkeit. Die zurückgelegte Strecke wird aus dem Geschwindigkeitsprofil integriert, sodass keine Teleports oder ausgelassenen Routenabschnitte entstehen. Diese Unregelmäßigkeit unterstützt den Kontrollverlust, ohne den Tunnelpfad zu verändern.

## 7. Breathing Tunnel

Der Breathing-Effekt ist implementiert. Drei kurze Phasen kontrahieren Seiten und Decke subtil mit Zielstärken von 4, 7 und 9 Prozent. Sie dauern 4,2, 5,0 und 3,8 Sekunden und liegen verteilt im frühen bis mittleren Tunnel.

Die Bewegung nutzt ein zusätzliches GPU-Morph-Target statt einer permanenten CPU-Neuberechnung der Geometrie. Der untere Bodenbereich wird maskiert und bleibt stabil; Sicherheitsklemmen begrenzen die Kontraktion im begehbaren Querschnitt. Der Tunnel pulsiert nicht dauerhaft, sondern reagiert in wenigen organischen Verdichtungen.

## 8. Audio

Die Audioarchitektur verwendet wiederverwendbare HTML-Audioelemente und ist an die Experience-Zustände gekoppelt:

- Die Idylle-Audiospur läuft zu Beginn als Schleife.
- Vor dem Rift wird sie auf 75 Prozent ihres Ausgangspegels abgesenkt, während ein geloopter Herzschlag eingeblendet wird.
- Mit der Rift-Öffnung startet ein eigener Rift-Sound.
- Beim Crossing werden Idylle, Herzschlag und Rift ausgeblendet; der Tunnel-Sound beginnt mit einem 2,5-sekündigen Fade-in.
- Ab dem finalen Tunnelabschnitt startet der Sog-Sound. Gleichzeitig wird der Tunnel-Sound über acht Sekunden abgesenkt.
- Im White Room startet ein eigener Ton mit zweisekündigem Fade-in. In seinen letzten fünf Sekunden wird er ausgeblendet und steuert synchron die visuelle Rückkehr zur Idylle.

Beim REEXPERIENCE-Reset werden Wiedergabepositionen, Lautstärken und laufbezogene Statuswerte zurückgesetzt. Alte Audioinstanzen laufen nicht parallel zum neuen Durchgang weiter.

## 9. White Room

Im letzten Tunnelabschnitt beginnt der Sog und ein bildschirmfüllender Weiß-Fade. Beim Erreichen des Tunnelendes bleibt das Bild vollständig weiß, während die Kamera und die Weltsysteme verdeckt zurückgesetzt werden. Anschließend umschließt eine große, nach innen gerenderte, unbeleuchtete weiße Kugel die Kamera als kantenloser White Room.

Der White-Room-Ton bildet den auditiven Gegenpol zur vorangegangenen Überforderung. Während seines abschließenden Fades wird die weiße Ebene synchron abgesenkt und gibt die zurückgesetzte Idylle wieder frei. Tunnel, Rift, Videos, Tics, Geschwindigkeit und Sog sind zu diesem Zeitpunkt bereits zurückgesetzt.

## 10. Twilight-Idylle

Die zurückkehrende Landschaft verwendet dieselbe Geometrie und dieselben Objekte wie die anfängliche Idylle, erscheint aber als Blue-Hour-/Twilight-Zustand. Umgebung, Nebel, Fülllicht, Sonnenlicht, Himmelsemission und Sättigung werden auf eine kühlere, bläulich gedämpfte Stimmung gesetzt. Es gibt dafür keine zweite Welt und keinen zusätzlichen Postprocess.

Die Twilight-Idylle bleibt bestehen, bis REEXPERIENCE ausgelöst wird. Der Ort ist derselbe; seine visuelle Wahrnehmung hat sich nach dem Tunnel verändert.

## 11. REEXPERIENCE

Der REEXPERIENCE-Button erscheint erst, nachdem der White-Room-Ton vollständig beendet ist und anschließend fünf Sekunden Stille vergangen sind. Auf dem Desktop wird er als DOM-Overlay gezeigt; in einer immersiven XR-Session erscheint er als pickbare Ebene vor der XR-Kamera.

Ein Neustart stellt die warme Idylle wieder her und setzt Kamera, Rift, Tunnel, Videoquelle, Tic-Offset, Geschwindigkeit, Desaturation, White Fade, White Room und alle Audiozustände zurück. Der zweite Durchgang verwendet dieselbe bereits geladene Szene und beginnt erneut mit Video 12.

## 12. WebXR und Meta Quest

Die Anwendung basiert auf Babylon.js und verwendet die WebXR-Sessionart `immersive-vr`. Als Referenzraum wird primär `local-floor` angefordert; falls dieser nicht verfügbar ist, fällt die Initialisierung auf `local` zurück.

Die XR-Kamera wird an denselben Locomotion-Root wie die Desktopkamera gehängt. Die Route bewegt und orientiert diesen Root, während die Headset-Pose weiterhin direkt auf der XR-Kamera arbeitet. Dadurch bleiben Kopfbewegung und stereoskopische Darstellung erhalten. Der XR-Render-Target verwendet Antialiasing, Depth, Stencil und Alpha mit einem `framebufferScaleFactor` von `0,8`.

Controller-/Pointer-Auswahl wird nur für den REEXPERIENCE-Button aktiviert; Controller-Modelle werden dabei nicht geladen. Freie Controller-Lokomotion ist nicht Bestandteil der geführten Experience. Es gibt im aktuellen Code weder eine explizite Hardware-Scaling-Überschreibung noch Foveated Rendering.

## 13. Performance

Vorhandene Laufzeitmaßnahmen für Browser und Standalone-XR sind:

- reduzierte XR-Framebuffer-Skalierung auf `0,8`;
- Grassdarstellung über Thin Instances statt einzelner Grasmeshes;
- maximal aktuelle plus vorbereitete Videoquelle und sofortige Freigabe alter `VideoTexture`-Quellen;
- pausierte und zurückgesetzte Videos außerhalb der aktiven Tunnelphase;
- GPU-Morph-Targets für Wandbewegung und Breathing statt Geometrie-Neuberechnung pro Frame;
- wiederverwendete Pools für die Pre-Rift-Lichtreflexe;
- White Fade als 1×1-Textur auf einer Babylon-Layer statt eines zusätzlichen Render-Targets;
- Twilight als Zustandsänderung vorhandener Lichter und Materialien ohne zusätzlichen Postprocess;
- deaktiviertes Pointer-Move-Picking in der Szene.

Die endgültige Bildrate, thermische Stabilität und der Komfort intensiver Bewegungsimpulse müssen weiterhin auf der Zielhardware geprüft werden.

## 14. Technische Architektur

Das Projekt ist eine statische ES-Module-Anwendung ohne Build-Schritt:

```text
index.html     lädt Babylon.js, Stylesheet und Einstiegspunkt
main.js        koordiniert Startscreen, Runs, WebXR und REEXPERIENCE
scripts/       Szenen-, Übergangs-, Tunnel-, Audio-, UI- und XR-Module
assets/        lokale 3D-Modelle, Texturen, Videos, Audio und UI-Bilder
```

Wichtige Verantwortlichkeiten:

- `scripts/core/`: Engine, Szenenaufbau, Run-State und WebXR-Initialisierung
- `scripts/environment/`: Idylle, Landschaft, Vegetation, Lichtstörung und Farbzustände
- `scripts/tunnel/`: Rift-/Crossing-Timeline, Tunnelgeometrie, Tics, Geschwindigkeit und Full-Tunnel-Video
- `scripts/audio/`: getrennte Zustände für Idylle, Rift, Tunnel, Sog und White Room
- `scripts/whiteRoom/`: White-Room-Geometrie und Weiß-Fade
- `scripts/ui/`: Loading-/Startscreen und Desktop-/XR-REEXPERIENCE

Babylon.js, der glTF-Loader und die Materials Library werden direkt vom Babylon-CDN geladen.

## 15. Assets

Das Repository enthält lokale glTF-/GLB-Modelle für Landschaft, Haus, Himmel und Vegetation, PBR-Texturen für Tunnel und Umgebung, MP4-Videos für die Tunnelprojektion sowie WAV-/AIFF-Audiodateien. Zur Laufzeit verwendet die Videosequenz ausschließlich die Dateien 12, 2, 25 und 16. Die Quellen externer visueller Assets sind in [ASSET_CREDITS.md](ASSET_CREDITS.md) dokumentiert.

Es werden keine absoluten lokalen Dateipfade benötigt oder veröffentlicht.

## 16. Lokale Entwicklung

Es gibt keine npm-, Vite- oder andere Build-Konfiguration. Wegen ES-Modulen, Medien- und Browser-Sicherheitsregeln muss das Projekt über HTTP bereitgestellt werden. Im Repository-Verzeichnis genügt beispielsweise:

```bash
python3 -m http.server 8080
```

Danach kann die Desktopversion unter `http://localhost:8080/` geöffnet werden. `file://` ist für den vollständigen Lauf nicht zuverlässig. Der Startscreen dient zugleich als erforderliche Nutzerinteraktion für Audio- und Videowiedergabe.

## 17. GitHub Pages

V4 wird als statische Seite über GitHub Pages bereitgestellt:

[https://johannesrother.github.io/Digitaler-Raum-Tunnel-zum-testen-v4/](https://johannesrother.github.io/Digitaler-Raum-Tunnel-zum-testen-v4/)

WebXR benötigt einen sicheren Kontext. GitHub Pages erfüllt diese Voraussetzung über HTTPS; eine immersive Session setzt zusätzlich einen kompatiblen Browser und ein unterstütztes Headset voraus.

## 18. Team

Das Projekt wird aktuell von einem zweiköpfigen Team im Studiengang Objekt- und Raumdesign entwickelt. Im Repository sind die Namen und Rollen beider aktuellen Teammitglieder nicht eindeutig dokumentiert; deshalb werden hier keine Zuordnungen ergänzt.

## 19. Aktueller Status

### Implementiert

- vollständiger Ablauf von warmer Idylle bis Twilight-Rückkehr und REEXPERIENCE;
- transparentes Rift mit Stencil-Crossing, Glare, Nachbildern und Audioübergang;
- kontinuierlicher biomorpher Tunnel mit Verengung, Morphbewegung, Beleuchtung und drei Breathing-Phasen;
- Full-Tunnel-Video in der Sequenz `12 → 2 → 25 → 16`;
- diskrete Einzel-, Doppel- und Dreifach-Tics mit erhaltenem XR-Headtracking;
- variable Vorwärtsgeschwindigkeit zwischen `0,45×` und `2,8×`;
- getrennte Audiozustände für Idylle, Herzschlag, Rift, Tunnel, Sog und White Room;
- White Fade, White Room, synchronisierte Twilight-Rückkehr und wiederholbarer Reset;
- Desktopbetrieb und optionaler WebXR-Einstieg mit XR-REEXPERIENCE.

### Experimentell

- künstlerische Feinabstimmung der Tic-Stärken, Geschwindigkeitswechsel und Video-Cuts;
- Intensität und zeitliche Platzierung der Breathing-Phasen;
- Komfort und Wirkung der körperlichen Verengung in längeren VR-Tests.

### Bekannte Einschränkungen

- Immersives WebXR funktioniert nur in unterstützten Browsern, auf kompatibler Hardware und in einem sicheren Kontext.
- Audio- und Videostart hängen von der initialen Nutzerinteraktion und den Medienregeln des Browsers ab.
- Babylon.js und Zusatzbibliotheken werden vom CDN geladen; für den Erstaufruf ist daher eine Netzwerkverbindung erforderlich.
- Quest-Performance, thermische Stabilität und Bewegungskomfort müssen auf der jeweiligen Zielhardware abschließend validiert werden.

## 20. Version

V4 ist der aktuelle Entwicklungs- und Experimentalstand. V3 bleibt als früherer stabiler, eingefrorener Stand erhalten und wird durch Arbeiten an V4 nicht verändert.
