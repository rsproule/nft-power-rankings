import { DynamoDBStreamEvent } from 'aws-lambda'
import { DynamoDBStreamHandler } from 'aws-lambda'
import { Vote } from '../votes'
import AWS from 'aws-sdk'
const dynamoDB: AWS.DynamoDB.DocumentClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-west-1',
})

export const handler: DynamoDBStreamHandler = async (
  event: DynamoDBStreamEvent,
) => {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT') {
      continue
    }

    // if (record)
    const vote: Vote = parseVote(record.dynamodb!.NewImage)
    const winnerElo = await getElo(vote.projectId, vote.winnerId)
    const winnerRankingAgg: Ranking = winnerElo
      ? parseRanking(winnerElo)
      : initRanking(vote.projectId, vote.winnerId)
    const loserElo = await getElo(vote.projectId, vote.loserId)
    const loserRankingAgg: Ranking = loserElo
      ? parseRanking(loserElo)
      : initRanking(vote.projectId, vote.loserId)

    winnerRankingAgg.elo = calculateElo(winnerRankingAgg.elo, loserRankingAgg.elo, true)
    winnerRankingAgg.totalWins += 1

    loserRankingAgg.elo = calculateElo(loserRankingAgg.elo, winnerRankingAgg.elo, false)
    loserRankingAgg.totalLosses += 1

    await writeRanking(winnerRankingAgg)
    await writeRanking(loserRankingAgg)
  }
}

const calculateElo = (
  initialElo: number,
  opponentElo: number,
  isWinner: boolean,
) => {
  return (
    initialElo +
    (isWinner ? 32 : -32) +
    16 * (1 / (1 + Math.pow(10, (opponentElo - initialElo) / 400)))
  )
}

const getElo = async (projectId: string, itemId: string) => {
  const eloEntry = await dynamoDB
    .get({
      TableName: process.env.ELO_TABLE_NAME!,
      Key: {
        projectId: projectId,
        itemId: itemId,
      },
    })
    .promise()

  if (eloEntry.Item && eloEntry.Item.projectId) {
    return eloEntry.Item
  } else {
    return null // default value
  }
}

interface Ranking {
  projectId: string
  itemId: string
  elo: number
  totalWins: number
  totalLosses: number
}

const writeRanking = async (ranking: Ranking) => {
  try {
    await dynamoDB
      .put({
        TableName: process.env.ELO_TABLE_NAME!,
        Item: ranking,
      })
      .promise()
  } catch (error) {
    console.error(error)
  }
}

const parseVote = (vote: any) => {
  return {
    userId: vote.userId.S,
    projectId: vote.projectId.S,
    voteId: vote.voteId.S,
    winnerId: vote.winnerId.S,
    loserId: vote.loserId.S,
  } as Vote
}

const parseRanking = (ranking: any) => {
  return {
    projectId: ranking.projectId,
    itemId: ranking.itemId,
    elo: ranking.elo,
    totalWins: ranking.totalWins,
    totalLosses: ranking.totalLosses,
  } as Ranking
}

const initRanking = (projectId: string, itemId: string) => {
  return {
    projectId: projectId,
    itemId: itemId,
    elo: 400,
    totalWins: 0,
    totalLosses: 0,
  } as Ranking
}
