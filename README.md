# STON Token Contract

The smart contract code for the STON token. The token is ERC20 compatible and
makes the full transaction history available on-chain. This feature can be
leveraged to implement additional functionality (such as voting) in an external
smart contract.


## ERC20 Properties

The token has the following properties:

- Token name: STON
- Token symbold: STON
- Decimals: 8
- Total supply: up to 370 million (see minting)

The token supply is limited to 370 million tokens. After finishing minting, no
additional tokens can be created. These parameters can be adjusted in the smart
contract (`contracts/StonToken.sol`) - the maximum supply is defined by the
constant `maxSupply`, the token symbol, name and decimals are specified in the
constructor (line 21 to 23).


## Special Roles

The smart contract has two special roles, which are used to manage its
functionality. For each role, one account (address) is associated to it. The
same account can be responsible for both roles, but it is not recommended.

- Owner
- Whitelist Manager

The owner is responsible for minting the tokens initially (see below for further
information) and is able to change the whitelist manager. The whitelist manager
can edit the whitelist (i.e. add and remove accounts, see below).

To change the owner, the owner can call the `transferOwnership` function with
the address of the new owner as parameter. On success this will also emit an
`OwnershipTransferred` event. On failure (when not called by the owner) the
smart contract reverts and the transaction will fail.

To change the whitelist manager, the owner can call the `changeWhitelistManager`
function with the address of the new whitelist manager as parameter. On success
this will also emit an `WhitelistManagerChange` event. On failure (when not
called by the owner) the smart contract reverts and the transaction will fail.


## Deployment and Minting

When initially deploying the token, all the balances will be zero and no tokens
will be minted immediately. The account which deploys the contract will
automatically become the owner and whitelist manager of the contract.

The owner can then mint tokens to create the initial balances. The `mint`
function is used for this, it takes two arrays as parameter, a recipients array
(array of account addresses) and an amounts array (array of desired balances in
the same order as recipients array). This makes it possible to reduce the amount
of transactions required for minting to only a few. Technically the limit is
minting tokens for 250 accounts at once, but it can not be reached for gas cost
and practical reasons (Ethereum transactions with high gas cost tend to be mined
a lot slower).

During minting all token transfers are disabled. When minting is finished, the
owner must call the `finishMinting` function (no parameters). This will
permanently disable the minting functionality, check if the maximum supply is
respected and enable token transfers.

The recommended minting procedure is as follows:

1. Create a temporary Ethereum account (key pair)
2. Send some Ether to it (~0.5 ETH) to fund gas costs
3. Deploy the `StonToken` contract (e.g. using Remix IDE)
4. Mint the initial balances using a script, split the minting to around 100
   accounts per transaction
5. Verify all the balances
6. Call `finishMinting` on the contract
7. Set a new owner and whitelist manager account (e.g. use two different
   addresses from a hardware wallet)
8. Transfer away the remaining Ether from the temporary account


## Whitelist

The `StonToken` smart contract also stores a whitelist of addresses. This
whitelist has no direct influence on the token transfers, however it can be
queried from external for additional functionality. Its entries can be managed
by the whitelist manager using the `addWhitelist` and `removeWhitelist`
functions, they each take the address to modify as parameter and will emit a
`WhitelistEdit` event (if the whitelist status of the account changed).

For bulk edits there is a `modifyWhitelistMultiple` function, it takes an array
of accounts to change and the new whitelist status (true for whitelisted or
false for not whitelisted) as parameter. It will also emit a `WhitelistEdit`
event, however unlike the simple add and remove function, it will always emit an
event. This saves on the gas cost, as the check for the current account status
is quite expensive.

## Voting

For voting an additional `Vote` smart contract has to be deployed. To provide
additional metadata, this contract can be expanded and customized for each vote.
An example contract (`VoteExample`) was implemented in
`contracts/VoteExample.sol` along with corresponding tests in
`test/voteExample.js`. In addition to the voting logic it only contains some
metadata, such that the user can check the voting topic.

Using the `Vote` contract, each whitelisted address with more than 1000 STON is
allowed to vote (either yes or no). Each address can only vote once and is each
vote has the same weight (independent of the number of tokens). As parameters
the address to the STON token contract, the vote expiration date (UNIX
timesteamp, after which no additional votes will be accepted) and a block number
at which the token amount is checked is required.

The behaviour of the `Vote` contract can of course be adjusted as needed. Since
each vote is deployed individually, different votes can use different rules,
like e.g. other answers than yes/no, weighting the votes by amount of tokens, no
or different whitelist required, and so on.

The procedure for carrying out a vote is as follows:

1. Copy the `VoteExample.sol` smart contract and adjust the metadata.
2. Deploy the voting smart contract with the STON token address, end date and
   desired block number as parameter.
3. Publish the address of the voting contract.
4. Users should call the `vote` function from their wallets with the desired
   answer.
5. After the vote expires, fetch and publish the result from the voting
   contract.


## Development

The contract was developed using the Truffle Framework. To use it, install
`truffle` from `npm`. The contract can be built with `truffle compile`. For
deploying, regular Ethereum tools can be used, such as the Remix IDE from the
Ethereum foundation.

Tests can be run with the `truffle test` command. The test suite covers both the
ERC20 and custom token functionality. Currently there are just short of 100 test
cases and they should all be passing.
