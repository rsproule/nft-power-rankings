import { APIGatewayProxyEventV2 } from 'aws-lambda'

export const errorResponse = (message: string, code: number) => {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'text/plain' },
    body: `ERROR: ${message}`,
  }
}

export const successResponse = (message: string) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: message,
  }
}

export const getPublicKeyFromEvent = (event: any) => {
  if (
    event &&
    event.requestContext &&
    event.requestContext.authorizer &&
    event.requestContext.authorizer.iam &&
    event.requestContext.authorizer.iam.cognitoIdentity &&
    event.requestContext.authorizer.iam.cognitoIdentity.amr
  ) {
    return event.requestContext.authorizer.iam.cognitoIdentity.amr[2].split(
      ':',
    )[3]
  } else return null
}
