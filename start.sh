#!/bin/bash
# Lance un serveur local pour l'app et affiche l'adresse à ouvrir sur le téléphone.
cd "$(dirname "$0")"
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
PORT=8000

echo "Programme Musculation"
echo "----------------------"
echo "Sur cet ordinateur : http://localhost:$PORT"
if [ -n "$IP" ]; then
  echo "Sur ton téléphone (même wifi) : http://$IP:$PORT"
else
  echo "Impossible de détecter l'IP locale. Vérifie que le Mac est bien connecté au wifi."
fi
echo "(Ctrl+C pour arrêter le serveur)"
echo ""

python3 -m http.server "$PORT"
