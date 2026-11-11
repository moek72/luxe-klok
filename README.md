# Luxe Klok · Portable Sound Edition 2

**App:** https://moek72.github.io/luxe-klok/?v=2

Een rustige, persoonlijke klok met vier veelkleurige geluidseffecten, radio en een Spotify-speler. Geen ChatGPT-account nodig. Alle bediening zit achter het tandwiel.

## Gebruik

- **Effecten:** balkjes, golven, ringen of aura. Regenboog, noorderlicht, vuur, oceaan, goud of je eigen kleur. Gevoeligheid en intensiteit hebben een ruim bereik.
- **Klok:** vier ingebouwde lettertypes, grootte, tekstkleur, regenboogtekst, achtergrondkleur en nachtstand. Datum, weer en seconden kunnen uit.
- **Muziek:** radio met vijf zenders of je eigen HTTPS-stream. NPO Radio 2 is de standaardzender en ondersteunt directe geluidseffecten zonder microfoon. Ook NPO 3FM, NPO Radio 5 en Groove Salad zijn beschikbaar. Radio Paradise ondersteunt luisteren; gebruik voor effecten de microfoon. Eigen streams moeten voor directe analyse HTTPS en CORS ondersteunen.
- **Spotify:** plak een normale `open.spotify.com`-link naar een nummer, album of playlist. De officiële Spotify-speler regelt het afspelen. Beschikbaarheid, lengte en inloggen worden door Spotify bepaald. De app krijgt geen directe toegang tot Spotify-audio; effecten kunnen via de microfoon reageren.
- **App:** installeren, volledig scherm, wakker houden, link delen, instellingen exporteren/importeren.

Microfoontoegang vraagt de app uitsluitend na je eigen klik. Er wordt geen geluid opgenomen of doorgestuurd. De microfoon stopt bij verbergen of verlaten. Radio stopt met de Stop-knop; radio en Spotify gebruiken hun eigen internetverbinding. De Spotify-speler wordt pas geladen nadat je zelf een geldige link opent.

## Als app installeren

Android/Chrome: open de app → tandwiel → App → App installeren. Als de browser geen installatievenster aanbiedt: menu ⋮ → App installeren / Toevoegen aan startscherm.

iPhone/iPad: open in Safari → Deel → Zet op beginscherm.

Na het eerste complete bezoek en serviceworker-installatie werken de klok, eigen lettertypes, instellingen en microfoonvisualisatie ook offline. Radio, Spotify en actueel weer hebben internet nodig. De browser kan op een telefoon aanvullende beperkingen opleggen aan achtergrondgeluid, wake lock en microfoontoegang.

## Portable

De app bestaat alleen uit HTML, CSS, JavaScript, pictogrammen en vier meegeleverde lettertypes. Geen buildstap, serverbackend, account of API-sleutel nodig. Pak de ZIP uit en serveer de map via HTTPS of localhost, bijvoorbeeld:

```sh
python3 -m http.server 8080
```

Open op dezelfde computer `http://localhost:8080`. Voor microfoontoegang op een telefoon via het netwerk is HTTPS nodig; een gewoon wifi-HTTP-adres is onvoldoende. Relatieve bestandspaden en manifest-scope werken ook onder een submap zoals `/luxe-klok/`.

De lettertypes zijn afkomstig uit Google Fonts; hun OFL-licenties staan in `fonts/`. Ze worden lokaal geladen. Weer en optionele GPS-functie gebruiken de bestaande externe weers-/locatiediensten.
