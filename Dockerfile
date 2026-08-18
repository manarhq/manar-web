# syntax=docker/dockerfile:1

# manar-web production image.
#
# Three stages: install deps, build with the full pnpm/Next.js toolchain,
# then run on a minimal node:24-alpine image containing only the traced
# `.next/standalone` output (see `output: "standalone"` in next.config.ts).
# No dev dependencies or build tools ship in the final image.

ARG NODE_VERSION=24-alpine
ARG PNPM_VERSION=11.20.0

# ---------------------------------------------------------------------------
# Stage 1: dependencies
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS dependencies
ARG PNPM_VERSION
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: build
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
ARG PNPM_VERSION
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ---------------------------------------------------------------------------
# Stage 3: runtime
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# node:24-alpine already ships an unprivileged "node" user (uid/gid 1000).
COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir .next && chown node:node .next

# Standalone output: a minimal server.js plus only the node_modules each
# page actually needs, traced during `next build`.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --spider --tries=1 http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "server.js"]
