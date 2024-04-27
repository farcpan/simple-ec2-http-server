# EC2 image for AMI creation

## userData (initial command when EC2 booted)

```typescript
userData.addCommands(
      "yum update -y",
      "amazon-linux-extras install nginx1",
      "yum install -y python3-pip",
      "pip3 install flask",
      "pip3 install gunicorn",
      "pip3 install boto3",
      "mkdir /home/ec2-user/app",
      "touch /home/ec2-user/app/app.py",
      "mkdir /home/ec2-user/logs"
);
```

---

## after creation of EC2 instance

### login instance from SessionManager

login by `ec2-user`. 

```
$ sudo su --login ec2-user
```

### app.py

```python
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello World!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### nginx.conf

`sudo vi /etc/nginx/nginx.conf`

```
server {
    listen       80;
    listen       [::]:80;
    server_name  _,;
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
```

### testing application boot

```
$ sudo service nginx restart 
$ cd /home/ec2-user/app     
$ gunicorn app:app
```

---
