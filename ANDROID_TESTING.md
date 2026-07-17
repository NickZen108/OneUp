# OneUp Android debug-test

## Start GitHub Actions-builden

1. Gå til GitHub-repositoriet.
2. Vælg fanen **Actions**.
3. Vælg workflowet **Android debug APK**.
4. Klik **Run workflow** og bekræft kørslen.

Workflowet kører også automatisk, når der ændres i Android-projektet eller appkoden.

## Find APK-artifactet

Når workflowet er færdigt, findes APK'en nederst på workflow-kørslens side under **Artifacts** med navnet:

**OneUp-debug-apk**

Download artifactet og pak ZIP-filen ud. APK-filen hedder normalt `app-debug.apk`.

## Installér APK'en på Android

1. Overfør eller download `app-debug.apk` til telefonen.
2. Åbn APK-filen fra **Chrome**, **Mine filer** eller den fil-app, du bruger.
3. Tryk **Installér**.

Android kan bede dig om at tillade installation fra den app, du åbner APK'en med, fx **Chrome** eller **Mine filer**. Tillad dette for privat test, og prøv derefter installationen igen.

Debug-APK'en er kun beregnet til privat test.
