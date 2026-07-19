# OneUp-notifikationer

Version 1.16.7 tilføjer et ikke-påtrængende notifikationsflow. OneUp viser først sin egen danske forklaring efter en relevant handling, og Androids `POST_NOTIFICATIONS`-dialog åbnes kun efter brugerens tryk på “Slå notifikationer til”. Webversionen viser kun, at indstillingerne er tilgængelige i Android-appen.

Android opretter fire almindelige kanaler: Invitationer, Konkurrencer og samarbejder, Fremskridt og Påmindelser. Kanalerne bruger normal prioritet uden aggressiv lyd eller vibration, og telefonens kanalindstillinger respekteres.

FCM-tokenregistrering er bevidst ikke aktiveret endnu, fordi OneUp mangler en privat backend, der kan knytte tokens til en sikker og entydig brugeridentitet. Koden må ikke logge hele FCM-tokenet eller sende tokens til offentlige endpoints. Når backend findes, skal token registreres efter godkendt tilladelse, roteres sikkert og fjernes ved logout, kontosletning eller fravalg.

Lokale daglige påmindelser gemmer tidspunkt i telefonens lokale tidszone og skal springes over, når dagens mål allerede er nået.
