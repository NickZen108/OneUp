# OneUp code-health audit

Audit udført for patchversion 1.15.1 med buildtidspunkt 18. juli 2026 kl. 17.40 Europe/Copenhagen.

## Sikkert at fjerne

- Ingen migrationskode, localStorage-nøgler, Firebase-afhængigheder eller Android-/Capacitor-filer er fjernet i denne oprydning, fordi auditten ikke fandt elementer med tilstrækkelig sikker dokumentation for, at eksisterende brugere ikke kan afhænge af dem.
- `dist/` er genereret af `npm run build` og bør fortsat ikke behandles som kildekode.

## Bør refaktoreres

- `script.js` er fortsat den primære runtime-fil og indeholder konfiguration, storage, retention, Health Connect, konkurrencer, mål og UI-rendering. Den bør opdeles gradvist i ES-moduler, men kun bag kompatible testgrænser, fordi `window.__oneUpTest` og de nuværende Node/vm-tests læser `script.js` direkte.
- Konfiguration og storage-nøgler er kortlagt i `src/config/app-config.js` og `src/storage/keys.js` som første, lavrisiko modulgrænser. Næste sikre trin er at lade build/test indlæse disse moduler uden at ændre browseradfærd.
- Aktiviteternes målkonfiguration, `personalMetrics` og Health Connect-mapping overlapper delvist. De bør samles omkring aktivitet-id'er, men ikke i én universalstruktur, før migrationer og gamle aktivitets-id'er er dækket af flere tests.
- Periodeberegninger for lokal dato, uge og konkurrence-slut findes flere steder og bør samles omkring Copenhagen-date helpers.
- XP-, streak-, trophy- og retention-opdateringer bør holdes adskilt fra rendering, så dobbelt XP og nulstilling af streaks kan testes mere isoleret.

## Skal foreløbig bevares

- Alle eksisterende localStorage-nøgler skal bevares: version, point, historik, profil, settings, activity settings, aktivitetslog, arkiveret village-data, streaks, konkurrencer, personal goals, trophies, retention, analytics, Health Connect, install-id, local backup og cloud migration.
- `oldVillageKeys` og deprecated aktiviteter skal bevares, fordi de er migrations- og kompatibilitetsdata for ældre installationer.
- Retention-data fra version 1.15.0 skal bevares uændret; der er tilføjet testdækning for, at eksisterende retention- og analytics-storage kan indlæses og persisteres.
- Health Connect-status og native Android-plugin-filer skal bevares. Firebase-afhængigheden skal bevares, fordi appen kalder Firebase-auth init ved runtime, selvom login-flowet er begrænset.
- `android/app/src/main/assets/public/` bevares i versionsstyring i denne PR. Den nuværende Android-projektstruktur inkluderer de genererede webassets, og deployment-sikker fjernelse kræver en separat beslutning. I stedet er der tilføjet en CI-egnet kontrol, som opdager drift mellem kildefiler og genererede Android-assets.

## Kræver senere beslutning

- Om `android/app/src/main/assets/public/` kan fjernes fra Git afhænger af, om alle deployments altid kører `npm run build` og `npx cap sync android` fra ren checkout før APK-build.
- En egentlig ES-module split af `script.js` kræver en lille test/build-omlægning, så browseren, Capacitor og Node-tests bruger samme modulgrænser uden cirkulære imports.
- CSS-oprydning bør ske efter selector-inventar med browser-/DOM-tests, fordi flere class names oprettes dynamisk i render-funktioner.
- Eventuel fjernelse af npm-afhængigheder kræver runtime-verifikation. Firebase må ikke fjernes baseret på tekstsøgning alene.
- Gamle feature flags og deprecated aktiviteter bør først fjernes, når der findes eksplicit migration og datakompatibilitetstest for brugere fra de relevante versioner.

## Genererede filer

- Kildekode: `index.html`, `script.js`, `styles.css`, `package.json`, `package-lock.json`, `capacitor.config.js`, `scripts/`, `tests/`, `src/`, Android native source og Gradle-konfiguration.
- Genereret webbuild: `dist/`, skabt af `npm run build`.
- Genererede Android webassets: `android/app/src/main/assets/public/`, opdateret af `npx cap sync android` efter webbuild.
- Kontrol: `npm run check:generated` sammenligner de kildefiler, som aktuelt er checket ind som Android webassets, så drift opdages i CI og lokalt.
