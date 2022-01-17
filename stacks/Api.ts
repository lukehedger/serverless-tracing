import { RemovalPolicy } from "@aws-cdk/core";
import {
  ApiGatewayV1Api,
  App,
  EventBus,
  Function,
  Stack,
  StackProps,
  Table,
  TableFieldType,
} from "@serverless-stack/resources";

export default class ApiStack extends Stack {
  public readonly ApiEndpoint: string;

  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const orderTable = new Table(this, "OrderTable", {
      dynamodbTable: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      fields: {
        orderId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "orderId" },
    });

    const storeOrderFunction = new Function(this, "StoreOrderFunction", {
      environment: {
        POWERTOOLS_SERVICE_NAME: "serverlessTracing",
        TABLE_NAME: orderTable.tableName,
      },
      handler: "src/storeOrder.handler",
    });

    orderTable.dynamodbTable.grantWriteData(storeOrderFunction);

    const eventBus = new EventBus(this, "EventBus", {
      eventBridgeEventBus: {
        eventBusName: "serverless-tracing-event-bus",
      },
      rules: {
        orderCreated: {
          eventPattern: {
            detailType: ["ORDER_CREATED"],
          },
          targets: [storeOrderFunction],
        },
      },
    });

    const processOrderFunction = new Function(this, "ProcessOrderFunction", {
      environment: {
        EVENT_BUS_NAME: eventBus.eventBusName,
        POWERTOOLS_SERVICE_NAME: "serverlessTracing",
      },
      handler: "src/processOrder.handler",
    });

    eventBus.eventBridgeEventBus.grantPutEventsTo(processOrderFunction);

    const api = new ApiGatewayV1Api(this, "ServerlessTracingApi", {
      restApi: {
        deployOptions: {
          tracingEnabled: true,
        },
      },
      routes: {
        "POST /order/{itemId}": processOrderFunction,
      },
    });

    this.addOutputs({
      ApiEndpoint: api.url,
    });

    this.ApiEndpoint = api.url;
  }
}
