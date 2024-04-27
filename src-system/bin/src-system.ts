import { App } from "aws-cdk-lib";
import { SystemStack } from "../lib/src-system-stack";

const app = new App();
new SystemStack(app, "SystemStack", {
  env: {
    region: "ap-northeast-1",
  },
});
