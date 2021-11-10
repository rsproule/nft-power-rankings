import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
} from 'aws-lambda'
import AWS from 'aws-sdk'
import { errorResponse, successResponse } from './common'
const dynamoDB: AWS.DynamoDB.DocumentClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-west-1',
})

export const list: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
) => {
  const projectId = event.pathParameters!.projectId
  const query = event.queryStringParameters
  if (!projectId) {
    return errorResponse('Project ID is required', 400)
  }
  const limit = query?.limit ? parseInt(query.limit) : 100
  const pointer = query?.pointer ? query.pointer : null
  const order = query?.order ? query.order : 'desc'
  const orderBy = query?.orderBy ? query.orderBy : 'elo'

  const rankings = await getRankings(projectId, limit, pointer, order, orderBy)
  return successResponse(JSON.stringify(rankings))
}

const getRankings = async (
  projectId: string,
  limit: number,
  offset: string | null,
  order: string,
  orderBy: string,
) => {
  const rankings = await dynamoDB
    .query({
      TableName: process.env.RANKINGS_TABLE!,
      Limit: limit,
      IndexName: 'eloIndex',
      ScanIndexForward: order === 'asc',
      KeyConditions: {
        projectId: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [projectId],
        },
      },
    })
    .promise()

  return rankings.Items
}
