FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

# Run pending migrations, then start Next.js
CMD ["sh", "-c", "npx drizzle-kit migrate && npx next start -p 3000"]
