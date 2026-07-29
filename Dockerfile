FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.15.1 --activate
WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build

FROM dependencies AS production-dependencies

RUN pnpm prune --prod

FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

RUN groupadd --gid 10001 nodeapp \
  && useradd --uid 10001 --gid nodeapp --create-home nodeapp

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER nodeapp
EXPOSE 3000

CMD ["node", "dist/main"]
