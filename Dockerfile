# ---------- Stage 1: Builder ----------
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g npm@latest

COPY package*.json ./

RUN npm install

COPY . .

# ---------- Stage 2: Development ----------
FROM builder AS development

ENV NODE_ENV=development

EXPOSE 3000

CMD ["node", "--watch", "app.js"]

# ---------- Stage 3: Production ----------
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g npm@latest

COPY package*.json ./

RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/src ./src
COPY --from=builder /app/app.js ./app.js

EXPOSE 3000

CMD ["node", "app.js"]