#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq postgresql redis-server
service postgresql start
service redis-server start
# Configure postgres to allow password authentication from localhost
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/*/main/postgresql.conf || true
echo "host all all 127.0.0.1/32 md5" >> /etc/postgresql/*/main/pg_hba.conf || true
echo "host all all ::1/128 md5" >> /etc/postgresql/*/main/pg_hba.conf || true
service postgresql restart

su - postgres << 'EOF'
psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
psql -c "CREATE DATABASE bmsce_academic OWNER postgres;" || true
psql -d bmsce_academic -c "GRANT ALL PRIVILEGES ON DATABASE bmsce_academic TO postgres;"
EOF

echo "PostgreSQL and Redis successfully configured and running!"

