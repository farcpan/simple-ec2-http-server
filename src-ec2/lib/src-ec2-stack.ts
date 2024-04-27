import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  InstanceType,
  InstanceClass,
  InstanceSize,
  LaunchTemplate,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  UserData,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";

interface Ec2StackProps extends StackProps {}

export class SrcEc2Stack extends Stack {
  constructor(scope: Construct, id: string, props: Ec2StackProps) {
    super(scope, id, props);

    // VPC
    const vpcId = "vpc-08f6666901e21645b";
    const defaultVpc = Vpc.fromLookup(this, "defaultVpc", { vpcId: vpcId });

    // EC2
    const ami = MachineImage.latestAmazonLinux2();
    const instanceType = InstanceType.of(InstanceClass.T2, InstanceSize.MICRO);
    const securityGroup = new SecurityGroup(this, "securityGroup", {
      vpc: defaultVpc,
    });
    securityGroup.addIngressRule(
      Peer.ipv4("0.0.0.0/0"),
      Port.tcp(80),
      "Added by a CDK stack"
    );

    const userData = UserData.forLinux();
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

    // for SessionManager
    const role = new Role(this, "roleForSSM", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });
    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );

    const launchTemplate = new LaunchTemplate(this, "LaunchTemplate", {
      machineImage: ami,
      instanceType: instanceType,
      securityGroup: securityGroup,
      userData: userData,
      role: role,
    });

    const autoscalingGroup = new AutoScalingGroup(this, "autoscalingGroup", {
      vpc: defaultVpc,
      launchTemplate: launchTemplate,
    });
  }
}
