const { TestHelper } = require('zos');
const { Contracts, ZWeb3 } = require('zos-lib');
const assert = require('chai').assert;
const help = require('../helpers/index.js');

ZWeb3.initialize(web3.currentProvider);
// workaround for https://github.com/zeppelinos/zos/issues/704
Contracts.setArtifactsDefaults({
  gas: 60000000,
});

const IdentityRegistryContract = Contracts.getFromLocal('IdentityRegistry');
// eaiser interaction with truffle-contract
const IdentityRegistry = artifacts.require('IdentityRegistry');

contract.only('IdentityRegistry', (accounts) => {
  const registryOwner = accounts[1];
  let project;
  let registry;

  // Create and register a airline
  beforeEach(async () => {
    project = await TestHelper();
    const registryProxy = await project.createProxy(IdentityRegistryContract, {
      initFunction: 'initialize',
      initArgs: [registryOwner],
    });
    registry = await IdentityRegistry.at(registryProxy.address);
  });

  describe('transferOwnership', () => {
    it('should transfer ownership', async () => {
      const receipt = await registry.transferOwnership(accounts[2], {
        from: accounts[1]
      });
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'OwnershipTransferred');
      assert.equal(receipt.logs[0].args.previousOwner, accounts[1]);
      assert.equal(receipt.logs[0].args.newOwner, accounts[2]);
    });
  });
});
