FROM python:3.12.4-bookworm

# Installer postgresql-client pour pg_isready
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copier les fichiers nécessaires
COPY daphne/requirements.txt /etc/
COPY daphne/django_setup.sh /django_setup.sh

# Rendre le script exécutable et installer les dépendances Python
RUN chmod +x /django_setup.sh
RUN pip3 install -r /etc/requirements.txt --no-cache-dir

# Définir le répertoire de travail
WORKDIR /transcendence

# Exposer le port
EXPOSE 8001

# Utiliser le script comme point d'entrée
ENTRYPOINT ["/django_setup.sh"]

# Commande par défaut (peut être surchargée dans docker-compose.yml)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8001", "config.asgi:application", "-v2"]


# FROM    python:3.12.4-bookworm
#
# COPY    daphne/requirements.txt /etc/
# COPY    daphne/django_setup.sh /django_setup.sh
#
# RUN     chmod +x /django_setup.sh
# RUN     pip3 install -r /etc/requirements.txt --no-cache-dir
#
# WORKDIR /transcendence
# EXPOSE  8001
# ENTRYPOINT ["/django_setup.sh"]
# CMD ["daphne", "-b", "0.0.0.0", "-p", "8001", "config.asgi:application", "-v2"]
