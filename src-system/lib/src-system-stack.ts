import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  InstanceType,
  InstanceClass,
  InstanceSize,
  MachineImage,
  Port,
  SecurityGroup,
  SubnetType,
  UserData,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import {
  ApplicationLoadBalancer,
  ApplicationTargetGroup,
  ListenerAction,
  ListenerCondition,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  Distribution,
  HttpVersion,
  OriginProtocolPolicy,
  OriginRequestPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { LoadBalancerV2Origin } from "aws-cdk-lib/aws-cloudfront-origins";

interface SystemStackProps extends StackProps {}

export class SystemStack extends Stack {
  constructor(scope: Construct, id: string, props: SystemStackProps) {
    super(scope, id, props);

    // S3
    const bucket = new Bucket(this, "NewBucket", {
      bucketName: "simple-ec2-api-sample-bucket-20240427",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // VPC
    const vpc = new Vpc(this, "SampleVpc", {
      //ipAddresses: IpAddresses.cidr("10.0.0.0/16"),
      vpcName: "cdk-sample-vpc",
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public-subnet",
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });

    // SecurityGroup
    const asgSecurityGroup = new SecurityGroup(this, "asgSecurityGroup", {
      vpc: vpc,
      allowAllOutbound: true,
    });
    const albSecurityGroup = new SecurityGroup(this, "albSecurituGroup", {
      vpc: vpc,
      allowAllOutbound: true,
    });
    /// ALB -> ASGを許可する
    asgSecurityGroup.connections.allowFrom(
      albSecurityGroup,
      Port.tcp(80),
      "Allow ALB to ASG"
    );

    const userData = UserData.forLinux();
    userData.addCommands();

    // Role attached to EC2(ASG)
    const role = new Role(this, "roleForSSM", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });
    /// for Session Manager
    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );
    /// for S3 access
    role.addManagedPolicy(
      new ManagedPolicy(this, "s3-access-policy", {
        document: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["s3:*"],
              resources: [bucket.bucketArn],
            }),
          ],
        }),
      })
    );

    // EC2(ASG)
    const amiId = "ami-0ebe609b6780483ac";
    const autoscalingGroup = new AutoScalingGroup(this, "autoscalingGroup", {
      vpc: vpc,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: MachineImage.genericLinux({
        [props.env?.region ?? "ap-northeast-1"]: amiId,
      }),
      desiredCapacity: 1,
      minCapacity: 1,
      maxCapacity: 2,
      role: role,
    });
    autoscalingGroup.addSecurityGroup(asgSecurityGroup);
    autoscalingGroup.scaleOnCpuUtilization("CPU50Percent", {
      targetUtilizationPercent: 50,
    });

    // ALB
    const targetGroup = new ApplicationTargetGroup(
      this,
      "target_group_of_alb",
      {
        port: 80,
        vpc: vpc,
        targets: [autoscalingGroup],
      }
    );
    const alb = new ApplicationLoadBalancer(this, "NewALB", {
      vpc,
      internetFacing: true,
      loadBalancerName: "test-alb-to-asg",
      securityGroup: albSecurityGroup,
    });
    const listener = alb.addListener("Listener", {
      port: 80,
      // デフォルトは403エラー
      defaultAction: ListenerAction.fixedResponse(403, {
        contentType: "text/plain",
        messageBody: "Access Denied",
      }),
    });
    listener.addAction("custom-header", {
      priority: 1,
      conditions: [
        ListenerCondition.httpHeader("X-Custom-Header", ["Akl781A0cs2155p"]),
      ],
      action: ListenerAction.forward([targetGroup]),
    });

    // ALB - AutoScalingGroup combined
    /*
    listener.addTargets("Target", {
      targets: [autoscalingGroup],
      port: 80,
    });
    */

    ////////////////////////////////////////////////////////////////////////////////
    // CloudFront
    ////////////////////////////////////////////////////////////////////////////////
    const distribution = new Distribution(this, "distribution", {
      comment: "for I/F of ALB",
      defaultBehavior: {
        origin: new LoadBalancerV2Origin(alb, {
          protocolPolicy: OriginProtocolPolicy.HTTP_ONLY, // ALB側はHTTP
          customHeaders: {
            "X-Custom-Header": "Akl781A0cs2155p",
          },
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // HOSTヘッダだけは転送しない
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      httpVersion: HttpVersion.HTTP2,
      priceClass: PriceClass.PRICE_CLASS_200,
    });

    ////////////////////////////////////////////////////////////////////////////////
    // Outputs
    ////////////////////////////////////////////////////////////////////////////////
    // ALB DNS name output
    new CfnOutput(this, "ALBDNS", { value: alb.loadBalancerDnsName });
  }
}
