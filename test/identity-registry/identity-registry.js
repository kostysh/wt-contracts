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
      }, (e, r) => {
        if (e) { return reject(e); }
        resolve(r);
      });
  });
};

contract('IdentityRegistry', (accounts) => {
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

  describe('clues', () => {
    it('should not be possible to add a clue by a non-owner', async () => {
      try {
        await registry.registerClue(accounts[3], { from: accounts[0] });
        assert(false);
      } catch (e) {
        assert(help.isInvalidOpcodeEx(e));
      }
    });

    it('should not be possible to add a clue on a zero address', async () => {
      try {
        await registry.registerClue(help.zeroAddress, { from: accounts[0] });
        assert(false);
      } catch (e) {
        assert(help.isInvalidOpcodeEx(e));
      }
    });

    it('should add a clue by an owner and emit', async () => {
      const receipt = await registry.registerClue(accounts[3], { from: registryOwner });
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'ClueRegistered');
      assert.equal(receipt.logs[0].args.clue, accounts[3]);
      const allClues = await help.jsArrayFromSolidityArray(
        registry.clues,
        await registry.getCluesLength(),
        help.isZeroAddress
      );
      assert.equal(allClues.length, 1);
      assert.equal(allClues[0], accounts[3]);
      assert.equal(await registry.cluesIndex(accounts[3]), 1);
    });

    it('should not be possible to remove a clue by a non-owner', async () => {
      try {
        await registry.registerClue(accounts[3], { from: registryOwner });
        await registry.deleteClue(accounts[3], { from: accounts[0] });
        assert(false);
      } catch (e) {
        assert(help.isInvalidOpcodeEx(e));
      }
    });

    it('should not be possible to remove a non-registered clue', async () => {
      try {
        await registry.deleteClue(accounts[3], { from: registryOwner });
        assert(false);
      } catch (e) {
        assert(help.isInvalidOpcodeEx(e));
      }
    });

    it('should remove a clue by an owner and emit', async () => {
      await registry.registerClue(accounts[2], { from: registryOwner });
      await registry.registerClue(accounts[3], { from: registryOwner });
      const allClues1 = await help.jsArrayFromSolidityArray(
        registry.clues,
        await registry.getCluesLength(),
        help.isZeroAddress
      );
      assert.equal(allClues1.length, 2);
      const receipt = await registry.deleteClue(accounts[2], { from: registryOwner });
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'ClueDeleted');
      assert.equal(receipt.logs[0].args.clue, accounts[2]);
      const allClues = await help.jsArrayFromSolidityArray(
        registry.clues,
        await registry.getCluesLength(),
        help.isZeroAddress
      );
      assert.equal(allClues.length, 1);
      assert.equal(allClues[0], accounts[3]);
    });

    it('should return list of clue addresses', async () => {
      await registry.registerClue(accounts[2], { from: registryOwner });
      await registry.registerClue(accounts[3], { from: registryOwner });
      const clues = await registry.getClueAddresses();
      // there's a zero address apart from the registered ones
      assert.equal(clues.length, 3);
    });

    // TODO this depends on clues actually getting deployed
    xit('should return list of clues', async () => {});
    xit('should not allow to add an address where ther is not a clue interface deployed', async () => {});
    // TODO interface detection https://github.com/ethereum/EIPs/pull/881
  });
});
