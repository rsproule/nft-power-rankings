import { useQuery } from '@apollo/react-hooks'
import React, { useEffect, useState } from 'react'

import useWeb3Modal from './hooks/useWeb3Modal'

import GET_TRANSFERS from './graphql/subgraph'
import MainGame from './components/MainGame'
import { Content, Header } from 'antd/lib/layout/layout'
import { Button, Col, Layout, Row } from 'antd'
import Sider from 'antd/lib/layout/Sider'
import MenuContext from 'antd/lib/menu/MenuContext'
import MenuItem from 'antd/lib/menu/MenuItem'

function WalletButton({ provider, loadWeb3Modal, logoutOfWeb3Modal }) {
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

function App() {
  const { loading, error, data } = useQuery(GET_TRANSFERS)
  const [provider, loadWeb3Modal, logoutOfWeb3Modal] = useWeb3Modal()

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

  React.useEffect(() => {
    if (!loading && !error && data && data.transfers) {
      console.log({ transfers: data.transfers })
    }
  }, [loading, error, data])

  return (
    <Layout>
      {/* <Sider
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
        }}
      ></Sider> */}
      <Layout style={{justifyContent: "center"}}>
        <Header>
          <div style={{ float: 'right' }}>
            <WalletButton
              provider={provider}
              loadWeb3Modal={loadWeb3Modal}
              logoutOfWeb3Modal={logoutOfWeb3Modal}
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
            <Col >
              <MainGame
                collectionAddress={'0xE7163cbb4eff60106a08149052b8EDF83C6B1B92'}
                itemCount={500}
                provider={provider}
              />
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
