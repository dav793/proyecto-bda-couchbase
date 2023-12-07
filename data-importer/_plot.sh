#!/bin/sh
cd "$(dirname "$0")"    # use script location as working directory

./_plot-mag.sh
./_plot-xr.sh
./_plot-sac.sh