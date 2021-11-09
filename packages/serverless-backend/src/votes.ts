import { APIGatewayProxyEventV2 } from 'aws-lambda'
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { StringMap } from 'aws-lambda/trigger/cognito-user-pool-trigger/_common'
import AWS from 'aws-sdk'
const dynamoDB: AWS.DynamoDB.DocumentClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-west-1',
})

export const post: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  if (!validateRequest(event)) return { statusCode: 400, body: 'Bad Request' };
  const request = JSON.parse(event.body as string) as StringMap;
  const voteWrite = await dynamoDB
    .put({
      TableName: 'votes',
      Item: postBodyParse(request),
    })
    .promise()

  if (voteWrite.$response.error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: voteWrite.$response.error,
      }),
    }
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: `${voteWrite.$response}`,
  }
}

const validateRequest = (event: APIGatewayProxyEventV2) => {
  if (event.body === undefined) {
    return false
  }
  const stringBody = event.body as string
  const body = JSON.parse(stringBody) as StringMap
  if (
    body.userId === undefined ||
    body.projectId === undefined ||
    body.voteId === undefined ||
    body.winnerId === undefined ||
    body.loserId === undefined
  ) {
    return false
  }
  return true
}

const postBodyParse = (body: StringMap) => {
  return {
    userId: body.userId,
    projectId: body.projectId,
    voteId: body.voteId,
    winnerId: body.winnerId,
    loserId: body.loserId,
  } as Vote
}

interface Vote {
  userId: string
  projectId: string
  voteId: string
  winnerId: string
  loserId: string
}

export const list: APIGatewayProxyHandlerV2 = async (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: `Hello, World! Your request was received at ${event.requestContext.time}.`,
  }
}
