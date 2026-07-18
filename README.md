# Luxe Klok (Samsung S20)

Digitale luxe klok-app: **tijd · datum · weer**, scherm blijft aan, kleuren wisselen elk half uur.

## Op je S20 installeren (aanbevolen)

1. Zet de map `luxe-klok` ergens online of start lokaal een server (zie hieronder).
2. Open de link in **Chrome** op je S20.
3. Menu **⋮ → App installeren** / **Toevoegen aan startscherm**.
4. Open de app vanaf je startscherm.
5. Tik **Volledig scherm**.
6. Laat in Android **Schermtime-out** desnoods op max (backup), de app gebruikt zelf **Wake Lock**.

### Snelle lokale test vanaf je PC

In deze map:

```bash
npx --yes serve -l 3000
```

Open op je telefoon (zelfde wifi): `http://<jouw-pc-ip>:3000`

## Functies

| Functie | Uitleg |
|--------|--------|
| Tijd | Grote digitale cijfers, leesbaar vanaf ~5 m |
| Datum | Dag + volledige datum |
| Weer | Open-Meteo (gratis, geen API-key) |
| Scherm aan | Screen Wake Lock API |
| Kleuren | 12 luxe paletten, wissel elk half uur |
| Instellingen | ⚙ plaats, seconden, 12/24u, wake lock |

## Tips batterij (AMOLED S20)

- Donkere thema’s sparen stroom.
- Laat opladen terwijl hij als nachtklok staat.
- Helderheid niet op 100% tenzij nodig.

## Bestanden

- `index.html` – scherm
- `styles.css` – luxe layout
- `app.js` – klok, weer, wake lock, paletten
- `manifest.json` + `sw.js` – installeerbare PWA
