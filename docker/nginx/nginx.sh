#!/bin/bash

if [[ ! -e /ssl/cert.crt ]]; then
	mkdir -p /ssl
	openssl req -newkey rsa:4096 \
		-x509 -keyout /ssl/key.key \
		-out /ssl/cert.crt -sha256 \
		-days 500 -nodes -subj \
		"/C=CH/ST=Vaud/L=Lausanne/O=42Lausanne/OU=42Lausanne/CN=legendary-transcendence"
	echo "SSL certificate and key created."
fi
exec "$@"
