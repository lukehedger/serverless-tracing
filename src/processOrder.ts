import { Tracer } from "@aws-lambda-powertools/tracer";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { nanoid } from "nanoid";

type HandlerResponseHeaders = {
  "Access-Control-Allow-Methods": string;
  "Access-Control-Allow-Origin": string;
  "Content-Type": string;
};

export type HandlerResponse = {
  body: string;
  headers: HandlerResponseHeaders;
  statusCode: number;
};

const tracer = new Tracer();

const eventBridgeClient = tracer.captureAWSv3Client(
  new EventBridgeClient({
    region: process.env.AWS_REGION,
  })
);

const itemsAvailableToOrder = ["71032"];

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<HandlerResponse> => {
  const segment = tracer.getSegment();

  const handlerSegment = segment.addNewSubsegment("Handler");

  tracer.setSegment(handlerSegment);

  tracer.annotateColdStart();

  tracer.addServiceNameAnnotation();

  if (!event.pathParameters) throw new Error("Event path parameters undefined");

  const itemId = event.pathParameters.itemId;

  if (!itemId || !itemsAvailableToOrder.includes(itemId)) {
    tracer.putAnnotation("successfulOrder", false);

    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Item not available to order",
      }),
    };
  }

  const orderId = nanoid(8);

  const putEventsCommand = new PutEventsCommand({
    Entries: [
      {
        Detail: JSON.stringify({ orderId: orderId }),
        DetailType: "ORDER_CREATED",
        EventBusName: process.env.EVENT_BUS_NAME,
        Source: "event.tracing",
      },
    ],
  });

  await eventBridgeClient.send(putEventsCommand);

  tracer.putMetadata("orderCreatedEventSent", { orderId: orderId });

  tracer.putAnnotation("successfulOrder", true);

  tracer.putAnnotation("orderId", orderId);

  handlerSegment.close();

  tracer.setSegment(segment);

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId: orderId,
    }),
  };
};
