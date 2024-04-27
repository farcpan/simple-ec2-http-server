import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import {
  Instance,
  InstanceType,
  InstanceClass,
  InstanceSize,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  UserData,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
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

    // Linux用スクリプト
    const scripts = readFileSync("./lib/resources/user-data.sh", "utf8");

    // for SessionManager
    const role = new Role(this, "roleForSSM", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });
    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );

    // Creating EC2 instance
    const ec2Instance = new Instance(this, "InstanceForAMICreation", {
      machineImage: ami,
      instanceType: instanceType,
      securityGroup: securityGroup,
      role: role,
      vpc: defaultVpc,
    });
    ec2Instance.addUserData(scripts);
  }
}
