import { App } from "aws-cdk-lib";
import { SrcEc2Stack } from "../lib/src-ec2-stack";

const region = "ap-northeast-1" as const;

const app = new App();

// creating simple EC2 instance
new SrcEc2Stack(app, "SrcEc2Stack", {
  env: { region: region, account: "910136156309" },
});
