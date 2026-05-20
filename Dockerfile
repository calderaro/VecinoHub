FROM node:22-alpine
RUN npm install -g pnpm@9.15.4

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Placeholders so Next.js can collect page data at build time. These do NOT
# need to be real values — runtime gets the actual values via docker-compose env.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime
ENV BETTER_AUTH_URL=http://localhost:3000
ENV SKIP_ENV_VALIDATION=1

RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3000

# Run pending migrations, then start Next.js
CMD ["sh", "-c", "pnpm exec drizzle-kit migrate && pnpm exec next start -p 3000"]
