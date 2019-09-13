const VoteExample = artifacts.require('VoteExample');
const StonToken = artifacts.require('StonToken');

const expectRevertOrFail = require('./helpers.js').expectRevertOrFail;
const expect = require('chai')
    .use(require('chai-bn')(web3.utils.BN))
    .expect;


contract('STON VoteExample', function(accounts) {
    const sid = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    const charles = accounts[3];
    const david = accounts[4];

    let token, decimals, vote;

    function tokens(amount) {
        const shift = new web3.utils.BN(10).pow(decimals);
        return shift.mul(web3.utils.toBN(amount));
    };

    // helper function that wraps web3.provider.send in a promise
    function sendToProvider(data) {
        return new Promise((resolve, reject) => {
            web3.currentProvider.send(data, (err, result) => {
                if (err) throw err;
                return resolve(result);
            });
        });
    }

    async function waitTwoWeeks() {
        const twoWeeks = 2 * 7 * 24 * 60 * 60;
        const id = Date.now();

        await sendToProvider({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [twoWeeks],
            id: id,
        });
        await sendToProvider({
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: id + 1,
        });
    };

    // returns current block time as UNIX timestamp
    async function currentTime() {
        const id = Date.now();
        const block = await sendToProvider({
            jsonrpc: '2.0',
            method: 'eth_getBlockByNumber',
            params: ['latest', false],
            id: id,
        });
        return web3.utils.hexToNumber(block.result.timestamp);
    }

    beforeEach(async function() {
        // deploy token contract and mint some token
        token = await StonToken.new();
        decimals = await token.decimals();
        await token.mint(
            [alice,        bob,          charles,      david],
            [tokens(1000), tokens(2000), tokens(3000), tokens(900)],
        );
        await token.finishMinting();

        // whitelist some accounts
        await token.addWhitelist(alice);
        await token.addWhitelist(bob);

        // deploy vote contract
        const now = await currentTime(); // note: EVM time might be different than Date.now()
        vote = await VoteExample.new(
            token.address,
            now + 24*60*60, // expires in 24 hours
            0,              // use token balances from current block
        );
    });

    // test moving tokens after vote start has no influence

    describe('vote(_vote)', function() {
        it('should update the vote count correctly', async function () {
            await vote.vote(false, { from: alice }); // vote no
            assert.equal(await vote.countYes(), 0);
            assert.equal(await vote.countNo(), 1);

            await vote.vote(true, { from: bob }); // vote yes
            assert.equal(await vote.countYes(), 1);
            assert.equal(await vote.countNo(), 1);
        });

        it('should not allow two votes from same address', async function () {
            await vote.vote(false, { from: alice });

            await expectRevertOrFail(vote.vote(true, { from: alice }));
        });

        it('should require a mimum token amount', async function () {
            await token.addWhitelist(david);

            await vote.vote(true, { from: alice });
            await expectRevertOrFail(vote.vote(true, { from: david }));
        });

        it('should only allow whitelisted addresses', async function () {
            await expectRevertOrFail(vote.vote(false, { from: charles }));
            await token.addWhitelist(charles);
            await vote.vote(false, { from: charles });
        });

        it('should use the balances from the specified block', async function () {
            // send away all tokens of alice
            await token.transfer(bob, tokens(1000), { from: alice });
            expect(await token.balanceOf(alice)).bignumber.to.be.equal(tokens(0));

            await vote.vote(true, { from: alice });
        });

        it('should not accept votes after expiration date', async function () {
            await waitTwoWeeks(); // vote expires after 24h

            await expectRevertOrFail(vote.vote(true, { from: alice }));
        });
    });
});
