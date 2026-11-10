ARG BUILD_FROM
FROM ghcr.io/ivo-toby/postgram:main AS postgram-server
FROM node:22-alpine AS ui-builder
ARG POSTGRAM_REF=main
RUN apk add --no-cache git
WORKDIR /src
RUN git clone --depth 1 --branch "${POSTGRAM_REF}" https://github.com/ivo-toby/postgram.git .
WORKDIR /src/ui
RUN npm ci && npm run build
FROM ${BUILD_FROM}
RUN apk add --no-cache nodejs nginx postgresql17 postgresql17-client postgresql17-contrib postgresql17-dev build-base git
ARG PGVECTOR_VERSION=v0.8.1
RUN git clone --depth 1 --branch "${PGVECTOR_VERSION}" https://github.com/pgvector/pgvector.git /tmp/pgvector \
 && make -C /tmp/pgvector && make -C /tmp/pgvector install \
 && rm -rf /tmp/pgvector && apk del build-base git postgresql17-dev
WORKDIR /opt/postgram
COPY --from=postgram-server /app ./
COPY --from=ui-builder /src/ui/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY run.sh /run.sh
RUN chmod +x /run.sh
EXPOSE 3000 3100
CMD ["/run.sh"]
