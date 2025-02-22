FROM docker.elastic.co/logstash/logstash:8.14.3

USER root

COPY ./conf/logstash.yml /usr/share/logstash/config/logstash.yml

COPY ./pipeline /usr/share/logstash/pipeline
