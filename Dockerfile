# Build stage
FROM node:22-bookworm AS build

# Install ffmpeg, python, build tools, and yt-dlp
RUN apt-get update \ 
  && apt-get install -y ffmpeg python3 python-is-python3 build-essential libopus-dev yt-dlp \ 
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# Install deps without running postinstall scripts, then rebuild only native modules
RUN npm ci --ignore-scripts \
  && npm rebuild @discordjs/opus

COPY . .
RUN npm run build

# Runtime stage (use full image for native module build support)
FROM node:22-bookworm AS runtime

# Install ffmpeg, python, build tools, and yt-dlp
RUN apt-get update \ 
  && apt-get install -y ffmpeg python3 python-is-python3 build-essential libopus-dev yt-dlp \ 
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# Install deps without running postinstall scripts, then rebuild only native modules
RUN npm ci --omit=dev --ignore-scripts \
  && npm rebuild @discordjs/opus

COPY --from=build /app/dist ./dist

CMD ["node", "dist/src/index.js"]
