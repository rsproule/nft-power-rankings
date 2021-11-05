import "./index.css";
import 'antd/dist/antd.css'; // or 'antd/dist/antd.less'

import { ApolloProvider } from "@apollo/react-hooks";
import ApolloClient from "apollo-boost";
import React from "react";
import ReactDOM from "react-dom";

import App from "./App";

// You should replace this url with your own and put it into a .env file
// See all subgraphs: https://thegraph.com/explorer/
const client: ApolloClient = new ApolloClient({
  uri: "https://api.thegraph.com/subgraphs/name/paulrberg/create-eth-app",
});

ReactDOM.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById("root"),
);
