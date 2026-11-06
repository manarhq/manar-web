# manar-web production image.
#
# Three stages: install deps, build with the full pnpm/Next.js toolchain,
# then run on a minimal node:24-alpine image containing only the traced
# `.next/standalone` output (see `output: "standalone"` in next.config.ts).
# No dev dependencies or build tools ship in the final image.

# Tag plus digest: the digest is what gets pulled; bump both together.
ARG NODE_VERSION=24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
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

# lib/env.ts's zod schema requires SESSION_SECRET (min 32 chars) and
# OIDC_CLIENT_SECRET (min 16 chars) with no `.default()` — every
# other server env var has one, these two deliberately don't so the app
# refuses to boot in a real environment without real values. `next build`
# eagerly evaluates that module during page-data collection for routes
# that import it transitively (app/api/auth/login, app/api/auth/logout ->
# lib/auth/oidc.ts -> lib/env.ts), so the build throws without *some*
# value present for both. These are static, build-stage-only placeholders
# to satisfy that eager validation during the trace/compile step — never
# real secrets, sized only to pass each schema check, not ARGs a caller is
# expected to override with anything sensitive, and NOT copied into the
# runner stage below (that stage sets neither var at all; the real values
# must come from the deployed environment's own secret store, see
# deploy/helm/manar-web/templates/secret.yaml or deploy/docker-compose.yml).
ARG SESSION_SECRET_BUILD_PLACEHOLDER="00000000000000000000000000000000"
ARG OIDC_CLIENT_SECRET_BUILD_PLACEHOLDER="0000000000000000"
ENV SESSION_SECRET=${SESSION_SECRET_BUILD_PLACEHOLDER}
ENV OIDC_CLIENT_SECRET=${OIDC_CLIENT_SECRET_BUILD_PLACEHOLDER}

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

# Upgrade Alpine packages: zlib 1.3.2-r1 fixes CVE-2026-85091 (HIGH)
RUN apk upgrade --no-cache

# node:24-alpine bundles npm + corepack in every stage (their own
# vulnerable-transitive-dep CVEs show up in image scans otherwise — see
# docs/kubernetes.md's container-hardening audit notes), but this runtime
# stage never invokes either: the app is started directly via `node
# server.js` below, and pnpm/npm/corepack are build-toolchain concerns only
# (stages 1-2). Stripping them keeps the "no build toolchain leaks into the
# final image" audit criterion true not just of pnpm's own footprint but of
# the base image's own bundled package managers too.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /opt/yarn-v* /usr/local/bin/yarn /usr/local/bin/yarnpkg

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
