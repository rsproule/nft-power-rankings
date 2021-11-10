import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { StringMap } from 'aws-lambda/trigger/cognito-user-pool-trigger/_common'
import AWS from 'aws-sdk'
import { errorResponse, getPublicKeyFromEvent } from './common'
const dynamoDB: AWS.DynamoDB.DocumentClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-west-1',
})

export const post: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
) => {
  const publicKey = getPublicKeyFromEvent(event)
  if (!validateRequest(event, publicKey))
    return errorResponse('invalid request', 400)
  const request = JSON.parse(event.body as string) as StringMap
  let voteWrite
  try {
    voteWrite = await dynamoDB
      .put({
        TableName: process.env.VOTE_TABLE_NAME!,
        Item: postBodyParse(request),
        ConditionExpression: 'attribute_not_exists(#uservoteid)',
        ExpressionAttributeNames: {
          '#uservoteid': 'user-vote-id',
        },
      })
      .promise()
  } catch (e) {
    const error = e as AWS.AWSError
    if (error.code === 'ConditionalCheckFailedException') {
      return { statusCode: 409, body: 'Conflict' }
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    }
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: `${JSON.stringify(voteWrite.$response.data)}`,
  }
}

const validateRequest = (
  event: APIGatewayProxyEventV2,
  authedUserId: string,
) => {
  if (event.body === undefined) {
    return false
  }
  const stringBody = event.body as string
  const body = JSON.parse(stringBody) as StringMap
  if (
    body.userId === undefined ||
    body.projectId === undefined ||
    body.winnerId === undefined ||
    body.loserId === undefined
  ) {
    return false
  }

  if (body.winnerId === body.loserId) {
    return false
  }
  if (body.userId !== authedUserId) {
    return false
  }
  return true
}

const postBodyParse = (body: StringMap) => {
  let voteId
  if (body.winnerId > body.loserId) {
    voteId = `${body.winnerId}-${body.loserId}`
  } else {
    voteId = `${body.loserId}-${body.winnerId}`
  }
  return {
    userId: body.userId,
    projectId: body.projectId,
    voteId: voteId,
    winnerId: body.winnerId,
    loserId: body.loserId,
    'user-vote-id': body.userId + '-' + voteId,
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
