FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DB_PATH=/data/bodyledger.sqlite
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && mkdir /data && chown node:node /data
COPY --from=build /app/dist ./dist
COPY src/model.ts ./src/model.ts
COPY server.mjs ./
COPY data/BodyLedger-demo.json ./data/BodyLedger-demo.json
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
CMD ["node", "--experimental-strip-types", "server.mjs"]
