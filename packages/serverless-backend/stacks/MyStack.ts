import * as sst from '@serverless-stack/resources'
import { HttpLambdaAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers'
import { PolicyStatement } from '@aws-cdk/aws-iam'
import { StartingPosition } from '@aws-cdk/aws-lambda'
import { ProjectionType } from "@aws-cdk/aws-dynamodb";


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

    const rankingsTable = new sst.Table(this, 'Rankings', {
      fields: {
        projectId: TableFieldType.STRING,
        itemId: TableFieldType.STRING,
        elo: TableFieldType.NUMBER,
        totalWins: TableFieldType.NUMBER,
        totalLosses: TableFieldType.NUMBER,
      },
      primaryIndex: {
        partitionKey: 'projectId',
        sortKey: 'itemId',
      },
      globalIndexes: {
        eloIndex: {
          partitionKey: 'projectId',
          sortKey: 'elo',
          indexProps: {
            projectionType: ProjectionType.ALL,
          }
        },
        // winsIndex: {
        //   partitionKey: 'projectId',
        //   sortKey: 'totalWins',
        //   indexProps: {
        //     projectionType: ProjectionType.ALL,
        //   }
        // },
        // lossesIndex: {
        //   partitionKey: 'projectId',
        //   sortKey: 'totalLosses',
        //   indexProps: {
        //     projectionType: ProjectionType.ALL,
        //   }
        // },
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
      stream: true,
      consumers: {
        eloConsumer1: {
          function: {
            handler: 'src/consumers/elo.handler',
            permissions: [rankingsTable],
            environment: {
              ELO_TABLE_NAME: rankingsTable.tableName,
            },
          },
          consumerProps: {
            startingPosition: StartingPosition.TRIM_HORIZON,
          },
        },
      },
    })

    const cognitoPool = new sst.Auth(this, 'AuthPool', {
      cognito: {
        userPool: {
          userPoolName: 'eth-user-pool',
        },
      },
    })

    // Create a HTTP API
    const api = new sst.Api(this, 'Api', {
      accessLog: true,
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
            initialPolicy: [
              new PolicyStatement({
                actions: [
                  'cognito-identity:GetOpenIdTokenForDeveloperIdentity',
                ],
                resources: [
                  `arn:aws:cognito-identity:us-west-1:597616687767:identitypool/${cognitoPool.cognitoIdentityPoolId}`,
                ],
              }),
            ],
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
            },
          },
          authorizationType: ApiAuthorizationType.AWS_IAM,
          // authorizer: {}
        },
        'GET /rankings/{projectId}' : {
          function: {
            handler: 'src/rankings.list',
            permissions: [rankingsTable],
            environment: {
              RANKINGS_TABLE: rankingsTable.tableName,
            }
          }
        }
      },
    })
    cognitoPool.attachPermissionsForAuthUsers([api])

    // Show the endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
      votesTable: votesTable.tableName,
      usersTable: usersTable.tableName,
      rankingsTable: rankingsTable.tableName,
      cognitoPool: cognitoPool.cognitoIdentityPoolId,
    })
  }
}
