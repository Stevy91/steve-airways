FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# forcer npm à recréer un lockfile sans l’ancienne référence
RUN npm install --omit=dev --legacy-peer-deps --no-package-lock

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["node", "dist/server.js"]



