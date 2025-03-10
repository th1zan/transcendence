#!/bin/bash

# Fonction de vérification des variables d'environnement
check_environment_variables() {
    if [ -z "${ELASTIC_PASSWORD}" ] || [ -z "${KIBANA_PASSWORD}" ] || [ -z "${ELASTIC_USERNAME}" ]; then
        echo "Set the ELASTIC_PASSWORD KIBANA_PASSWORD, and ELASTIC_USERNAME environment variables in the .env file"
        exit 1
    fi
}

# Fonction de création des certificats
setup_certificates() {
    # Création du certificat d'autorité (CA)
    if [ ! -f config/certs/ca.zip ]; then
        echo "Creating CA"
        bin/elasticsearch-certutil ca --silent --pem -out config/certs/ca.zip
        unzip config/certs/ca.zip -d config/certs
    fi

    # Création des certificats pour chaque service
    if [ ! -f config/certs/certs.zip ]; then
        echo "Creating certs"
        cat > config/certs/instances.yml <<EOL
instances:
  - name: elasticsearch
    dns:
      - elasticsearch
      - localhost
    ip:
      - 127.0.0.1
  - name: kibana
    dns:
      - kibana
      - localhost
    ip:
      - 127.0.0.1
  - name: logstash
    dns:
      - logstash
      - localhost
    ip:
      - 127.0.0.1
EOL
        echo "Creating certs for elasticsearch, kibana, and logstash"
        bin/elasticsearch-certutil cert --silent --pem -out config/certs/certs.zip --in \
          config/certs/instances.yml --ca-cert config/certs/ca/ca.crt --ca-key config/certs/ca/ca.key
        unzip config/certs/certs.zip -d config/certs
    fi

    # Configuration des permissions
    echo "Setting file permissions"
    chown -R root:root config/certs
    find config/certs -type d -exec chmod 750 {} \;
    find config/certs -type f -exec chmod 640 {} \;
}

# Fonction d'attente de disponibilité d'Elasticsearch
wait_for_elasticsearch() {
    echo "Waiting for Elasticsearch availability..."
    until curl -s -k https://elasticsearch:9200 | grep -q "missing authentication credentials"; do 
        sleep 5
    done
}

# Fonction de configuration des politiques ILM
setup_ilm_policy() {
    echo "Setting up ILM policy"
    curl -s -X PUT "https://elasticsearch:9200/_ilm/policy/nginx-logs-policy" \
      --cacert config/certs/ca/ca.crt \
      -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
      -H "Content-Type: application/json" \
      -d '{
            "policy": {
              "phases": {
                "hot": {"min_age": "0ms","actions": {}},
                "warm": {"min_age": "2d","actions": {"allocate": {"number_of_replicas": 0}}},
                "cold": {"min_age": "7d","actions": {"readonly": {}}},
                "delete": {"min_age": "30d","actions": {"delete": {}}}
              },
              "_meta": {"description": "ILM policy using the hot, warm(2 days) and cold(7 days) phases with a retention of 30 days"}
            }
          }' | grep -q '"acknowledged":true' || exit 1
}

# Fonction de configuration du template d'index
setup_index_template() {
    echo "Setting up index template"
    curl -s -X PUT "https://elasticsearch:9200/_index_template/nginx-logs-template" \
      --cacert config/certs/ca/ca.crt \
      -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
      -H "Content-Type: application/json" \
      -d '{
            "index_patterns": ["nginx-logs-*"],
            "template": {
              "settings": {
                "index.lifecycle.name": "nginx-logs-policy",
                "number_of_shards": 1,
                "number_of_replicas": 1
              }
            }
          }' | grep -q '"acknowledged":true' || exit 1
}

# Fonction de configuration de Kibana
setup_kibana() {
    echo "Setting up Kibana password"
    curl -s \
      -X POST https://elasticsearch:9200/_security/user/kibana_system/_password \
      --cacert config/certs/ca/ca.crt \
      -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
      -H "Content-Type: application/json" \
      -d "{\"password\":\"${KIBANA_PASSWORD}\"}" | grep -q "^{}" || exit 1

    echo "Waiting for Kibana availability..."
    until curl -s -k https://kibana:5601/api/status | grep -q '"level":"available"'; do 
        sleep 5
    done

    echo "Importing Kibana Dashboard"
    curl -s -k \
        -X POST "https://kibana:5601/api/saved_objects/_import" \
        -u "${ELASTIC_USERNAME}:${KIBANA_PASSWORD}" \
        -H "kbn-xsrf: true" \
        -H "Content-Type: multipart/form-data" \
        --form file=@/usr/share/elasticsearch/config/dashboard.ndjson \
        | grep -q '"success":true' || exit 1
}

# Fonction de nettoyage
cleanup() {
    echo "All done!, removing the setup container"
    CONTAINER_ID=$(hostname)
    curl -s \
      -X DELETE "http://localhost/containers/${CONTAINER_ID}?force=true" \
      --unix-socket /var/run/docker.sock
}

# Exécution principale
main() {
    check_environment_variables
    setup_certificates
    wait_for_elasticsearch
    setup_ilm_policy
    setup_index_template
    setup_kibana
    cleanup
}

# Lancement du script
main