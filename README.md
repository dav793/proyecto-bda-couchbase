# Proyecto CouchbaseDB

Este documento contiene instrucciones paso a paso para instalar y ejecutar un contenedor de Docker corriendo Debian 11 y Couchbase DB.

## Instalar y ejecutar contenedor

1. Instalar y correr Docker

    [Descargar Docker](https://docs.docker.com/get-docker/).

2. Crear archivos de configuración

    **Mac OS/Linux:**
    ```bash
    cp .env.template .env
    nano .env
    ```

    **Windows:**
    ```cmd
    copy .env.template .env
    notepad .env

    copy .env.bat.template .env.bat
    notepad .env.bat
    ```

    * WORKING_DIR : Ruta del filesystem al proyecto (este directorio).
    * NETWORK_NAME : Nombre para la red de docker (puede usar valor por defecto).
    * VOLUME_NAME : Nombre para el volumen de docker (puede usar valor por defecto).
    * NODE_NAME : Nombre para el contenedor de docker que contiene el nodo de Couchbase (puede usar valor por defecto).

3. Crear red de docker (si no existe)

    **Mac OS/Linux:**
    ```bash
    source .env && docker network create --driver bridge ${NETWORK_NAME}
    ```

    **Windows:**
    ```cmd
    call .env.bat
    docker network create --driver bridge %NETWORK_NAME% 
    ```

4. Crear volumen de docker (si no existe)

    **Mac OS/Linux:**
    ```bash
    source .env && docker volume create --driver local --opt type=none --opt device=${WORKING_DIR} --opt o=bind ${VOLUME_NAME}
    ```

    **Windows:**
    ```cmd
    call .env.bat
    docker volume create --driver local --opt type=none --opt device=%WORKING_DIR% --opt o=bind %VOLUME_NAME%
    ```

5. Correr contenedor

    ```bash
    docker compose --env-file .env -f proyecto-cdb-docker/docker-compose.yml up
    ```

6. En otra terminal, abrir shell en contenedor en ejecución

    **Mac OS/Linux:**
    ```bash
    source .env && docker exec -it ${NODE_NAME} /bin/bash
    ```

    **Windows:**
    ```cmd
    call .env.bat
    docker exec -it %NODE_NAME% /bin/bash
    ```

7. Instalar Couchbase

    ```bash
    apt-get install -y couchbase-server
    ```

8. Navegar al panel de administración de Couchbase en la dirección `http://localhost:8091`

9. Utilizar el wizard para configurar la BD por primera vez, utilizando la siguiente configuración:
    * Cluster Name: `proyecto-bda`
    * Admin username: `Administrator`
    * Admin password: `12345678`

10. En la sección `Service Memory Quotas`, reducir la cuota de datos de `Search` a **256 MB** para mantenerse bajo el límite de 6784 MB

## Ejecutar

Luego de instalar el contenedor y haberlo detenenido, cuando quiera ejecutar el contenedor de nuevo será necesario correr Couchbase Server manualmente.
Para esto debe seguir los siguientes pasos:

1. Correr contenedor

    ```bash
    docker compose --env-file .env -f proyecto-cdb-docker/docker-compose.yml up
    ```

2. En otra terminal, abrir shell en contenedor en ejecución

    **Mac OS/Linux:**
    ```bash
    source .env && docker exec -it ${NODE_NAME} /bin/bash
    ```

    **Windows:**
    ```cmd
    call .env.bat
    docker exec -it %NODE_NAME% /bin/bash
    ```

3. Correr Couchbase Server

    ```bash
    /opt/couchbase/bin/couchbase-server
    ```

## Desinstalar contenedor

**Mac OS/Linux:**
```bash
source .env
docker container rm ${NODE_NAME}
docker image rm ${NODE_NAME}
docker network rm ${NETWORK_NAME}
docker volume rm ${VOLUME_NAME}
```

**Windows:**
```cmd
call .env.bat
docker container rm %NODE_NAME%
docker image rm %NODE_NAME%
docker network rm %NETWORK_NAME%
docker volume rm %VOLUME_NAME%
```