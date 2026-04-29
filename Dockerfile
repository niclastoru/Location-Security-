FROM node:20-slim

# Installiere FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Arbeitsverzeichnis
WORKDIR /opt/render/project/src

# Kopiere package.json
COPY package*.json ./

# Installiere Abhängigkeiten
RUN npm install

# Kopiere den Rest
COPY . .

# Starte den Bot
CMD ["node", "index.js"]
