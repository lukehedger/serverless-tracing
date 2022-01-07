import { App } from "@serverless-stack/resources";
import ApiStack from "./Api";
import AppStack from "./App";

export default function main(app: App): void {
  app.setDefaultFunctionProps({
    runtime: "nodejs14.x",
  });

  const apiStack = new ApiStack(app, "serverless-tracing-api");

  new AppStack(app, "serverless-tracing-app", {
    ApiEndpoint: apiStack.ApiEndpoint,
  });
}
