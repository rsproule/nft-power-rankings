import * as sst from '@serverless-stack/resources'
import { HttpLambdaAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers'
import {  PolicyStatement } from '@aws-cdk/aws-iam';
import * as cognito from "@aws-cdk/aws-cognito";

import {
  ApiAuthorizationType,
  PermissionType,
  TableFieldType,
} from '@serverless-stack/resources'

export default class MyStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props)

    const lambdaAuth = new HttpLambdaAuthorizer({
      authorizerName: 'LambdaAuthorizer',
      handler: new sst.Function(this, 'Authorizer', {
        handler: 'src/authorizer.authenticate',
      }),
    })
    const usersTable = new sst.Table(this, 'Users', {
      fields: {
        userId: TableFieldType.STRING,
        nonce: TableFieldType.NUMBER,
      },
      primaryIndex: {
        partitionKey: 'userId',
      },
    })

    const votesTable = new sst.Table(this, 'Votes', {
      fields: {
        projectId: TableFieldType.STRING,
        voteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: {
        partitionKey: 'projectId',
        sortKey: 'user-vote-id',
      },
      
    })

    // const cognitoUserPool = new cognito.CfnIdentityPool(this, 'UserPool', {
    //   developerProviderName: 'eth.user.pool',
    //   allowUnauthenticatedIdentities: false,
    // })


    const cognitoPool = new sst.Auth(this, 'AuthPool', {
      cognito: {
        userPool: {
          userPoolName: 'eth-user-pool',
        }
      },
      
    })

    // Create a HTTP API
    const api = new sst.Api(this, 'Api', {
      cors: true,
      routes: {
        'GET /nonce/{id}': {
          function: {
            handler: 'src/users.nonce',
            permissions: [usersTable],
            environment: {
              USER_TABLE_NAME: usersTable.tableName,
              AUTH_POOL_ID: cognitoPool.cognitoIdentityPoolId,
            },
          },
        },
        'POST /login': {
          function: {
            handler: 'src/users.login',
            permissions: [usersTable],
            initialPolicy: [new PolicyStatement({
              actions: ['cognito-identity:GetOpenIdTokenForDeveloperIdentity'],
              resources: [`arn:aws:cognito-identity:us-west-1:597616687767:identitypool/${cognitoPool.cognitoIdentityPoolId}`]
            })],
            environment: {
              USER_TABLE_NAME: usersTable.tableName,
              AUTH_POOL_ID: cognitoPool.cognitoIdentityPoolId,
            },
          },
        },
        'GET /users/{id}': 'src/users.get',
        'POST /users': {
          authorizationType: ApiAuthorizationType.CUSTOM,
          authorizer: lambdaAuth,
          function: 'src/users.post',
          permissions: [[usersTable, PermissionType.ALL]],
        },
        'POST /votes': {
          function: {
            handler: 'src/votes.post',
            permissions: [votesTable],
            environment: {
              VOTE_TABLE_NAME: votesTable.tableName,
            }
          },
          // authorizationType: ApiAuthorizationType.AWS_IAM,
          
          
        },
      },
    })

    // Show the endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
      votesTable: votesTable.tableName,
      usersTable: usersTable.tableName,
      cognitoPool: cognitoPool.cognitoIdentityPoolId
    })
  }
}
