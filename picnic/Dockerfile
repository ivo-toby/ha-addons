FROM ghcr.io/ivo-toby/mcp-picnic:latest

USER root
RUN apk add --no-cache jq
COPY run.sh /run.sh
RUN chmod 755 /run.sh

ARG BUILD_VERSION
ARG BUILD_ARCH
LABEL io.hass.version="${BUILD_VERSION}" io.hass.type="addon" io.hass.arch="${BUILD_ARCH}"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/run.sh"]
