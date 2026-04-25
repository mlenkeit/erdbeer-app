FROM php:8.1-cli

RUN apt-get update && apt-get install -y unzip git && rm -rf /var/lib/apt/lists/*
RUN docker-php-ext-install pdo_mysql

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json ./
RUN composer install --no-interaction --no-progress

COPY tests/ tests/

CMD ["vendor/bin/phpunit", "--colors=always", "-c", "tests/phpunit.xml"]
