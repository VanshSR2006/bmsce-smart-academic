#!/bin/bash
echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/16/main/pg_hba.conf
echo "host all all ::0/0 md5" >> /etc/postgresql/16/main/pg_hba.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/16/main/postgresql.conf
su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/16/main reload"
service redis-server restart || /usr/bin/redis-server --daemonize yes
echo "CONFIGURED"

