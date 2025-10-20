# ---------- Stage 1: Build Frontend (Vite) ----------
FROM node:18-alpine AS frontend
WORKDIR /app

# Only copy frontend first for caching
COPY frontend/package*.json ./
RUN npm ci

# Copy the rest of the frontend and build
COPY frontend/ ./
# Ensure your vite.config.ts outputs to ../backend/public/build
# (as you already have)
RUN npm run build

# ---------- Stage 2: PHP + Apache ----------
FROM php:8.2-apache AS app

# Install system deps and PHP extensions
RUN apt-get update && apt-get install -y \
    git curl unzip libzip-dev libonig-dev \
    && docker-php-ext-install pdo pdo_mysql mbstring zip

# Enable Apache mods commonly needed
RUN a2enmod rewrite headers

# Set working dir to Laravel app root
WORKDIR /var/www/html

# Copy backend (Laravel) code only
COPY backend/composer.json backend/composer.lock ./
# Install Composer (copy the binary)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev --prefer-dist --no-interaction --no-scripts

# Copy the rest of the backend app
COPY backend/ ./

# Copy built frontend into Laravel public/build
COPY --from=frontend /app/dist/ ./public/build/
# ^ If your Vite already outputs to backend/public/build directly,
#   then replace the line above with:
# COPY --from=frontend /app/../backend/public/build ./public/build

# Set proper permissions for storage/bootstrap (Apache runs as www-data)
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rw storage bootstrap/cache

# Apache listens on 80 by default
EXPOSE 80

# Optional: Build-time caches (won't run without .env)
# Avoid running artisan cache:clear here; instead do at runtime if needed.

# Start Apache in foreground
CMD ["apache2-foreground"]
