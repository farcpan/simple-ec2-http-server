#!/bin/bash
yum update -y
amazon-linux-extras install nginx1
yum install -y python3-pip

# Python libraries
pip3 install flask
pip3 install gunicorn
pip3 install boto3

# Python script files
mkdir /home/ec2-user/app
touch /home/ec2-user/app/app.py
mkdir /home/ec2-user/logs

# Python script file
cat << 'EOF' > /home/ec2-user/app/app.py
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello World from EC2!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
EOF

# nginx web server
mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
touch /etc/nginx/nginx.conf
cat << 'EOF' > /etc/nginx/nginx.conf
# For more information on configuration, see:
#   * Official English Documentation: http://nginx.org/en/docs/
#   * Official Russian Documentation: http://nginx.org/ru/docs/

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

# Load dynamic modules. See /usr/share/doc/nginx/README.dynamic.
include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Load modular configuration files from the /etc/nginx/conf.d directory.
    # See http://nginx.org/en/docs/ngx_core_module.html#include
    # for more information.
    include /etc/nginx/conf.d/*.conf;

    server {
        listen       80;
        listen       [::]:80;
        server_name  _;
        root         /home/ec2-user/app;

        location / {
                try_files $uri @flask;
        }

        location @flask {
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_redirect off;
                proxy_pass http://127.0.0.1:8000; 
        }
    }
}
EOF

# creating start shell script
touch /home/ec2-user/app/start.sh
chmod 755 /home/ec2-user/app/start.sh
cat << 'EOF' > /home/ec2-user/app/start.sh
#!/bin/bash

systemctl enable nginx
cd /home/ec2-user/app
gunicorn app:app --daemon
EOF

source /home/ec2-user/app/start.sh
