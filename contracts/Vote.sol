pragma solidity >=0.5.8 <0.7.0;

import "./MinimeToken.sol";
import "./StonToken.sol";


contract Vote {
    address public tokenAddress;
    uint256 public endTime;
    uint256 public snapshotBlock;

    mapping(address => bool) public voted;
    uint256 public countYes;
    uint256 public countNo;

    event Voted(address indexed subject, bool indexed answer);

    constructor(address _token, uint256 _endTime, uint256 _block) public {
        tokenAddress = _token;
        endTime = _endTime;

        if (_block == 0) {
            _block = block.number;
        }
        snapshotBlock = _block;
    }

    function vote(bool _answer) public {
        // check if already voted or vote expired
        require(!voted[msg.sender], "Can only vote once.");
        // solium-disable-next-line security/no-block-members
        require(endTime >= block.timestamp, "Vote must not be expired.");

        // check minimum balance
        StonToken token = StonToken(tokenAddress);
        uint256 balance = token.balanceOfAt(msg.sender, snapshotBlock);
        require(balance >= (10**8 * 1000), "Must posses at least 1000 tokens for voting.");

        // check whitelist
        require(token.whitelist(msg.sender), "Must be whitelisted to vote.");

        if (_answer) {
            // vote yes
            countYes++;
        } else {
            // vote no
            countNo++;
        }
        voted[msg.sender] = true;
        emit Voted(msg.sender, _answer);
    }
}
