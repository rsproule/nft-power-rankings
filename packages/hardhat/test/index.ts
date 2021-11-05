// eslint-disable-next-line node/no-extraneous-import
import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { expect } from "chai";
import { ethers } from "hardhat";


describe("NFTPowerRankings", function () {
  let contract: Contract;
  let fakeNFTAddress: string;
  beforeEach("init", async () => {

    fakeNFTAddress = (await ethers.getSigners())[0].address;
    const NFTPowerRankings = await ethers.getContractFactory(
      "NFTPowerRankings"
    );
    contract = await NFTPowerRankings.deploy();
    await contract.deployed();
  });

  it("test a valid vote", async function () {
    await contract.vote(
      fakeNFTAddress,
      BigNumber.from("0x3"),
      BigNumber.from("0x2")
    );
  });
});
