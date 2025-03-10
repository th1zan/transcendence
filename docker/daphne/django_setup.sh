#!/bin/bash

# Fonction pour attendre que la base de données soit prête
wait_for_db() {
  echo "Waiting for PostgreSQL to be ready..."
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
    echo "PostgreSQL is not ready yet, retrying in 2 seconds..."
    sleep 2
  done
  echo "PostgreSQL is ready!"
}

# Check if Django project exists
if [[ ! -e /transcendence/manage.py ]]; then
  echo "The project seems to be missing manage.py"
  exit 1
fi

cd /transcendence

# Attendre que la base de données soit prête
wait_for_db

# Apply migrations to PostgreSQL
echo "Applying migrations..."
python manage.py makemigrations --settings=config.settings_prod
python manage.py migrate --settings=config.settings_prod
if [[ $? -ne 0 ]]; then
  echo "Migrations failed!"
  exit 1
fi

# Check if initial_data.json exists and import into PostgreSQL
if [[ -f /transcendence/fixtures/initial_data.json ]]; then
  echo "Found fixtures/initial_data.json, importing into PostgreSQL..."
  python manage.py loaddata fixtures/initial_data.json --settings=config.settings_prod
  if [[ $? -eq 0 ]]; then
    echo "Data imported successfully"
  else
    echo "Import failed"
    exit 1
  fi
else
  echo "No initial_data.json found, proceeding with an empty database."
fi

# Create superuser if it doesn’t exist
cat <<EOF | python manage.py shell --settings=config.settings_prod
from django.contrib.auth import get_user_model

User = get_user_model()
if not User.objects.filter(username='$SUPER_USER').exists():
    User.objects.create_superuser('$SUPER_USER', '$SUPER_MAIL', '$SUPER_PASSWORD')
EOF
echo "Django and superuser are setup."

yes yes | python manage.py collectstatic --settings=config.settings_prod

# Lancer daphne en arrière-plan
daphne -b 0.0.0.0 -p 8001 config.asgi:application &

# Lancer la boucle pour exécuter update_online_status toutes les 60 secondes
while true; do
  python /transcendence/manage.py update_online_status
  sleep 60
done

##!/bin/bash
#
## Fonction pour attendre que la base de données soit prête
#wait_for_db() {
#    echo "Waiting for PostgreSQL to be ready..."
#    until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
#        echo "PostgreSQL is not ready yet, retrying in 2 seconds..."
#        sleep 2
#    done
#    echo "PostgreSQL is ready!"
#}
#
## Check if Django project exists
#if [[ ! -e /transcendence/manage.py ]]; then
#    echo "The project seems to be missing manage.py"
#    exit 1
#fi
#
#cd /transcendence
#
## Attendre que la base de données soit prête
#wait_for_db
#
## Apply migrations to PostgreSQL
#echo "Applying migrations..."
#python manage.py makemigrations --settings=config.settings_prod
#python manage.py migrate --settings=config.settings_prod
#if [[ $? -ne 0 ]]; then
#    echo "Migrations failed!"
#    exit 1
#fi
#
## Check if initial_data.json exists and import into PostgreSQL
#if [[ -f /transcendence/fixtures/initial_data.json ]]; then
#    echo "Found fixtures/initial_data.json, importing into PostgreSQL..."
#    python manage.py loaddata fixtures/initial_data.json --settings=config.settings_prod
#    if [[ $? -eq 0 ]]; then
#        echo "Data imported successfully"
#    else
#        echo "Import failed"
#        exit 1
#    fi
#else
#    echo "No initial_data.json found, proceeding with an empty database."
#fi
#
## Create superuser if it doesn’t exist
#cat <<EOF | python manage.py shell --settings=config.settings_prod
#from django.contrib.auth import get_user_model
#
#User = get_user_model()
#if not User.objects.filter(username='$SUPER_USER').exists():
#    User.objects.create_superuser('$SUPER_USER', '$SUPER_MAIL', '$SUPER_PASSWORD')
#EOF
#echo "Django and superuser are setup."
#
#yes yes | python manage.py collectstatic --settings=config.settings_prod
#
## Lancer daphne en arrière-plan
#daphne -b 0.0.0.0 -p 8001 config.asgi:application &
#
## Lancer la boucle pour exécuter update_online_status toutes les 60 secondes
#while true; do
#    python /transcendence/manage.py update_online_status
#    sleep 60
#done

# OLD  VERSION

##!/bin/bash
#
## Check if Django project exists
#if [[ ! -e /transcendence/manage.py ]]; then
#	echo "The project seems to be missing manage.py"
#	exit 1
#else
#	cd /transcendence
#	python manage.py makemigrations --settings=config.settings_prod
#	python manage.py migrate --settings=config.settings_prod
#	cat <<EOF | python manage.py shell --settings=config.settings_prod
#from django.contrib.auth import get_user_model
#
#User = get_user_model()  # get the currently active user model
#
## Check if the admin user exists, and if not, create it
#if not User.objects.filter(username='$SUPER_USER').exists():
#    User.objects.create_superuser('$SUPER_USER', '$SUPER_MAIL', '$SUPER_PASSWORD')
#EOF
#	echo "Django and superuser are setup."
#fi
#yes yes | python manage.py collectstatic --settings=config.settings_prod
#exec "$@"
#
