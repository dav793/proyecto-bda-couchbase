# Ejemplos de queries de Couchbase por medio de api REST

* Antes de efectuar cualquier query
    ```bash
    source ../.env
    ```

* Probar conexión con servidor de base de datos
    ```bash
    curl -X GET -u Administrator:12345678 http://${DATABASE_ADDR}:8091/ui/index.html
    curl -X GET -u Administrator:12345678 http://${DATABASE_ADDR}:8091/pools/default/buckets/GOES/scopes
    ```

* Crear bucket
    ```bash
    curl -X POST http://${DATABASE_ADDR}:8091/pools/default/buckets -u Administrator:12345678 -d name=GOES -d bucketType=couchbase -d ramQuota=512
    ```

* Crear scope
    ```bash
    curl -X POST http://${DATABASE_ADDR}:8091/pools/default/buckets/GOES/scopes -u Administrator:12345678 -d name=magACRF
    ```

* Crear colección
    ```bash
    curl -X POST http://${DATABASE_ADDR}:8093/query/service -u Administrator:12345678 -d "statement=CREATE COLLECTION GOES.magACRF.measurements"
    ```

* Crear índice primario
    ```bash
    curl -X POST http://${DATABASE_ADDR}:8093/query/service -u Administrator:12345678 -d "statement=CREATE PRIMARY INDEX idx_magACRF_measurements_primary ON GOES.magACRF.measurements USING GSI"
    ```

* Insertar documento
    ```bash
    curl -X POST http://${DATABASE_ADDR}:8093/query/service -u Administrator:12345678 -d "statement=INSERT INTO GOES.magACRF.measurements (KEY,VALUE) VALUES (\"1\", {\"id\": 1, \"timestamp\": \"2023-12-05T03:57:20.142Z\", \"reports\": [{\"number\": 1, \"samples\": [93.77, 93.76]},{\"number\": 2, \"samples\": [93.83, 93.81]}]})"
    ```

* Leer documento
    ```bash
    curl -X POST http://${DATABASE_ADDR}:8093/query/service -u Administrator:12345678 -d "statement=SELECT * FROM GOES.magACRF.measurements WHERE id = 1"
    ```