FROM docker.elastic.co/elasticsearch/elasticsearch:8.14.3

COPY ./setup.sh /usr/share/elasticsearch/setup.sh

COPY ./dashboard.ndjson /usr/share/elasticsearch/config/dashboard.ndjson

USER root

RUN chmod +x /usr/share/elasticsearch/setup.sh

CMD ["/bin/bash", "/usr/share/elasticsearch/setup.sh"]
