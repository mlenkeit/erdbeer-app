FROM php:8.1-apache

RUN docker-php-ext-install pdo_mysql
RUN a2enmod rewrite
RUN echo '<Directory /var/www/html>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/allow-override.conf
RUN a2enconf allow-override
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN echo "zend.assertions = -1" > /usr/local/etc/php/conf.d/test-settings.ini
