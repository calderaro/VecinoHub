FROM node:22-alpine
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3000

# Run pending migrations, then start Next.js
CMD ["sh", "-c", "pnpm exec drizzle-kit migrate && pnpm exec next start -p 3000"]
