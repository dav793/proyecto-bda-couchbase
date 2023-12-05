# Proyecto CouchbaseDB - Data Importer

Este documento contiene instrucciones para instalar y ejecutar un contenedor de Docker que importa los datos de mediciones de instrumentos
extraídos de GOES en una base de datos implementada con Couchbase, por medio de un programa escrito en javascript y ejecutado por medio
de NodeJS.

Antes de seguir estos procedimientos debe efectuar todos los pasos contenidos en `README.md`. 

Para todos los procedimientos descritos aquí, debe posicionarse en el directorio `./data-importer`.

## Instalar contenedor

```cmd
docker compose --env-file ../.env -f ../proyecto-cdb-docker/docker-compose.importer.install.yml up
```

## Obtener dirección IP asignada por docker al contenedor de la base de datos y configurar Data Importer

**Mac OS/Linux:**
```bash
source ../.env && docker inspect -f {{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}} ${NODE_NAME}
```

**Windows:**
```cmd
call ../.env.bat
docker inspect -f {{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}} %NODE_NAME%
```

Copiar la dirección obtenida e introducir en la variable `DATABASE_ADDR` del archivo de configuración `.env`. 

Por ejemplo:
```
...
IMPORTER_SOURCE_FILES_DIR=source-files/mag_ACRF
DATABASE_ADDR=172.29.0.2
```

Adicionalmente **no** es necesario introducir la variable en el archivo `.env.bat`, incluso si utiliza Windows.

## Importar datos en la base de datos

Asegúrese que las siguientes tareas han sido completadas:
* Los archivos de fuente de datos `.csv` se encuentran en el directorio `source-files/mag_ACRF`.
* Configuró correctamente la dirección IP del contenedor de la base de datos en `.env`.
* Ha creado previamente en la base de datos un bucket llamado `GOES`.
* Ha creado previamente en la base de datos un scope llamado `magACRF`, contenido en el bucket `GOES`.

Nota: Para crear el bucket y el scope en la base de datos puede utilizar el panel de administración en `http://localhost:8091/ui/index.html`.

Luego, ejecutar:

```cmd
docker compose --env-file ../.env -f ../proyecto-cdb-docker/docker-compose.importer.yml up
```

## Desinstalar contenedor

**Mac OS/Linux:**
```bash
source ../.env
docker container rm ${IMPORTER_CONTAINER_NAME}
docker image rm ${IMPORTER_CONTAINER_NAME}
```

**Windows:**
```cmd
call ../.env.bat
docker container rm %IMPORTER_CONTAINER_NAME%
docker image rm %IMPORTER_CONTAINER_NAME%
```

## Extras

* Abrir shell en contenedor
    **Mac OS/Linux:**
    ```bash
    source .env && docker exec -it ${IMPORTER_CONTAINER_NAME} /bin/sh
    ```

    **Windows:**
    ```cmd
    call .env.bat
    docker exec -it %IMPORTER_CONTAINER_NAME% /bin/sh
    ```