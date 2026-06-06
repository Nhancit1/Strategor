FROM node:20-slim

WORKDIR /srv

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
COPY seed ./seed

EXPOSE 4000
CMD ["node", "src/server.js"]
