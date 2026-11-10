ARG BUILD_FROM
ARG POSTGRAM_REF=cli-v1.41.1
FROM node:22-alpine AS postgram-source
ARG POSTGRAM_REF
RUN apk add --no-cache git
WORKDIR /src
RUN git clone --depth 1 --branch "${POSTGRAM_REF}" https://github.com/ivo-toby/postgram.git .

FROM postgram-source AS postgram-server
RUN npm ci && npm run build

FROM postgram-source AS ui-builder
WORKDIR /src/ui
RUN npm ci && npm run build

FROM ${BUILD_FROM}
RUN apk add --no-cache nodejs nginx postgresql17 postgresql17-client postgresql17-contrib postgresql17-dev build-base git
ARG PGVECTOR_VERSION=v0.8.1
RUN git clone --depth 1 --branch "${PGVECTOR_VERSION}" https://github.com/pgvector/pgvector.git /tmp/pgvector \
 && make -C /tmp/pgvector && make -C /tmp/pgvector install \
 && rm -rf /tmp/pgvector && apk del build-base git postgresql17-dev
WORKDIR /opt/postgram
COPY --from=postgram-server /src/dist ./dist
COPY --from=postgram-server /src/node_modules ./node_modules
COPY --from=postgram-server /src/package.json ./package.json
COPY --from=postgram-server /src/src/db/migrations ./dist/db/migrations
COPY --from=ui-builder /src/ui/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY run.sh /run.sh
RUN chmod +x /run.sh
EXPOSE 3000 3100
CMD ["/run.sh"]
