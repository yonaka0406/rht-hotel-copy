# ---- 1. Builder Stage ----
# Use the official Node.js 22 image based on Debian 12 (Bookworm)
FROM node:22 AS builder

# Install build tools and system fonts
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    # Install fonts for PDF generation
    fonts-liberation \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fonts-ipafont \
    fonts-ipafont-gothic \
    fonts-ipafont-mincho \
    fonts-roboto \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies for both root and frontend
RUN npm install
RUN npm --prefix frontend install --force --legacy-peer-deps

# Now, copy the rest of the source code
COPY . .

# Clear npm cache and reinstall/rebuild native modules after copying source
# This ensures native binaries are built for the correct architecture
RUN npm cache clean --force
RUN rm -rf frontend/node_modules/.cache

# Remove node_modules entirely and reinstall fresh
RUN rm -rf frontend/node_modules
# Use npm ci for more reliable builds if package-lock exists
RUN if [ -f "frontend/package-lock.json" ]; then \
    npm --prefix frontend ci --force; \
    else \
    npm --prefix frontend install --force --legacy-peer-deps; \
    fi

# Rebuild specific native modules that commonly cause issues in Docker
# Focus on Tailwind CSS v4 native dependencies
RUN cd frontend && npm rebuild @tailwindcss/oxide --force || true
RUN cd frontend && npm rebuild lightningcss --force || true
RUN cd frontend && npm rebuild esbuild --force || true

# If native rebuilds fail, try installing platform-specific packages
RUN cd frontend && npm install @tailwindcss/oxide-linux-x64-gnu --save-dev --force || true
RUN cd frontend && npm install lightningcss-linux-x64-gnu --save-dev --force || true

# Build the frontend
ENV NODE_ENV=production
RUN npm run build:frontend

# Remove development dependencies for a smaller final image
RUN npm prune --production

# ---- 2. Production Stage ----
# Use the lighter -slim version of the same Debian release for the final image
FROM node:22 AS production

# Install runtime dependencies, system fonts, and Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips \
    # Install Chromium and its dependencies
    chromium \
    # Install fonts for PDF generation
    fonts-liberation \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fonts-ipafont \
    fonts-ipafont-gothic \
    fonts-ipafont-mincho \
    fonts-roboto \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    fonts-dejavu \
    fonts-dejavu-core \
    fonts-dejavu-extra \
    fonts-droid-fallback \
    fonts-symbola \
    fonts-opensymbol \
    # Required for fontconfig
    fontconfig \
    # Additional font tools
    fontconfig-config \
    fonts-dejavu-core \
    fonts-dejavu-extra \
    # Clean up
    && fc-cache -f -v \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /usr/share/fonts/truetype/dejavu \
    && ln -s /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf /usr/share/fonts/ \
    && ln -s /usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc /usr/share/fonts/ \
    && ln -s /usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc /usr/share/fonts/

ENV NODE_ENV=production
WORKDIR /usr/src/app

# Create a non-root user for better security
RUN addgroup --system --gid 1001 appgroup && adduser --system --uid 1001 --ingroup appgroup --home /usr/src/app appuser

# Copy package files from the builder stage
COPY --from=builder /usr/src/app/package*.json ./

RUN npm install --production --include=optional sharp
# Copy only the necessary production artifacts from the builder stage
COPY --from=builder --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /usr/src/app/frontend/dist ./frontend/dist
COPY --from=builder --chown=appuser:appgroup /usr/src/app/api ./api
COPY --from=builder --chown=appuser:appgroup /usr/src/app/package*.json ./

# Change ownership of the app directory itself. This allows the non-root user
# (and pm2) to create necessary files like the .pm2 folder.
RUN chown appuser:appgroup /usr/src/app

USER appuser
EXPOSE 3000

# Start the backend server using pm2-runtime for containerized environments
CMD [ "npx", "pm2-runtime", "start", "api/index.js" ]