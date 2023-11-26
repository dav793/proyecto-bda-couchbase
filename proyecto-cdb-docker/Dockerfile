FROM debian:11-slim
ARG DEBIAN_FRONTEND=noninteractive
RUN apt update

# Timezone
ENV TZ=America/Costa_Rica
RUN apt install -y tzdata

# Herramientas adicionales
RUN apt install -y sudo curl

# Couchbase
RUN curl -O https://packages.couchbase.com/releases/couchbase-release/couchbase-release-1.0-noarch.deb
RUN dpkg -i ./couchbase-release-1.0-noarch.deb
RUN apt-get update

WORKDIR /projects/couchbase-project