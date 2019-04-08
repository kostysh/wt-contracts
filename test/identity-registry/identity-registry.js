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

const mineBlock = async () => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_mine',
      // id: id + 1
      }, (e, r) => {
        if (e) { return reject(e); }
        resolve(r);
      });
  });
};

contract.only('IdentityRegistry', (accounts) => {
  const registryOwner = accounts[1];
  let project;
  let registry;
  let currentBlock;

  // Create and register a airline
  beforeEach(async () => {
    project = await TestHelper();
    const registryProxy = await project.createProxy(IdentityRegistryContract, {
      initFunction: 'initialize',
      initArgs: [registryOwner],
    });
    registry = await IdentityRegistry.at(registryProxy.address);
    currentBlock = await web3.eth.getBlockNumber();
  });

  describe('ownership', () => {
    it('should transfer ownership', async () => {
      const receipt = await registry.transferOwnership(accounts[2], {
        from: accounts[1],
      });
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'OwnershipTransferred');
      assert.equal(receipt.logs[0].args.previousOwner, accounts[1]);
      assert.equal(receipt.logs[0].args.newOwner, accounts[2]);
    });
  });

  describe('deprecation', () => {
    it('should prevent setting deprecatedAfter block by non-owner', async () => {
      try {
        await registry.setDeprecatedAfter(currentBlock + 100, { from: accounts[0] });
        assert(false);
      } catch (e) {
        assert(help.isInvalidOpcodeEx(e));
      }
    });

    it('should set deprecatedAfter block by owner and emit event', async () => {
      const result = await registry.setDeprecatedAfter(currentBlock + 100, { from: accounts[1] });
      await mineBlock();
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].event, 'DeprecationBlockSet');
      assert.equal(result.logs[0].args.blockNumber, currentBlock + 100);
    });

    it('should not set deprecatedAfter to a past block', async () => {
      try {
        await registry.setDeprecatedAfter(currentBlock, { from: accounts[1] });
        assert(false);
      } catch (e) {
        assert(help.isInvalidOpcodeEx(e));
        assert.match(e.toString(), /cannot set deprecated in the past/i);
      }
    });

    it('should report not in deprecation process when deprecatedAfter is not set', async () => {
      assert.equal(await registry.getDeprecationStatus(), 0);
    });

    it('should report being in deprecation process when deprecatedAfter is set', async () => {
      await registry.setDeprecatedAfter(currentBlock + 30, { from: accounts[1] });
      assert.equal(await registry.getDeprecationStatus(), 1);
    });

    it('should report deprecated when deprecatedAfter happened', async () => {
      await registry.setDeprecatedAfter(currentBlock + 2, { from: accounts[1] });
      assert.equal(await registry.getDeprecationStatus(), 1);
      await mineBlock();
      assert.equal(await registry.getDeprecationStatus(), 2);
      await mineBlock();
      assert.equal(await registry.getDeprecationStatus(), 2);
    });

    it('should report deprecation block when set', async () => {
      await registry.setDeprecatedAfter(currentBlock + 2, { from: accounts[1] });
      assert.equal(await registry.deprecatedAfter(), currentBlock + 2);
    });

    it('should not report deprecation block when not set', async () => {
      assert.equal(await registry.deprecatedAfter(), 0);
    });

    it('should be possible to remove deprecatedAfter block before it occurs and emit', async () => {
      await registry.setDeprecatedAfter(currentBlock + 5, { from: accounts[1] });
      assert.equal(await registry.deprecatedAfter(), currentBlock + 5);
      assert.equal(await registry.getDeprecationStatus(), 1);
      const receipt = await registry.unsetDeprecatedAfter({ from: accounts[1] });
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'DeprecationBlockUnset');
      assert.equal(await registry.deprecatedAfter(), 0);
      assert.equal(await registry.getDeprecationStatus(), 0);
    });

    it('should not be possible to remove deprecatedAfter block after it occurs', async () => {
      await registry.setDeprecatedAfter(currentBlock + 3, { from: accounts[1] });
      await mineBlock();
      await mineBlock();
      await mineBlock();
      await mineBlock();
      try {
        await registry.unsetDeprecatedAfter({ from: accounts[1] });
        assert(false);
      } catch (e) {
        assert(help.isInvalidOpcodeEx(e));
        assert.match(e.toString(), /cannot unset deprecated after the block happened/i);
      }
    });
  });
});
