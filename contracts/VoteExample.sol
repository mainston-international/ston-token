pragma solidity >=0.5.8 <0.7.0;

import "./Vote.sol";


contract VoteExample is Vote {
    // vote specific metadata
    string public topic = "What this vote is about.";
    string public informationUrl = "https://ston/vote/123/";

    constructor(address _token, uint256 _endTime, uint256 _block) public Vote(
        _token,
        _endTime,
        _block
    ) {}
}
