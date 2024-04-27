# EC2 image for AMI creation

## userData (initial command when EC2 booted)

Defined in `lib/resources/user-data.sh`.

---

## after creation of EC2 instance

### login instance from SessionManager

login by `ec2-user`. 

```
$ sudo su --login ec2-user
```

---

## 参考

* [EC2のAmazon LinuxにNginxを入れてFlaskを動かす方法](https://zenn.dev/century/articles/6b7d6ad29605f8)
* [AWS CDKでVPC、サブネット、EC2を作成してみる](https://dev.classmethod.jp/articles/aws-cdk-vpc-subnet-ec2/)
* [Amazon Linux 2 が起動してネットワークが有効になった後で自作スクリプトを実行する方法を調べてみた](https://dev.classmethod.jp/articles/sugano-046-al2-systemd/)

---
