FROM node:20-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY index.js sessions.js ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "index.js"]
