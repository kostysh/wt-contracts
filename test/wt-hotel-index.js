const assert = require('chai').assert;
const help = require('./helpers/index.js');

const AdminUpgradeabilityProxy = artifacts.require('AdminUpgradeabilityProxy');
const WTHotelIndex = artifacts.require('WTHotelIndex');
const WTHotel = artifacts.require('Hotel');
const AbstractWTHotelIndex = artifacts.require('AbstractWTHotelIndex');
const WTHotelIndexUpgradeabilityTest = artifacts.require('WTHotelIndexUpgradeabilityTest');
const HotelUpgradeabilityTest = artifacts.require('HotelUpgradeabilityTest');

contract('WTHotelIndex', (accounts) => {
  const hotelIndexOwner = accounts[1];
  const proxyOwner = accounts[2];
  const hotelAccount = accounts[3];
  const nonOwnerAccount = accounts[4];

  let hotelIndex;

  // Deploy new hotelIndex but use AbstractWTHotelIndex for contract interaction
  beforeEach(async () => {
    const hotelIndexDeployed = await WTHotelIndex.new({ from: hotelIndexOwner });
    hotelIndexDeployed.web3Instance = new web3.eth.Contract(hotelIndexDeployed.abi, hotelIndexDeployed.address);
    const initializeData = hotelIndexDeployed.web3Instance.methods.initialize(hotelIndexOwner).encodeABI();
    const hotelIndexProxy = await AdminUpgradeabilityProxy.new(hotelIndexDeployed.address, initializeData, { from: proxyOwner });
    hotelIndex = await AbstractWTHotelIndex.at(hotelIndexProxy.address);
  });

  describe('upgradeability', () => {
    it('should upgrade WTHotelIndex and have new functions in Index and Hotel contracts', async () => {
      await hotelIndex.registerHotel('dataUri', { from: hotelAccount });

      // Deploy new Index
      const newIndex = await WTHotelIndexUpgradeabilityTest.new({ from: hotelIndexOwner });
      const hotelIndexProxy = await AdminUpgradeabilityProxy.at(hotelIndex.address);
      await hotelIndexProxy.upgradeTo(newIndex.address, { from: proxyOwner });
      hotelIndex = await WTHotelIndexUpgradeabilityTest.at(hotelIndexProxy.address);

      await hotelIndex.registerHotel('dataUri2', { from: hotelAccount });

      const length = await hotelIndex.getHotelsLength();

      const allHotels = await help.jsArrayFromSolidityArray(
        hotelIndex.hotels,
        length,
        help.isZeroAddress
      );

      const hotelsByManager = await hotelIndex.getHotelsByManager(hotelAccount);

      assert.isDefined(allHotels[0]);
      assert.isDefined(hotelsByManager[0]);
      assert.isFalse(help.isZeroAddress(allHotels[0]));
      assert.isFalse(help.isZeroAddress(hotelsByManager[0]));

      assert.equal(await hotelIndex.hotelsIndex(allHotels[0]), 1);
      assert.equal(await hotelIndex.hotelsIndex(allHotels[1]), 2);
      assert.equal(allHotels[0], hotelsByManager[0]);
      assert.equal(allHotels[1], hotelsByManager[1]);

      assert.equal(await (await WTHotel.at(allHotels[0])).dataUri(), 'dataUri');
      assert.equal(await (await WTHotel.at(allHotels[1])).dataUri(), 'dataUri2');

      assert.equal(await (await HotelUpgradeabilityTest.at(allHotels[1])).newFunction(), 100);
      assert.equal(await hotelIndex.newFunction(), 100);
    });
  });

  describe('setLifToken', () => {
    const tokenAddress = accounts[5];

    it('should set the LifToken address', async () => {
      const wtHotelIndex = await WTHotelIndex.at(hotelIndex.address);
      await wtHotelIndex.setLifToken(tokenAddress, { from: hotelIndexOwner });
      const setValue = await wtHotelIndex.LifToken();

      assert.equal(setValue, tokenAddress);
    });

    it('should throw if non-owner sets the LifToken address', async () => {
      try {
        await (await WTHotelIndex.at(hotelIndex.address)).setLifToken(tokenAddress, { from: nonOwnerAccount });
        assert(false);
      } catch (e) {
        assert(help.isInvalidOpcodeEx(e));
      }
    });
  });

  describe('hotels', () => {
    describe('registerHotel', () => {
      const expectedIndexPos = 1; // Position of the first hotel

      it('should not register hotel with empty dataUri', async () => {
        try {
          await hotelIndex.registerHotel('', { from: hotelAccount });
          throw new Error('should not have been called');
        } catch (e) {
          assert(help.isInvalidOpcodeEx(e));
        }
      });

      it('should put hotel where we expect it to be', async () => {
        const hotelIndexNonce = await help.promisify(cb => web3.eth.getTransactionCount(hotelIndex.address, cb));
        const hotelAddress = help.determineAddress(hotelIndex.address, hotelIndexNonce);
        await hotelIndex.registerHotel('dataUri', { from: hotelAccount });
        let address = await hotelIndex.getHotelsByManager(hotelAccount);
        assert.equal(hotelAddress, address[0]);
      });

      it('should return new hotel address', async () => {
        const hotelIndexNonce = await help.promisify(cb => web3.eth.getTransactionCount(hotelIndex.address, cb));
        const hotelAddress = help.determineAddress(hotelIndex.address, hotelIndexNonce);
        // This does not actually create the hotel... but it does spit out the return value
        const result = await hotelIndex.registerHotel.call('dataUri', { from: hotelAccount });
        assert.equal(result, hotelAddress);
      });

      it('should add a hotel to the registry', async () => {
        await hotelIndex.registerHotel('dataUri', { from: hotelAccount });
        const length = await hotelIndex.getHotelsLength();

        const allHotels = await help.jsArrayFromSolidityArray(
          hotelIndex.hotels,
          length,
          help.isZeroAddress
        );

        const hotelsByManager = await hotelIndex.getHotelsByManager(hotelAccount);
        const actualIndexPos = await hotelIndex.hotelsIndex(allHotels[0]);

        const hotel = allHotels[0];
        const hotelByManager = hotelsByManager[0];

        assert.isDefined(hotel);
        assert.isDefined(hotelByManager);
        assert.isFalse(help.isZeroAddress(hotel));
        assert.isFalse(help.isZeroAddress(hotelByManager));

        assert.equal(actualIndexPos, expectedIndexPos);
        assert.equal(hotel, hotelsByManager);

        const hotelInstance = await WTHotel.at(hotel);
        assert.equal(await hotelInstance.dataUri(), 'dataUri');
      });
    });

    describe('deleteHotel', () => {
      const expectedIndexPos = 0; // Position of the hotel in the managers array

      it('should remove a hotel', async () => {
        await hotelIndex.registerHotel('dataUri', { from: hotelAccount });
        const length = await hotelIndex.getHotelsLength();

        let allHotels = await help.jsArrayFromSolidityArray(
          hotelIndex.hotels,
          length,
          help.isZeroAddress
        );

        const hotel = allHotels[0];
        // Verify existence
        assert.isDefined(hotel);
        assert.isFalse(help.isZeroAddress(hotel));

        // Remove and verify non-existence of hotel
        await hotelIndex.deleteHotel(hotel, { from: hotelAccount });
        allHotels = await help.jsArrayFromSolidityArray(
          hotelIndex.hotels,
          length,
          help.isZeroAddress
        );
        const hotelsByManager = await hotelIndex.getHotelsByManager(hotelAccount);
        const hotelDeleted = help.isZeroAddress(hotelsByManager[expectedIndexPos]);

        assert.equal(allHotels.length, 0);
        assert.isTrue(hotelDeleted);
        const code = await help.promisify(cb => web3.eth.getCode(hotel, cb));
        assert.match(code, /^0x/);
      });

      it('should throw if the hotel is not registered', async () => {
        try {
          // Mocking address with existing contract
          await hotelIndex.deleteHotel(nonOwnerAccount, { from: hotelAccount });
          assert(false);
        } catch (e) {
          assert(help.isInvalidOpcodeEx(e));
        }
      });

      it('should throw if hotel has zero address', async () => {
        try {
          // Mocking address with existing contract
          await hotelIndex.deleteHotel(help.zeroAddress, { from: hotelAccount });
          assert(false);
        } catch (e) {
          assert(help.isInvalidOpcodeEx(e));
        }
      });

      it('should throw if non-owner removes', async () => {
        await hotelIndex.registerHotel('name', { from: hotelAccount });
        const hotelsByManager = await hotelIndex.getHotelsByManager(hotelAccount);
        const hotel = hotelsByManager[0];

        try {
          await hotelIndex.deleteHotel(hotel, { from: nonOwnerAccount });
          assert(false);
        } catch (e) {
          assert(help.isInvalidOpcodeEx(e));
        }
      });
    });

    describe('callHotel', async () => {
      let wtHotel, hotelAddress;

      beforeEach(async () => {
        await hotelIndex.registerHotel('dataUri', { from: hotelAccount });
        let address = await hotelIndex.getHotelsByManager(hotelAccount);
        hotelAddress = address[0];
        wtHotel = await WTHotel.at(address[0]);
        wtHotel.web3Instance = new web3.eth.Contract(wtHotel.abi, wtHotel.address);
      });

      it('should proceed when calling as an owner', async () => {
        const data = wtHotel.web3Instance.methods.editInfo('newDataUri').encodeABI();
        await hotelIndex.callHotel(hotelAddress, data, { from: hotelAccount });
        assert.equal('newDataUri', await wtHotel.dataUri());
      });

      it('should throw if calling as a non-owner', async () => {
        const data = wtHotel.web3Instance.methods.editInfo('newUri').encodeABI();
        try {
          await hotelIndex.callHotel(hotelAddress, data, { from: nonOwnerAccount });
          throw new Error('should not have been called');
        } catch (e) {
          assert(help.isInvalidOpcodeEx(e));
        }
      });

      it('should throw if a hotel has zero address', async () => {
        const data = wtHotel.web3Instance.methods.editInfo('newUri').encodeABI();
        try {
          // Mocking address with existing contract
          await hotelIndex.callHotel(help.zeroAddress, data, { from: hotelAccount });
          assert(false);
        } catch (e) {
          assert(help.isInvalidOpcodeEx(e));
        }
      });

      it('should throw if hotel does not exist', async () => {
        const data = wtHotel.web3Instance.methods.editInfo('newUri').encodeABI();
        try {
          // mocking address with existing account
          await hotelIndex.callHotel(nonOwnerAccount, data, { from: hotelAccount });
          throw new Error('should not have been called');
        } catch (e) {
          assert(help.isInvalidOpcodeEx(e));
        }
      });
    });
  });

  describe('transferHotel', () => {
    let hotelAddress;

    beforeEach(async () => {
      await hotelIndex.registerHotel('dataUri', { from: hotelAccount });
      let address = await hotelIndex.getHotelsByManager(hotelAccount);
      hotelAddress = address[0];
    });

    it('should throw if transferring to a zero address', async () => {
      try {
        await hotelIndex.transferHotel(hotelAddress, help.zeroAddress, { from: hotelAccount });
        throw new Error('should not have been called');
      } catch (e) {
        assert(help.isInvalidOpcodeEx(e));
      }
    });

    it('should throw if transferring a non-existing hotel', async () => {
      try {
        await hotelIndex.transferHotel(hotelIndex.address, nonOwnerAccount, { from: hotelAccount });
        throw new Error('should not have been called');
      } catch (e) {
        assert(help.isInvalidOpcodeEx(e));
      }
    });

    it('should throw if not executed from hotel owner address', async () => {
      try {
        await hotelIndex.transferHotel(hotelAddress, nonOwnerAccount, { from: nonOwnerAccount });
        throw new Error('should not have been called');
      } catch (e) {
        assert(help.isInvalidOpcodeEx(e));
      }
    });

    it('should change the hotel manager', async () => {
      assert.equal(help.filterZeroAddresses(await hotelIndex.getHotelsByManager(hotelAccount)).length, 1);
      assert.equal(help.filterZeroAddresses(await hotelIndex.getHotelsByManager(nonOwnerAccount)).length, 0);
      const originalLength = (await hotelIndex.getHotelsLength()).toNumber();
      const originalHotels = await hotelIndex.getHotels();
      await hotelIndex.transferHotel(hotelAddress, nonOwnerAccount, { from: hotelAccount });
      assert.equal(help.filterZeroAddresses(await hotelIndex.getHotelsByManager(hotelAccount)).length, 0);
      assert.equal(help.filterZeroAddresses(await hotelIndex.getHotelsByManager(nonOwnerAccount)).length, 1);
      assert.equal((await hotelIndex.getHotelsLength()).toNumber(), originalLength);
      assert.deepEqual(await hotelIndex.getHotels(), originalHotels);
    });

    it('should fire an event', async () => {
      const result = await hotelIndex.transferHotel(hotelAddress, nonOwnerAccount, { from: hotelAccount });
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].event, 'HotelTransferred');
      assert.equal(result.logs[0].args.previousManager, hotelAccount);
      assert.equal(result.logs[0].args.newManager, nonOwnerAccount);
    });
  });

  describe('data getters', () => {
    describe('getHotelsLength', () => {
      it('should count hotels properly', async () => {
        // length is a bignumber
        let length = await hotelIndex.getHotelsLength();
        // We start with empty address on the zero hotelIndex
        assert.equal(length.toNumber(), 1);
        await hotelIndex.registerHotel('aaa', { from: hotelAccount });
        length = await hotelIndex.getHotelsLength();
        assert.equal(length.toNumber(), 2);
        const hotelIndexNonce = await help.promisify(cb => web3.eth.getTransactionCount(hotelIndex.address, cb));
        const expectedHotelAddress = help.determineAddress(hotelIndex.address, hotelIndexNonce);
        await hotelIndex.registerHotel('bbb', { from: hotelAccount });
        length = await hotelIndex.getHotelsLength();
        assert.equal(length.toNumber(), 3);
        await hotelIndex.deleteHotel(expectedHotelAddress, { from: hotelAccount });
        length = await hotelIndex.getHotelsLength();
        // length counts zero addresses
        assert.equal(length.toNumber(), 3);
      });
    });

    describe('getHotels', () => {
      it('should return hotels properly', async () => {
        let hotels = await hotelIndex.getHotels();
        assert.equal(help.filterZeroAddresses(hotels).length, 0);
        await hotelIndex.registerHotel('aaa', { from: hotelAccount });
        hotels = await hotelIndex.getHotels();
        const hotelIndexNonce = await help.promisify(cb => web3.eth.getTransactionCount(hotelIndex.address, cb));
        const expectedHotelAddress = help.determineAddress(hotelIndex.address, hotelIndexNonce);
        assert.equal(help.filterZeroAddresses(hotels).length, 1);
        await hotelIndex.registerHotel('bbb', { from: hotelAccount });
        hotels = await hotelIndex.getHotels();
        assert.equal(help.filterZeroAddresses(hotels).length, 2);
        await hotelIndex.deleteHotel(expectedHotelAddress, { from: hotelAccount });
        hotels = await hotelIndex.getHotels();
        assert.equal(help.filterZeroAddresses(hotels).length, 1);
      });
    });

    describe('getHotelsByManager', () => {
      it('should return list of hotels for existing manager', async () => {
        await hotelIndex.registerHotel('bbb', { from: hotelAccount });
        const hotelList = await hotelIndex.getHotelsByManager(hotelAccount);
        assert.equal(hotelList.length, 1);
      });

      it('should return empty list for a manager without hotels', async () => {
        const hotelList = await hotelIndex.getHotelsByManager(hotelAccount);
        assert.equal(hotelList.length, 0);
      });

      it('should return empty list for a non-existing manager', async () => {
        const hotelList = await hotelIndex.getHotelsByManager(nonOwnerAccount);
        assert.equal(hotelList.length, 0);
      });
    });
  });
});