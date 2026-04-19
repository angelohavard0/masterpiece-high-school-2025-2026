FROM node:20-alpine

WORKDIR /app

# Copie juste package.json pour installer les deps
COPY package*.json ./
RUN npm install

# Copie le reste du code (utile pour build initial)
COPY . .

EXPOSE 3000

# On crée un script d'entrypoint pour vérifier node_modules
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Lancer le script avant de démarrer npm
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]