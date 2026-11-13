#!/bin/bash
set -e
service postgresql start
service redis-server start
# Configure listen address
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/16/main/postgresql.conf
# Configure pg_hba.conf to allow md5/scram-sha-256 for local ipv4 and ipv6
cat << 'EOF' > /etc/postgresql/16/main/pg_hba.conf
local   all             all                                     trust
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
host    all             all             0.0.0.0/0               scram-sha-256
EOF
service postgresql restart

su - postgres << 'EOF'
psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
psql -c "CREATE DATABASE bmsce_academic OWNER postgres;" || true
psql -d bmsce_academic -c "GRANT ALL PRIVILEGES ON DATABASE bmsce_academic TO postgres;"
EOF

echo "DATABASE READY!"

