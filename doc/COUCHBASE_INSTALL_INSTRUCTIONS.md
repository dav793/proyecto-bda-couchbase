# Couchbase installation instructions

1. Download the meta package
```bash
curl -O https://packages.couchbase.com/releases/couchbase-release/couchbase-release-1.0-noarch.deb
```

2. Install the meta package
```bash
dpkg -i ./couchbase-release-1.0-noarch.deb
```

3. Reload the local package database
```bash
apt-get update
```

4. Install Couchbase Server
```bash
apt-get install -y couchbase-server
```

Couchbase will install and run in the background automatically.

5. Navigate to `http://localhost:8091` to configure your cluster for the first time, using the following configuration:
* Cluster Name: `proyecto-bda`
* Admin username: `Administrator`
* Admin password: `12345678`

6. On step `Service Memory Quotas`, reduce the `Search` quota to **256 MB** in order to remain under the 6784 MB limit.

7. Once you stop the container, the Couchbase service will be disabled the next time you run it. Use the following command to start it again:
```bash
/opt/couchbase/bin/couchbase-server
```