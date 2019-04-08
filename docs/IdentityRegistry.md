* [IdentityRegistry](#identityregistry)
  * [getDeprecationStatus](#function-getdeprecationstatus)
  * [setDeprecatedAfter](#function-setdeprecatedafter)
  * [deprecatedAfter](#function-deprecatedafter)
  * [unsetDeprecatedAfter](#function-unsetdeprecatedafter)
  * [initialize](#function-initialize)
  * [transferOwnership](#function-transferownership)
  * [OwnershipTransferred](#event-ownershiptransferred)
  * [DeprecationBlockSet](#event-deprecationblockset)
  * [DeprecationBlockUnset](#event-deprecationblockunset)

# IdentityRegistry


## *function* getDeprecationStatus

IdentityRegistry.getDeprecationStatus() `view` `2d82dc5f`

> Returns in which state the registry currently is. - 0 means it's running without a deprecation block being set - 1 means that a deprecation block has been set and will occur in the future. Users should be migrating to a new registry. - 2 Deprecation block has occured. This registry is deprecated and should not be used anymore.



Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

## *function* setDeprecatedAfter

IdentityRegistry.setDeprecatedAfter(blockNumber) `nonpayable` `49681022`

> Sets a block number when this registry will become deprecated. Emits `DeprecationBlockSet`.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | blockNumber | On which block this registry will get deprecated |


## *function* deprecatedAfter

IdentityRegistry.deprecatedAfter() `view` `51eb65c8`





## *function* unsetDeprecatedAfter

IdentityRegistry.unsetDeprecatedAfter() `nonpayable` `6dba26b8`

> Removes the deprecated block. Possible only before the block occurs. Emits `DeprecationBlockUnset`.




## *function* initialize

IdentityRegistry.initialize(__owner) `nonpayable` `c4d66de8`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | __owner | undefined |


## *function* transferOwnership

IdentityRegistry.transferOwnership(newOwner) `nonpayable` `f2fde38b`

> Allows the current owner to transfer control of the contract to a newOwner.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | newOwner | The address to transfer ownership to. |

## *event* OwnershipTransferred

IdentityRegistry.OwnershipTransferred(previousOwner, newOwner) `8be0079c`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | previousOwner | indexed |
| *address* | newOwner | indexed |

## *event* DeprecationBlockSet

IdentityRegistry.DeprecationBlockSet(blockNumber) `e4c6f49b`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | blockNumber | indexed |

## *event* DeprecationBlockUnset

IdentityRegistry.DeprecationBlockUnset() `c5337275`




---