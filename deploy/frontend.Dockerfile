# Zoustec frontend (Next.js — nextjs-zoustec) — production image
#
# NEXT_PUBLIC_* and BACKEND_INTERNAL_URL must be present AT BUILD TIME:
#  - NEXT_PUBLIC_*  gets inlined into the client bundle
#  - BACKEND_INTERNAL_URL pins the /api/* rewrites at build (Next 14)
# Render passes env vars as build-args for the ARGs declared below.

FROM node:20-alpine AS deps
WORKDIR /app
COPY nextjs-zoustec/package.json nextjs-zoustec/package-lock.json ./
# canvas stub (npm overrides "canvas: file:./vendor/canvas-stub") must exist before npm ci
COPY nextjs-zoustec/vendor ./vendor
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY nextjs-zoustec/ .

ARG NEXT_PUBLIC_LIFF_ID
ARG NEXT_PUBLIC_TENANT_SLUG=bnk
ARG BACKEND_INTERNAL_URL
ENV NEXT_PUBLIC_LIFF_ID=$NEXT_PUBLIC_LIFF_ID \
    NEXT_PUBLIC_TENANT_SLUG=$NEXT_PUBLIC_TENANT_SLUG \
    BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app .
EXPOSE 3000
# Render provides $PORT at runtime
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
