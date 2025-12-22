# Use Node.js 20 Alpine for lighter image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from the app directory
COPY app/package.json ./

# Install dependencies (using install since lockfile might be missing)
RUN npm install

# Copy the rest of the application code
COPY app/ .

# Build the Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy necessary files for running the app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
