import { Table, Image, Button } from 'antd'
import { useEffect, useState } from 'react'

type LeaderboardProps = {
  projectId: string
}

const Leaderboard = ({ projectId }: LeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState([])

  useEffect(() => {
    getLeaderboard(projectId).then((data) => {
      setLeaderboard(data)
    })
  }, [])

  const reload = async (projectId: string) => {
      const leaderboard = await getLeaderboard(projectId);
      setLeaderboard([...leaderboard]);
  }

  return (
    <div>
      <h1>Leaderboard</h1>
      <Button style={{float: 'right'}}
        onClick={() => reload(projectId)}
      >
        {' '}
        Reload{' '}
      </Button>
      {leaderboard && leaderboard.length ? (
        <Table dataSource={leaderboard} columns={columns} />
      ) : (
        'Loading... '
      )}
    </div>
  )
}

const getLeaderboard = async (projectId: string) => {
  const response = await fetch(
    `https://krtj8wyxtl.execute-api.us-west-1.amazonaws.com/rankings/${projectId}`,
  )
  const data = await response.json()
  return data
}

const columns = [
  {
    title: 'Item Id',
    dataIndex: 'itemId',
    key: 'itemId',
  },
  {
    title: 'Item',
    dataIndex: 'itemId',
    key: 'itemId',
    render: (itemId: string) => {
      return (
        <Image
          width="100px"
          src={`https://arweave.net/16AYfUXUrlUOKhdhyJuGYg6l1LeCNdGZXqHxlTSLYC8/${itemId}.png`}
        />
      )
    },
  },
  {
    title: 'Power Ranking Score (ELO Rating)',
    dataIndex: 'elo',
    key: 'elo',
  },
  {
    title: 'Wins',
    dataIndex: 'totalWins',
    key: 'totalWins',
  },
  { title: 'Losses', dataIndex: 'totalLosses', key: 'totalLosses' },
]

export default Leaderboard
