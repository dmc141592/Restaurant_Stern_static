# Hero-Video — Ablage der Originaldatei

Sobald das echte Restaurantvideo bereitsteht, hier **genau diese Datei** ablegen:

```
apps/web/public/media/hero/sternen-hero.mp4
```

Zur Laufzeit wird die Datei automatisch unter `/media/hero/sternen-hero.mp4` ausgeliefert
(Vite kopiert den gesamten `public/`-Ordner unverändert ins Produktions-Build). Nach dem
Kopieren der Datei sind **keine Codeänderungen** nötig — der Hero (`src/features/home/HeroSection.tsx`)
lädt genau diesen Pfad und schaltet automatisch vom Platzhalter auf das echte Video um.

## Empfohlenes Format

| Eigenschaft | Empfehlung |
|---|---|
| Container | MP4 (`.mp4`) |
| Video-Codec | H.264 (AVC), Profil "High", für maximale Browser-Kompatibilität |
| Audio-Codec | AAC (das Video enthält Musik, die über die Tonsteuerung zuschaltbar ist) |
| Auflösung | 1920 × 1080 (Full HD) reicht für nahezu alle Bildschirme; 2560 × 1440 nur bei Bedarf |
| Bildrate | 24–30 fps |
| Dateigrösse | nach Möglichkeit unter 15–20 MB für eine flüssige, ressourcenschonende Ladezeit (bei Bedarf mit `ffmpeg` z. B. auf CRF 23–26 komprimieren) |
| Länge | kurz und in sich schleifenfähig (loop), idealerweise 15–40 Sekunden |

Beispiel-Komprimierung mit ffmpeg:

```bash
ffmpeg -i original.mov -c:v libx264 -profile:v high -crf 24 -preset slow \
  -c:a aac -b:a 128k -movflags +faststart sternen-hero.mp4
```

`-movflags +faststart` ist wichtig, damit das Video im Browser zu spielen beginnt, bevor es
vollständig heruntergeladen ist.

## Wichtiger Hinweis

Diese Videodatei darf **nicht** über einen `import`-Pfad im Quellcode eingebunden werden — sie
gehört bewusst in `public/`, damit sie unverändert (ohne Bundling/Hashing) ausgeliefert wird und
grosse Binärdateien nicht im JavaScript-Bundle landen. Lege hier ausschliesslich die fertige
Videodatei ab, keine weiteren Asset-Verweise sind nötig.

## Solange die Datei noch fehlt

Der Hero funktioniert bereits jetzt zuverlässig ohne diese Datei: Es erscheint eine ruhige
Bordeaux-Creme-Ersatzfläche anstelle des Videos, ohne Fehler, ohne Layoutverschiebung und ohne
Konsolenmeldungen. Das ist der aktuelle, erwartete Zustand bis zum Einfügen der Originaldatei.
