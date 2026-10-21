FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server ./server
COPY public ./public

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    DATA_DIR=/data

RUN mkdir -p /data && chown -R node:node /app /data
VOLUME ["/data"]

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

USER node
CMD ["node", "server/index.js"]
