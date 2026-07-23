# Johnny og autonom vedligeholdelse

Johnny/OpenClaw kan vedligeholde OneUp autonomt. Den normale arbejdsgang er at oprette en arbejdsbranch, implementere ændringen, køre projektets relevante tests og builds, committe, pushe og oprette en pull request.

`main` må aldrig efterlades i en ødelagt tilstand. Fejl skal undersøges og rettes automatisk, når det er muligt, og ændringer må først merges, når de obligatoriske checks består.

Johnny spørger kun om hjælp, når opgaven kræver en produktbeslutning, betaling, manglende adgang eller en irreversibel handling.
