import { useQuery } from '@apollo/react-hooks'
import React, { useEffect, useState } from 'react'

import useWeb3Modal from './hooks/useWeb3Modal'
import axios from 'axios'
import { AwsClient } from 'aws4fetch'

import GET_TRANSFERS from './graphql/subgraph'
import MainGame from './components/MainGame'
import { Content, Header } from 'antd/lib/layout/layout'
import { Button, Col, Layout, Row } from 'antd'
import Sider from 'antd/lib/layout/Sider'
import MenuContext from 'antd/lib/menu/MenuContext'
import MenuItem from 'antd/lib/menu/MenuItem'
import { ethers } from 'ethers'

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

  console.log({ login })

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
      window.ethereum.removeListener('accountsChanged', reload)
      window.ethereum.removeListener('chainChanged', reload)
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
      </Layout>
    </Layout>
  )
}

export default App
