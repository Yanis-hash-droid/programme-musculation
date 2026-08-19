# Programme Musculation

App locale (aucun compte, aucun cloud) pour créer ton programme de musculation et suivre tes séances. Toutes les données sont stockées directement dans le navigateur (localStorage).

## Lancer l'app

Sur ton Mac, dans le dossier du projet :

```bash
./start.sh
```

Le terminal affiche deux adresses :
- une pour ton Mac (`http://localhost:8000`)
- une pour ton téléphone, du type `http://192.168.x.x:8000` — à condition que le téléphone soit sur le **même wifi** que le Mac.

## Installer sur l'écran d'accueil du téléphone

1. Ouvre l'adresse `http://192.168.x.x:8000` dans Safari (iPhone) ou Chrome (Android).
2. Safari : bouton Partager → "Sur l'écran d'accueil". Chrome : menu ⋮ → "Ajouter à l'écran d'accueil".
3. L'app s'ouvre ensuite comme une vraie app, sans barre d'adresse.

Le Mac doit être allumé et `./start.sh` doit tourner à chaque fois que tu veux utiliser l'app depuis ton téléphone.

## Fonctionnement

- **Programme** : crée des jours (Push, Pull, Legs...) et ajoute-y des exercices avec séries/reps/poids cibles.
- **Séance** : choisis un jour pour démarrer une séance, renseigne le poids et les reps réellement faits pour chaque série (l'app rappelle ta dernière performance sur l'exercice), puis termine la séance pour l'enregistrer.
- **Historique** : consulte toutes tes séances passées.
- **Exercices** : bibliothèque d'exercices pré-remplie, avec possibilité d'en ajouter/supprimer.

## Limites à connaître

- Les données vivent dans le navigateur du téléphone. Ne pas vider le cache/les données de site sous peine de tout perdre. Pas de synchronisation entre plusieurs appareils.
- Le mode hors-ligne (via service worker) ne s'active que dans un contexte sécurisé (HTTPS ou `localhost`) ; en HTTP local sur le wifi, l'app fonctionne très bien mais nécessite que le Mac + le serveur soient allumés au moment de l'utiliser.
