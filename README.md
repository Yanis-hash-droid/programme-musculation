# Programme Musculation

App personnelle (aucun compte, aucune base de données) pour créer ton programme de musculation et suivre tes séances. Toutes les données sont stockées directement dans le navigateur (localStorage).

Le projet est structuré en app Astro (nécessaire pour l'héberger sur Webflow Cloud), mais le comportement reste 100% une app statique côté navigateur : mêmes fichiers HTML/CSS/JS qu'avant, juste servis via Astro.

## Développement local

```bash
./start.sh
```

Installe les dépendances si besoin, lance le serveur de dev, et affiche l'adresse à ouvrir sur ton téléphone (même wifi que le Mac) :
- Mac : `http://localhost:4321`
- Téléphone : `http://192.168.x.x:4321`

## Déploiement (Webflow Cloud)

1. Pousser ce dépôt sur GitHub.
2. Dans Webflow → Apps → "Deploy app" → connecter le dépôt GitHub, choisir "to its own domain".
3. Webflow Cloud détecte Astro automatiquement (`npm run build`, sortie dans `dist/`).
4. Configurer un environnement de preprod (branche de preview) avant de pointer la prod sur `main`.
5. Une fois en ligne (HTTPS + domaine dédié), ouvrir l'URL sur le téléphone et faire "Ajouter à l'écran d'accueil" — l'app fonctionne alors depuis n'importe où (salle de sport, 4G...), avec mode hors-ligne actif (le service worker peut s'enregistrer car le site est en HTTPS).

## Fonctionnement

- **Programme** : crée des jours (Push, Pull, Legs...) et ajoute-y des exercices avec séries/reps/poids cibles.
- **Séance** : choisis un jour pour démarrer une séance, renseigne le poids et les reps réellement faits pour chaque série (l'app rappelle ta dernière performance sur l'exercice), puis termine la séance pour l'enregistrer.
- **Historique** : consulte toutes tes séances passées.
- **Exercices** : bibliothèque d'exercices pré-remplie, avec possibilité d'en ajouter/supprimer.

## Limites à connaître

- Les données vivent dans le navigateur du téléphone (localStorage). Ne pas vider le cache/les données de site sous peine de tout perdre. Pas de synchronisation entre plusieurs appareils.
- Aucune donnée ne transite par un serveur : Webflow Cloud héberge uniquement les fichiers statiques de l'app, rien côté base de données.
