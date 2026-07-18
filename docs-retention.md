# OneUp retention-events

OneUp bruger `analytics.track(event, props)` som centralt interface for retention-events. Den nuværende adapter gemmer kun sikre lokale/no-op-events i `localStorage` og sender ikke helbredsdata, præcise skridttal, navn, e-mail eller andre følsomme værdier.

Definerede events: `app_open`, `onboarding_completed`, `first_goal_created`, `health_connect_permission_granted`, `first_automatic_data_received`, `daily_goal_completed`, `daily_mission_completed`, `streak_started`, `streak_extended`, `rescue_day_used`, `weekly_reward_unlocked` og `friend_invite_started`.

## Senere beregning af D1, D7, D14 og D28

Når en ekstern analyseplatform kobles på, beregnes retention privatlivsvenligt ud fra installationsdag og `app_open`:

- **D1-retention:** andel installationer med mindst ét `app_open` på lokal kalenderdag 1 efter installation.
- **D7-retention:** andel installationer med mindst ét `app_open` på lokal kalenderdag 7 efter installation.
- **D14-retention:** andel installationer med mindst ét `app_open` på lokal kalenderdag 14 efter installation.
- **D28-retention:** andel installationer med mindst ét `app_open` på lokal kalenderdag 28 efter installation.

Brug lokal kalenderdato i brugerens tidszone til kohorter, og rapportér kun aggregerede tal. Event-properties må fortsat kun være brede kategorier som missionstype eller belønningstype.
