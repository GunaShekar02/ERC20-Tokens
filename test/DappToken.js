let DappToken = artifacts.require("./DappToken.sol");

contract("DappToken", accounts => {
  let tokenInstance;

  it("intializes the contract with the correct values", () => {
    return DappToken.deployed()
      .then(instance => {
        tokenInstance = instance;
        return tokenInstance.name();
      })
      .then(name => {
        assert.equal(name, "DApp Token", "has the correct name");
        return tokenInstance.symbol();
      })
      .then(symbol => {
        assert.equal(symbol, "DAPP", "has the correct symbol");
        return tokenInstance.standard();
      })
      .then(standard => {
        assert.equal(standard, "DApp Token v1.0", "has the correct standard");
      });
  });

  it("sets the initial supply upon deployment", () => {
    return DappToken.deployed()
      .then(instance => {
        tokenInstance = instance;
        return tokenInstance.totalSupply();
      })
      .then(totalSupply => {
        assert.equal(
          totalSupply.toNumber(),
          1000000,
          "sets the total supply to 1000000"
        );
        return tokenInstance.balanceOf(accounts[0]);
      })
      .then(adminBalance => {
        assert.equal(
          adminBalance.toNumber(),
          1000000,
          "it allocates the initial supply to the admin account"
        );
      });
  });

  it("transfers token ownership", () => {
    return DappToken.deployed()
      .then(instance => {
        tokenInstance = instance;
        return tokenInstance.transfer.call(accounts[1], 999999999999);
      })
      .then(assert.fail)
      .catch(error => {
        assert(
          error.message.indexOf("revert") >= 0,
          "error message must contain revert"
        );
        return tokenInstance.transfer.call(accounts[1], 250000, {
          from: accounts[0]
        });
      })
      .then(success => {
        assert.equal(success, true, "it returns true");
        return tokenInstance.transfer(accounts[1], 250000, {
          from: accounts[0]
        });
      })
      .then(receipt => {
        assert.equal(receipt.logs.length, 1, "triggers one event");
        assert.equal(
          receipt.logs[0].event,
          "Transfer",
          "should be the Transfer event"
        );
        assert.equal(
          receipt.logs[0].args._from,
          accounts[0],
          "logs the account the tokens are transferred from"
        );
        assert.equal(
          receipt.logs[0].args._to,
          accounts[1],
          "logs the account the tokens are transferred to"
        );
        assert.equal(
          receipt.logs[0].args._value,
          250000,
          "logs the transfer amount"
        );
        return tokenInstance.balanceOf(accounts[1]);
      })
      .then(balance => {
        assert.equal(
          balance.toNumber(),
          250000,
          "adds the amount to the receiving account"
        );
        return tokenInstance.balanceOf(accounts[0]);
      })
      .then(balance => {
        assert.equal(
          balance.toNumber(),
          750000,
          "deducts the amount from the sending account"
        );
      });
  });

  it("approves tokens for delegated transfer", () => {
    return DappToken.deployed()
      .then(instance => {
        tokenInstance = instance;
        return tokenInstance.approve.call(accounts[1], 100);
      })
      .then(success => {
        assert.equal(success, true, "it returns true");
        return tokenInstance.approve(accounts[1], 100);
      })
      .then(receipt => {
        assert.equal(receipt.logs.length, 1, "triggers one event");
        assert.equal(
          receipt.logs[0].event,
          "Approval",
          "should be the Approval event"
        );
        assert.equal(
          receipt.logs[0].args._owner,
          accounts[0],
          "logs the account the tokens are authorized by"
        );
        assert.equal(
          receipt.logs[0].args._spender,
          accounts[1],
          "logs the account the tokens are authorized to"
        );
        assert.equal(
          receipt.logs[0].args._value,
          100,
          "logs the transfer amount"
        );
        return tokenInstance.allowance(accounts[0], accounts[1]);
      })
      .then(allowance => {
        assert.equal(
          allowance.toNumber(),
          100,
          "stores the allowance for delegated transfer"
        );
      });
  });

  it("handles delegated token transfers", () => {
    return DappToken.deployed()
      .then(instance => {
        tokenInstance = instance;
        fromAccount = accounts[2];
        toAccount = accounts[3];
        spendingAccount = accounts[4];
        return tokenInstance.transfer(fromAccount, 100, { from: accounts[0] });
      })
      .then(receipt => {
        return tokenInstance.approve(spendingAccount, 10, {
          from: fromAccount
        });
      })
      .then(receipt => {
        return tokenInstance.transferFrom(fromAccount, toAccount, 9999, {
          from: spendingAccount
        });
      })
      .then(assert.fail)
      .catch(err => {
        assert(
          err.message.toString().indexOf("revert") >= 0,
          "cannot transfer value larger than balance"
        );
        return tokenInstance.transferFrom(fromAccount, toAccount, 20, {
          from: spendingAccount
        });
      })
      .then(assert.fail)
      .catch(err => {
        assert(
          err.message.toString().indexOf("revert") >= 0,
          "cannot transfer value larger than approved amount"
        );
        return tokenInstance.transferFrom.call(fromAccount, toAccount, 10, {
          from: spendingAccount
        });
      })
      .then(success => {
        assert.equal(success, true);
        return tokenInstance.transferFrom(fromAccount, toAccount, 10, {
          from: spendingAccount
        });
      })
      .then(receipt => {
        assert.equal(receipt.logs.length, 1, "triggers one event");
        assert.equal(
          receipt.logs[0].event,
          "Transfer",
          "should be the Transfer event"
        );
        assert.equal(
          receipt.logs[0].args._from,
          fromAccount,
          "logs the account the tokens are transferred from"
        );
        assert.equal(
          receipt.logs[0].args._to,
          toAccount,
          "logs the account the tokens are transferred to"
        );
        assert.equal(
          receipt.logs[0].args._value,
          10,
          "logs the transfer amount"
        );
        return tokenInstance.balanceOf(fromAccount);
      })
      .then(balance => {
        assert.equal(
          balance.toNumber(),
          90,
          "deducts the amount from the sending account"
        );
        return tokenInstance.balanceOf(toAccount);
      })
      .then(balance => {
        assert.equal(
          balance.toNumber(),
          10,
          "add the amount to the receiving account"
        );
        return tokenInstance.allowance(fromAccount, spendingAccount);
      })
      .then(allowance => {
        assert.equal(allowance, 0, "deducts the amount from the allowance");
      });
  });
});
