import {
  APIGatewayAuthorizerHandler,
  APIGatewayAuthorizerResult,
  PolicyDocument,
} from 'aws-lambda'

export const authenticate: APIGatewayAuthorizerHandler = async (event, context) => {

  return {
    principalId: 'idk',
    policyDocument: getPolicyDocument('Allow', event.methodArn),
    context: {
      garbage: 'garbage',
    }
  } as APIGatewayAuthorizerResult;
}

const getPolicyDocument = (
  effect: string,
  resource: string,
): PolicyDocument => {
  return {
    Version: '2012-10-17', // default version
    Statement: [
      {
        Action: 'execute-api:Invoke', // default action
        Effect: effect,
        Resource: resource,
      },
    ],
  }
}
