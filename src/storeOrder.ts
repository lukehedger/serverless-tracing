import { Tracer } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";

const tracer = new Tracer();

const dynamoDBClient = tracer.captureAWSv3Client(
  new DynamoDBClient({ region: process.env.AWS_REGION })
);

export const handler: Handler = async (event) => {
  const putItemCommand = new PutItemCommand({
    Item: {
      orderId: {
        S: event.detail.orderId,
      },
    },
    TableName: process.env.TABLE_NAME,
  });

  await dynamoDBClient.send(putItemCommand);

  return;
};
