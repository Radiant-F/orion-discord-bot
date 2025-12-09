# Build stage
FROM node:22-bookworm AS build

# Install ffmpeg and python for native deps
RUN apt-get update \ 
  && apt-get install -y ffmpeg python3 python-is-python3 \ 
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM node:22-bookworm-slim AS runtime

# Install ffmpeg for runtime playback
RUN apt-get update \ 
  && apt-get install -y ffmpeg python3 python-is-python3 \ 
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/.env.example ./.env.example

CMD ["node", "dist/index.js"]
