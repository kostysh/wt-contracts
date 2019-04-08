pragma solidity ^0.5.6;

import "zos-lib/contracts/Initializable.sol";

contract IdentityRegistry is Initializable {

    // Registry owner
    address _owner;

    // Block number when will this registry become deprecated
    uint public deprecatedAfter;

    // list of clues
    // list of identities

    /**
     * @dev Event triggered when owner of the index is changed.
     */
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Event triggered when a deprecation block is set.
     */
    event DeprecationBlockSet(uint indexed blockNumber);

    /**
     * @dev Event triggered when a deprecation block is unset.
     */
    event DeprecationBlockUnset();

    function initialize(address __owner) public initializer {
        _owner = __owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(msg.sender == _owner);
        _;
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0));
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    /**
     * @dev Sets a block number when this registry will become deprecated.
     * Emits `DeprecationBlockSet`.
     * @param blockNumber On which block this registry will get deprecated
     */
    function setDeprecatedAfter(uint blockNumber) public onlyOwner {
        require(blockNumber > block.number, 'Cannot set deprecated in the past');
        deprecatedAfter = blockNumber;
        emit DeprecationBlockSet(deprecatedAfter);
    }

    /**
     * @dev Removes the deprecated block. Possible only before the block occurs.
     * Emits `DeprecationBlockUnset`.
     */
    function unsetDeprecatedAfter() public onlyOwner {
        require(deprecatedAfter > block.number, 'Cannot unset deprecated after the block happened');
        deprecatedAfter = 0;
        emit DeprecationBlockUnset();
    }

    /**
     * @dev Returns in which state the registry currently is.
     * - 0 means it's running without a deprecation block being set
     * - 1 means that a deprecation block has been set and will occur in the future.
     * Users should be migrating to a new registry.
     * - 2 Deprecation block has occured. This registry is deprecated and should
     * not be used anymore.
     * @return {" ": "status"}
     */
    function getDeprecationStatus() public view returns (uint) {
        if (deprecatedAfter == 0) {
            return 0;
        }
        if (block.number <= deprecatedAfter) {
            return 1;
        }
        if (block.number > deprecatedAfter) { 
            return 2;
        }
        revert('Uknown state of deprecatedAfter field.');
    }

}