const erc20 = require('./erc20');

const token = artifacts.require('StonToken');

contract('STON', function(accounts) {
    erc20({
        accounts: accounts,
        create: async () => {
            return await token.new();
        },
        mint: async (contract, to, amount) => {
            await contract.mint([to], [amount], { from: accounts[0] });
            await contract.finishMinting({ from: accounts[0] });
        }
    });
});
