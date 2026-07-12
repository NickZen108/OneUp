# OneUp – Gamify Your Health

OneUp er en meget enkel, mobilvenlig webapp på dansk. Den bruger kun HTML, CSS og JavaScript, så den er nem at åbne, læse og ændre for en nybegynder.

## Hvad kan appen?

- Viser overskriften **OneUp** og undertitlen **Gamify Your Health**.
- Viser to små sundhedsaktiviteter:
  - Gå 1.000 skridt
  - Lav en 2-minutters åndedrætsøvelse
- Har en knap med teksten **Jeg gjorde det** ved hver aktivitet.
- Giver 10 point, hver gang brugeren trykker på en knap.
- Gemmer automatisk point i browserens `localStorage`, så pointene er der igen, når appen åbnes senere.
- Viser det samlede antal point tydeligt.
- Viser en lille verden med sol, skyer, træer, blomster, et menneske og et dyr.
- Gør verdenen gradvist smukkere, gladere og mere rolig, når brugeren får flere point.

## Filer

- `index.html` bygger selve siden og indeholder tekst, aktiviteter, knapper, nulstil-knap og den lille verden.
- `styles.css` bestemmer farver, former, layout og hvordan verdenen ser ud på mobil og større skærme.
- `script.js` tæller point, gemmer point i `localStorage`, indlæser gemte point og opdaterer verdenen, når brugeren trykker på en knap.

## Hvad er localStorage?

`localStorage` er et lille lager i browseren. Appen kan gemme simple oplysninger der, for eksempel dine point. Oplysningerne bliver på den samme telefon eller computer, selvom du lukker browseren og åbner appen igen. Der er stadig ingen database, login eller betaling.

## Sådan kan du se appen

Den nemmeste måde er at åbne filen `index.html` direkte i din browser.

Du kan også starte en lille lokal server fra projektmappen:

```bash
python3 -m http.server 8000
```

Åbn derefter denne adresse i din browser:

```text
http://127.0.0.1:8000
```

## Sådan kan du teste appen

1. Åbn appen i browseren.
2. Tjek at point starter på `0`.
3. Tryk på **Jeg gjorde det**.
4. Tjek at point stiger med `10`.
5. Tryk flere gange og se, at verdenen bliver mere farverig, og at mennesket og dyret bliver gladere.
6. Luk fanen eller genindlæs siden. Tjek at pointene stadig står der.
7. Tryk på **Nulstil mine point**. Bekræft beskeden, og tjek at point går tilbage til `0`.
