# syntax=docker/dockerfile:1
#
# Next.js 16 web app. Build context is the REPO ROOT (npm workspaces):
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
#     -t module-erp-web .
#
# IMPORTANT: NEXT_PUBLIC_API_URL is a BUILD argument, not a runtime variable.
# src/lib/api.ts reads it at module scope and every request runs in the browser,
# so Next inlines the value into the client bundle during `next build`. Setting it
# only in docker-compose's `environment:` has no effect — the shipped JS would
# still point at http://127.0.0.1:3001 and every API call from a user's browser
# would fail. Change the API URL => rebuild this image.

# ---------------------------------------------------------------- builder ----
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY apps/web apps/web

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Fail loudly at build time instead of shipping a bundle that points at localhost.
RUN test -n "$NEXT_PUBLIC_API_URL" \
  || (echo "ERROR: --build-arg NEXT_PUBLIC_API_URL=... is required" && exit 1)

WORKDIR /app/apps/web
RUN npm run build

# ----------------------------------------------------------------- runner ----
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# `output: "standalone"` emits a self-contained tree with only the traced
# dependencies, so there is no npm install in this stage. Because
# outputFileTracingRoot is the repo root, the layout inside .next/standalone
# mirrors the monorepo: node_modules/ at the top, server.js under apps/web/.
COPY --from=builder /app/apps/web/.next/standalone ./

# Next deliberately leaves these two out of the standalone bundle (it expects a
# CDN); server.js serves them once they are placed next to it.
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER node

EXPOSE 3000
# HOSTNAME must be 0.0.0.0 — the standalone server otherwise binds localhost only
# and nothing outside the container can reach it.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
