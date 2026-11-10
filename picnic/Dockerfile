# Build Picnic MCP from the verified upstream Git tag (not a GHCR image tag).
FROM node:22-alpine AS upstream-build
RUN apk add --no-cache git
RUN git clone --depth 1 --branch v1.15.1 https://github.com/ivo-toby/mcp-picnic.git /app
WORKDIR /app
RUN npm ci --ignore-scripts && npm run build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache jq su-exec \
    && addgroup -S -g 1638 mcp \
    && adduser -S -D -H -u 1638 -G mcp mcp
COPY --from=upstream-build /app/package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=upstream-build /app/dist ./dist
COPY --from=upstream-build /app/bin ./bin
COPY run.sh /run.sh
RUN chmod 755 /run.sh

ARG BUILD_VERSION
ARG BUILD_ARCH
LABEL io.hass.version="${BUILD_VERSION}" io.hass.type="addon" io.hass.arch="${BUILD_ARCH}"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/run.sh"]
