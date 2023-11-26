# CouchDB installation instructions

1. Pre-steps
```bash
printf '#!/bin/sh\nexit 0' > /usr/sbin/policy-rc.d      # avoid error: invoke-rc.d: policy-rc.d denied execution of start
```

2. Enable the Apache CouchDB package repository
```bash
apt install -y curl apt-transport-https gnupg
curl https://couchdb.apache.org/repo/keys.asc | gpg --dearmor | tee /usr/share/keyrings/couchdb-archive-keyring.gpg >/dev/null 2>&1
source /etc/os-release
echo "deb [signed-by=/usr/share/keyrings/couchdb-archive-keyring.gpg] https://apache.jfrog.io/artifactory/couchdb-deb/ ${VERSION_CODENAME} main" | tee /etc/apt/sources.list.d/couchdb.list >/dev/null
```

3. Install the Apache CouchDB packages
```bash
apt update
apt install -y couchdb
```

CouchDB installer will ask you some questions. Input the following and do not include the single quotes (`'`):

    1. Enter: '1' (standalone)
    2. Enter: '12345678' (Erlang magic cookie)
    3. Enter: '0.0.0.0' (CouchDB interface bind address)
    4. Enter: '12345678' (CouchDB "admin" user password)
    5. Repeat last step (Confirmation)

CouchDB will start running automatically

To run CouchDB manually (should not be necessary):
```bash
sudo -i -u couchdb /opt/couchdb/bin/couchdb
```

4. Enter the administration portal at `http://127.0.0.1:5984/_utils#setup`
- Username: `admin`
- Password: `12345678`