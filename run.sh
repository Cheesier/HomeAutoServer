#!/usr/bin/with-contenv bashio

CONFIG_PATH=/data/options.json

COM_PORT="$(bashio::config 'ComPort')"

node -v
echo Hello world!! $COM_PORT

cat /data/options.json

MQTT_HOST=$(bashio::services mqtt "host")
MQTT_USER=$(bashio::services mqtt "username")
MQTT_PASSWORD=$(bashio::services mqtt "password")

# node server.js
node dist/index.js $MQTT_HOST $MQTT_USER $MQTT_PASSWORD