#!/bin/sh
cd "$(dirname "$0")"    # use script's location as working directory

echo "El contenedor está corriendo. Siga las instrucciones en README.md para instalar/ejectuar Couchbase."

tail -f /dev/null       # keep container running