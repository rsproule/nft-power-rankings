import { useQuery } from '@apollo/react-hooks'
import React, { useEffect, useState } from 'react'

import useWeb3Modal from './hooks/useWeb3Modal'
import axios from 'axios'
import { AwsClient } from 'aws4fetch'

import GET_TRANSFERS from './graphql/subgraph'
import MainGame from './components/MainGame'
import { Content, Footer, Header } from 'antd/lib/layout/layout'
import { Button, Col, Divider, Layout, Row, Typography } from 'antd'

function WalletButton({
  provider,
  loadWeb3Modal,
  logoutOfWeb3Modal,
  setUserAddress,
}) {
  const [account, setAccount] = useState('')
  const [rendered, setRendered] = useState('')

  useEffect(() => {
    async function fetchAccount() {
      try {
        if (!provider) {
          return
        }

        // Load the user's accounts.
        const accounts = await provider.listAccounts()
        setAccount(accounts[0])
        setUserAddress(accounts[0])
        // Resolve the ENS name for the first account.
        const name = await provider.lookupAddress(accounts[0])

        // Render either the ENS name or the shortened account address.
        if (name) {
          setRendered(name)
        } else {
          setRendered(account.substring(0, 6) + '...' + account.substring(36))
        }
      } catch (err) {
        setAccount('')
        setRendered('')
        console.error(err)
      }
    }
    fetchAccount()
  }, [account, provider, setAccount, setRendered])

  return (
    <Button
      onClick={() => {
        if (!provider) {
          loadWeb3Modal()
        } else {
          logoutOfWeb3Modal()
        }
      }}
    >
      {rendered === '' && 'Log in'}
      {rendered !== '' && rendered}
    </Button>
  )
}

const login = async (provider, setAwsClient) => {
  const pubKey = await provider.getSigner().getAddress()
  let { data: nonce } = await axios.get(
    `https://krtj8wyxtl.execute-api.us-west-1.amazonaws.com/nonce/${pubKey}`,
  )
  // sign the nonce
  const signature = await provider.getSigner().signMessage(nonce)
  let { data: login } = await axios.post(
    `https://krtj8wyxtl.execute-api.us-west-1.amazonaws.com/login`,
    {
      id: pubKey,
      signature: signature,
      nonce: nonce,
    },
  )

  if (login && login.Credentials && login.Credentials.AccessKeyId) {
    const aws = new AwsClient({
      accessKeyId: login.Credentials.AccessKeyId,
      secretAccessKey: login.Credentials.SecretKey,
      sessionToken: login.Credentials.SessionToken,
      region: 'us-west-1',
      service: 'execute-api',
    })
    setAwsClient(aws)
    return aws
  }
  return null
}

function App() {
  const [awsClient, setAwsClient] = useState(null)
  const { loading, error, data } = useQuery(GET_TRANSFERS)
  const [provider, loadWeb3Modal, logoutOfWeb3Modal] = useWeb3Modal()
  const [userAddress, setUserAddress] = useState('')

  React.useEffect(() => {
    let reload = (event) => {
      window.location.reload()
    }
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', reload)
      window.ethereum.on('chainChanged', reload)
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', reload)
        window.ethereum.removeListener('chainChanged', reload)
      }
    }
  }, [loading, error, data])

  return (
    <Layout>
      <Layout style={{ justifyContent: 'center' }}>
        <Header>
          <div style={{ float: 'right' }}>
            <WalletButton
              provider={provider}
              loadWeb3Modal={loadWeb3Modal}
              logoutOfWeb3Modal={logoutOfWeb3Modal}
              setUserAddress={setUserAddress}
            />
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px 0',
            overflow: 'initial',
          }}
        >
          <Row justify={'center'}>
            <Col>
              {!provider ? (
                'Need to log in first'
              ) : (
                <MainGame
                  collectionAddress={
                    '0xE7163cbb4eff60106a08149052b8EDF83C6B1B92'
                  }
                  itemCount={500}
                  provider={provider}
                  awsClient={awsClient}
                  userAddress={userAddress}
                  login={async () => login(provider, setAwsClient)}
                />
              )}
            </Col>
          </Row>
        </Content>
        <Divider />
        <Footer style={{ textAlign: 'center' }}>
          <Layout>
            <Content
              style={{
                margin: '24px 16px 0',
                overflow: 'initial',
              }}
            >
                    <Typography.Paragraph>
                      {' '}
                      <b>How it works: </b> Every user signs in with their
                      ethereum wallet (metamask suggested). Then is prompted
                      with 2 random peices from the{' '}
                      <a href="https://opensea.io/collection/psvc">
                        Perserverance collection by Giorgio Balbi
                      </a>{' '}
                      which is a beautiful collection of procedurally generated
                      paintings. The user then can vote on which of the 2
                      paintings they like the most. In order to authenticate
                      with the backend, the user will be forced to sign a nonce.
                      This is a free operation and the user will only be forced
                      to do this once. This vote is sent to the backend where it
                      is used to calculate the new ELO rating for the painting.
                      The top 100 items are loaded and displayed to below the
                      game window. Further features to display and analyze the
                      ranking data will be added in the future.
                    </Typography.Paragraph>
            </Content>
          </Layout>
          <Divider />
          <div style={{ padding: '10px' }}>{'Built by rsproule <3️ '}</div>
          <div style={{ padding: '10px' }}>
            {' '}
            Follow me on Twitter:{' '}
            <a href="https://twitter.com/sprouleth">@sprouleth</a>
          </div>
          <div style={{ padding: '10px' }}>
            Send me some muns if you want to support dumb projects like this:{' '}
            <b>sproule.eth</b>
          </div>
        </Footer>
      </Layout>
    </Layout>
  )
}

export default App
