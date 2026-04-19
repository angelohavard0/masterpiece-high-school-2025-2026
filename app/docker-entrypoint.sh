#!/bin/sh
# Si node_modules n'existe pas, réinstalle les dépendances
if [ ! -d "node_modules" ]; then
  echo "node_modules manquant, installation..."
  npm install
fi

# Démarre l'application
exec "$@"