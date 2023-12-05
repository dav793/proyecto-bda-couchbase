#!/bin/sh
cd "$(dirname "$0")"    # use script location as working directory

npm start
tail -f /dev/null