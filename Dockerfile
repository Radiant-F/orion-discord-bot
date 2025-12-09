# Build stage
FROM node:22-bookworm AS build

# Install ffmpeg, python and build tools for native deps
RUN apt-get update \ 
  && apt-get install -y ffmpeg python3 python-is-python3 build-essential libopus-dev \ 
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage (use full image for native module build support)
FROM node:22-bookworm AS runtime

# Install ffmpeg, python and build tools for @discordjs/opus compilation
RUN apt-get update \ 
  && apt-get install -y ffmpeg python3 python-is-python3 build-essential libopus-dev \ 
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

CMD ["node", "dist/src/index.js"]
