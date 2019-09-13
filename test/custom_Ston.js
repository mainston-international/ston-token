const expectRevertOrFail = require('./helpers.js').expectRevertOrFail;
const expect = require('chai')
    .use(require('chai-bn')(web3.utils.BN))
    .expect;

const StonToken = artifacts.require('StonToken');

contract('STON', function(accounts) {
    const sid = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    const charles = accounts[3];

    let token, decimals;

    function tokens(amount) {
        const shift = new web3.utils.BN(10).pow(decimals);
        return shift.mul(web3.utils.toBN(amount));
    };

    beforeEach(async function() {
        token = await StonToken.new();
        decimals = token.decimals ? await token.decimals.call() : 0;
        await token.mint([sid], [tokens(100)], { from: sid });
    });

    describe('finishMinting()', function() {
        it('should forbid generating new tokens', async function() {
            await token.finishMinting();
            await expectRevertOrFail(token.mint([sid], [tokens(1)], { from: sid }));
        });

        it('should enable transfering', async function() {
            assert.isNotTrue(await token.transfersEnabled.call());
            await expectRevertOrFail(token.transfer(alice, tokens(1), { from: sid }));

            await token.finishMinting();

            assert.isTrue(await token.transfersEnabled.call());
            assert.isTrue(await token.transfer.call(alice, tokens(1), { from: sid }))
        });
    });

    describe('modifyWhitelist()', function () {
        describeIt('when adding', true,
            (address) => token.addWhitelist(address)
        );
        describeIt('when removing', false,
            (address) => token.removeWhitelist(address)
        );

        it('should only allow whitelist manager to make changes', async function () {
            await expectRevertOrFail(token.addWhitelist(alice, { from: alice }));
            await expectRevertOrFail(token.removeWhitelist(alice, { from: alice }));
            await expectRevertOrFail(token.modifyWhitelistMultiple(
                [alice, bob], true, { from: alice }
            ));
        });

        it('owner should be able to update whitelist manager', async function () {
            assert.equal(await token.whitelistManager(), sid);

            const result = await token.changeWhitelistManager(alice, { from: sid });

            assert.equal(await token.whitelistManager(), alice);
            const event = result.logs.find(
                log => log.event == 'WhitelistManagerChange' && log.args.manager == alice
            );
            assert(!!event, 'expected WhitelistManagerChange event not emitted');
        });

        it('only owner should be able to update whitelist manager', async function () {
            await expectRevertOrFail(token.changeWhitelistManager(alice, { from: alice }));
        });

        it('should batch-add multiple addresses correctly', async function () {
            await token.addWhitelist(alice);

            await token.modifyWhitelistMultiple([alice, bob], true);
            assert.isTrue(await token.whitelist(alice));
            assert.isTrue(await token.whitelist(bob));
        });

        it('should batch-remove multiple addresses correctly', async function () {
            await token.addWhitelist(alice);

            await token.modifyWhitelistMultiple([alice, bob], false);
            assert.isNotTrue(await token.whitelist(alice));
            assert.isNotTrue(await token.whitelist(bob));
        });

        function describeIt(name, status, functionUnderTest) {
            describe(name, function () {
                it('should update whitelisted address correctly', async function () {
                    await token.addWhitelist(alice);
                    assert.isTrue(await token.whitelist(alice));

                    const result = await functionUnderTest(alice);

                    assert.strictEqual(await token.whitelist(alice), status);
                    const event = hasWhitelistEditEvent(result, alice, status);
                    if (status) {
                        // no change
                        assert(!event, 'no WhitelistEdit event should be emitted');
                    } else {
                        assert(event, 'expected WhitelistEdit event not emitted');
                    }
                });

                it('should update non-whitelisted address correctly', async function () {
                    assert.isNotTrue(await token.whitelist(alice));

                    const result = await functionUnderTest(alice);

                    assert.strictEqual(await token.whitelist(alice), status);
                    const event = hasWhitelistEditEvent(result, alice, status);
                    if (status) {
                        assert(event, 'expected WhitelistEdit event not emitted');
                    } else {
                        // no change
                        assert(!event, 'no WhitelistEdit event should be emitted');
                    }
                });
            });
        }

        function hasWhitelistEditEvent(result, subject, status) {
            const log = result.logs.find(
                log => log.event == 'WhitelistEdit' && log.args.subject == subject && log.args.status == status
            );
            return !!log;
        }
    });
});
