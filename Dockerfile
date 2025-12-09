# Build stage
FROM node:20-bullseye AS build

# Install ffmpeg for audio streaming
RUN apt-get update \ 
  && apt-get install -y ffmpeg \ 
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM node:20-bullseye AS runtime

# Install ffmpeg for runtime playback
RUN apt-get update \ 
  && apt-get install -y ffmpeg \ 
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/.env.example ./.env.example

CMD ["node", "dist/index.js"]
