#!/bin/bash
# Lance le serveur de dev Astro et affiche l'adresse à ouvrir sur le téléphone.
cd "$(dirname "$0")"
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

if [ ! -d node_modules ]; then
  echo "Installation des dépendances (première fois)..."
  npm install
fi

echo "Programme Musculation"
echo "----------------------"
echo "Sur cet ordinateur : http://localhost:4321"
if [ -n "$IP" ]; then
  echo "Sur ton téléphone (même wifi) : http://$IP:4321"
else
  echo "Impossible de détecter l'IP locale. Vérifie que le Mac est bien connecté au wifi."
fi
echo "(Ctrl+C pour arrêter le serveur)"
echo ""

npm run dev -- --host --port 4321
