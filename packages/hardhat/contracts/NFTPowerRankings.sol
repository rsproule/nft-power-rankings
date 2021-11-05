//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract NFTPowerRankings {
    uint private voteReward = 1 ether;
    // mapping of each nfts current ELO. ProjectAddy => TokenAddy => ELO
    mapping(address => mapping(address => uint)) _elo;

    // mapping of voters to unique pairs, for verifying no double. ProjectAddy => UserAddy => TokenPairHash => bool
    mapping(address => mapping(address => mapping(bytes32 => bool))) _votes;

    struct VoteRewardSnapshot {
        uint lastRewardTimestamp;
        uint lastRewardSize;
    }
    // used to calculate what the next vote reward should be
    mapping(address => VoteRewardSnapshot) _voteRewardSnapshots;

    // every vote earns you some juice
    mapping(address => uint) _redeemableTokens;
    
    event Vote(address nftAddress, uint winner, uint loser);
    
    constructor() {}

    function vote(address nftAddress, uint winner, uint loser) public {
        require(winner != loser, "should not be the same address");
        bytes32 pairHash = getVoteHash(winner, loser);
        require(!hasUserVotedOnPairBefore(nftAddress, pairHash), "double voting");

        // register this vote
        _votes[nftAddress][msg.sender][pairHash] = true;
        _voteRewardSnapshots[msg.sender] = VoteRewardSnapshot(block.timestamp, voteReward);
        _redeemableTokens[msg.sender] += calculateVoteReward();
        emit Vote(nftAddress, winner, loser);
    }


    // Vote reward deminishes over time. Function of updates in past 24 hours.
    function calculateVoteReward() internal view returns (uint) {
        VoteRewardSnapshot memory snapshot = _voteRewardSnapshots[msg.sender];
        // todo
        return voteReward;
    }

    function hasUserVotedOnPairBefore(address nftAddress, bytes32 pairHash) private view returns (bool) {
        return _votes[nftAddress][msg.sender][pairHash];
    }


    function getVoteHash(uint participant0, uint participant1) private pure returns (bytes32) {
        // deterministic ordering
        if (participant0 < participant1) {
            uint swapTemp = participant0;
            participant0 = participant1;
            participant1 = swapTemp;
        }
        return sha256(abi.encodePacked(participant0, participant1));
    }

    function redeem() public {
        require(_redeemableTokens[msg.sender] > 0, "Nothing to redeem");
        
        _redeemableTokens[msg.sender] = 0;
        // TODO: transfer the funds
    }

}
