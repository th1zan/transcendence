FROM nginx:1.25.3

# Installation de curl pour le healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Créer d'abord les fichiers de logs
RUN mkdir -p /var/log/nginx && \
    touch /var/log/nginx/access.log /var/log/nginx/error.log && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod 644 /var/log/nginx/*.log && \
    rm -f /var/log/nginx/access.log /var/log/nginx/error.log && \
    touch /var/log/nginx/access.log /var/log/nginx/error.log && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod 644 /var/log/nginx/*.log

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx.sh /docker-entrypoint.d/

# Rendre le script exécutable
RUN chmod +x /docker-entrypoint.d/nginx.sh

# Exécuter Nginx en premier plan
CMD ["nginx", "-g", "daemon off;"] 