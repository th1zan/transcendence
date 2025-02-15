FROM    python:3.12.4-bookworm

COPY    requirements.txt /etc/

RUN     pip3 install -r /etc/requirements.txt --no-cache-dir

WORKDIR /transcendence
EXPOSE  8000
ENTRYPOINT ["gunicorn", "--log-level", "debug", "--bind", "0.0.0.0:8000" ,"config.wsgi:application"]
