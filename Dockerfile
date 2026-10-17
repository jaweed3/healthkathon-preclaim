FROM oven/bun:1.3.14 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/core/package.json packages/core/package.json
COPY app/package.json app/package.json
COPY worker/package.json worker/package.json
COPY deck/package.json deck/package.json
RUN bun install --frozen-lockfile
COPY . .
RUN bun run --cwd app build

FROM nginx:1.27-alpine
COPY --from=build /app/app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4173
