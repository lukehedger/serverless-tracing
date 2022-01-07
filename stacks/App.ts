import {
  App,
  ReactStaticSite,
  Stack,
  StackProps,
} from "@serverless-stack/resources";

interface AppStackProps extends StackProps {
  readonly ApiEndpoint: string;
}

export default class AppStack extends Stack {
  constructor(scope: App, id: string, props: AppStackProps) {
    super(scope, id, props);

    new ReactStaticSite(this, "ServerlessTracingApp", {
      environment: {
        REACT_APP_API_URL: props.ApiEndpoint,
      },
      path: "app",
    });
  }
}
