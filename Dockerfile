# Build stage
FROM node:22-bookworm AS build

# Install ffmpeg, python, build tools, and yt-dlp
RUN apt-get update \ 
  && apt-get install -y ffmpeg python3 python-is-python3 build-essential libopus-dev yt-dlp \ 
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# Skip youtube-dl-exec postinstall (we use system yt-dlp)
RUN npm ci --ignore-scripts
# Run other postinstalls manually (for @discordjs/opus etc)
RUN npm rebuild

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
# Skip youtube-dl-exec postinstall (we use system yt-dlp)
RUN npm ci --omit=dev --ignore-scripts
# Run other postinstalls manually (for @discordjs/opus etc)
RUN npm rebuild

COPY --from=build /app/dist ./dist

CMD ["node", "dist/src/index.js"]
