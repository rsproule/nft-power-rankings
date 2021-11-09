import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
} from 'aws-lambda'
import AWS from 'aws-sdk'
import { idText } from 'typescript'
import { randomBytes } from 'crypto'
import { errorResponse, successResponse } from './common'
import { eventNames } from 'process'
import { ethers } from 'ethers'
const cognitoIdentity = new AWS.CognitoIdentity()
const dynamoDB: AWS.DynamoDB.DocumentClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-west-1',
})

export const get: APIGatewayProxyHandlerV2 = async (event) => {
  let userId: string
  if (event && event.pathParameters && event.pathParameters.id) {
    userId = event.pathParameters.id

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: `get user: ${userId}`,
    }
  } else {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing user id',
    }
  }
}

export const nonce: APIGatewayProxyHandlerV2 = async (event) => {
  if (event && event.pathParameters && event.pathParameters.id) {
    const userId = event.pathParameters.id
    const nonce = await getNonce(userId)
    if (nonce) {
      return successResponse(`${nonce}`)
    } else {
      const newNonce = await updateNonce(userId)
      if (newNonce) {
        return successResponse(newNonce)
      } else {
        return errorResponse('Failed to update nonce', 500)
      }
    }
  } else {
    return errorResponse('Missing user id', 400)
  }
}

export const login: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
) => {
  if (validateLoginBody(event)) {
    console.log(process.env.USER_TABLE_NAME)
    const bodyObject = JSON.parse(event.body!)
    const userId = bodyObject.id
    const signature = bodyObject.signature
    const nonce = await getNonce(userId)

    if (nonce) {
      const isValidSignature: boolean = validateSig(userId, signature, nonce)
      if (isValidSignature) {
        const { IdentityId: identityId, Token: token } = await getTokenId(
          userId,
        )
        if (!identityId || !token)
          return errorResponse('Failed to get token', 500)

        const credentials = await getCredentials(identityId, token)
        if (!credentials) return errorResponse('Failed to get credentials', 500)

        if (!(await updateNonce(userId))) {
          return errorResponse('Failed to update nonce', 500)
        }

        return successResponse(JSON.stringify(credentials))
      } else {
        return errorResponse('Invalid signature', 400)
      }
    } else {
      return errorResponse('Invalid/missing nonce', 400)
    }
  } else {
    return errorResponse('Missing user id', 400)
  }
}

const validateSig = (address: string, signature: string, message: string) => {
  const signerAddres: string = ethers.utils.verifyMessage(message, signature)
  return signerAddres.toLowerCase() === address.toLowerCase()
}

const getTokenId = async (userId: string) => {
  const authPoolId: string = process.env.AUTH_POOL_ID!
  const param = {
    IdentityPoolId: authPoolId,
    Logins: {
      'eth.user.pool': userId,
    },
  }
  const identity = await cognitoIdentity
    .getOpenIdTokenForDeveloperIdentity(param)
    .promise()
  if (identity.IdentityId && identity.Token) {
    return { IdentityId: identity.IdentityId, Token: identity.Token }
  } else {
    return { IdentityId: null, Token: null }
  }
}

const getCredentials = async (
  identityId: string,
  cognitoOpenIdToken: string,
) => {
  const params = {
    IdentityId: identityId,
    Logins: {
      'cognito-identity.amazonaws.com': cognitoOpenIdToken,
    },
  }
  const credentials = await cognitoIdentity
    .getCredentialsForIdentity(params)
    .promise()
  if (credentials.Credentials) {
    return credentials
  } else {
    return null
  }
}

const validateLoginBody = (event: APIGatewayProxyEventV2) => {
  if (!event || !event.body) return false
  const bodyObject = JSON.parse(event.body)
  if (bodyObject.id && bodyObject.signature) {
    return true
  }
  return false
}

const updateNonce = async (userId: string) => {
  const newNonce = randomBytes(16).toString('hex')
  try {
    await dynamoDB
      .put({
        TableName: process.env.USER_TABLE_NAME!,
        Item: {
          userId: userId,
          nonce: newNonce,
        },
      })
      .promise()
  } catch (error) {
    return null
  }
  return newNonce
}

const getNonce = async (userId: string): Promise<string | null> => {
  const tableName = process.env.USER_TABLE_NAME!
  const response: AWS.DynamoDB.GetItemOutput = await dynamoDB
    .get({
      TableName: tableName,
      Key: { userId: `${userId}` },
    })
    .promise()

  if (response.Item && response.Item.nonce) {
    return `${response.Item.nonce}`
  } else {
    return null
  }
}

export const post: APIGatewayProxyHandlerV2 = async (event, context) => {
  if (event && event.pathParameters && event.pathParameters.id) {
    const userId = event.pathParameters.userId
    const response: AWS.DynamoDB.GetItemOutput = await dynamoDB
      .get({ TableName: 'users', Key: { userId: userId } })
      .promise()
    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers: { 'Content-Type': 'text/plain' },
    }
    // if nonce does not exist, we need to create an entry in the table.
    // if (response.Item && response.Item.nonce && response.Item.nonce.length > 0) {
    // return {
    //   statusCode: 200,
    //   headers: { 'Content-Type': 'text/plain' },
    //   body: `${nonce}`,
    // }
  } else {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing user id',
    }
  }
}
