#!/bin/bash

# Check if Django project exists
if [[ ! -e /transcendence/manage.py ]]; then
	echo "The project seems to be missing manage.py"
	exit 1
else
	cd /transcendence
	python manage.py makemigrations --settings=config.settings_prod
	python manage.py migrate --settings=config.settings_prod
	cat <<EOF | python manage.py shell --settings=config.settings_prod
from django.contrib.auth import get_user_model

User = get_user_model()  # get the currently active user model

# Check if the admin user exists, and if not, create it
if not User.objects.filter(username='$SUPER_USER').exists():
    User.objects.create_superuser('$SUPER_USER', '$SUPER_MAIL', '$SUPER_PASSWORD')
EOF
	echo "Django and superuser are setup."
fi
yes yes | python manage.py collectstatic --settings=config.settings_prod
exec "$@"
