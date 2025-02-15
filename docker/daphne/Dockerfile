FROM    python:3.12.4-bookworm

COPY    daphne/requirements.txt /etc/
COPY    daphne/django_setup.sh /django_setup.sh

RUN     chmod +x /django_setup.sh
RUN     pip3 install -r /etc/requirements.txt --no-cache-dir

WORKDIR /transcendence
EXPOSE  8001
ENTRYPOINT ["/django_setup.sh"]
CMD ["daphne", "-b", "0.0.0.0", "-p", "8001", "config.asgi:application", "-v2"]
