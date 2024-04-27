#!/bin/bash
yum update -y
amazon-linux-extras install nginx1
yum install -y python3-pip

pip3 install flask
pip3 install gunicorn
pip3 install boto3

mkdir /home/ec2-user/app
touch /home/ec2-user/app/app.py
mkdir /home/ec2-user/logs

cat << 'EOF' > /home/ec2-user/app/app.py
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello World from EC2!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
EOF

