pragma solidity ^0.5.6;

import "zos-lib/contracts/Initializable.sol";

contract IdentityRegistry is Initializable {

    // Registry owner
    address _owner;

    // Block number when will this registry become deprecated
    uint public deprecatedAfter;

    // Array of addresses of clues
    address[] public clues;
    mapping(address => uint) public cluesIndex;

    // Array of addresses of registry members

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

    /**
     * @dev Event triggered when a new clue is registered
     */
    event ClueRegistered(address indexed clue);
    /**
     * @dev Event triggered when a clue is deleted
     */
    event ClueDeleted(address indexed clue);

    function initialize(address __owner) public initializer {
        _owner = __owner;
        clues.length++;
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

    /**
     * @dev Allows registry owner to add new clue address
     * @param clue Clue address
     */
    function registerClue(address clue) external onlyOwner {
        require(clue != address(0));
        cluesIndex[clue] = clues.length;
        clues.push(clue);
        emit ClueRegistered(clue);
    }

    /**
     * @dev Allows registry owner to remove a clue
     * @param clue Clue address
     */
    function deleteClue(address clue) external onlyOwner {
        require(clue != address(0));
        require(cluesIndex[clue] != uint(0));
        uint index = cluesIndex[clue];
        delete clues[index];
        delete cluesIndex[clue];
        emit ClueDeleted(clue);
    }

    /**
     * @dev `getCluesLength` get the length of the `clues` array
     * @return {" ": "Length of the clues array which might contain zero addresses."}
     */
    function getCluesLength() public view returns (uint) {
        return clues.length;
    }

    /**
     * @dev `getClueAddresses` get the `clues` array
     * @return {" ": "Clues array which might contain zero addresses."}
     */
    function getClueAddresses() public view returns (address[] memory) {
        return clues;
    }

}