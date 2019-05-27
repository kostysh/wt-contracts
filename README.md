[![Build Status](https://travis-ci.org/windingtree/wt-contracts.svg?branch=master)](https://travis-ci.org/windingtree/wt-contracts)
[![Coverage Status](https://coveralls.io/repos/github/windingtree/wt-contracts/badge.svg?branch=master)](https://coveralls.io/github/windingtree/wt-contracts?branch=master&v=2.0) [![Greenkeeper badge](https://badges.greenkeeper.io/windingtree/wt-contracts.svg)](https://greenkeeper.io/)

# WT Smart Contracts

Smart contracts of the Winding Tree platform.

![](https://raw.githubusercontent.com/windingtree/wt-contracts/feat/otaindex/assets/contracts-schema.png)

## Requirements

Node 10 is required for running the tests and contract compilation.

## Installation

```sh
npm install @windingtree/wt-contracts
```

```js
import Organization from '@windingtree/wt-contracts/build/contracts/Organization.json';
// or
import { Organization, HotelDirectoryInterface } from '@windingtree/wt-contracts';
```

## Development

```sh
git clone https://github.com/windingtree/wt-contracts
nvm install
npm install
npm test
```

You can run a specific test with `npm test -- test/segment-directory.js`
or you can generate a coverage report with `npm run coverage`.

### Flattener

A flattener script is also available. `npm run flattener` command
will create a flattened version without imports - one file per contract.
This is needed if you plan to use tools like [etherscan verifier](https://etherscan.io/verifyContract)
or [securify.ch](https://securify.ch/).

## Deployment

We are using the upgradeability proxy from [zos](https://docs.zeppelinos.org/)
and the deployment pipeline is using their system as well. You can read more
about the [publishing process](https://docs.zeppelinos.org/docs/deploying) and
[upgrading](https://docs.zeppelinos.org/docs/upgrading.html) in `zos`
documentation.

In order to interact with "real" networks such as `mainnet`, `ropsten` or others,
you need to setup a `keys.json` file used by [truffle](https://truffleframework.com/)
that does the heavy lifting for zos.

```json
{
  "mnemonic": "<SEED_PHRASE>",
  "infura_projectid": "<PROJECT_ID>"
}
```

### Local testing

You don't need `keys.json` file for local testing of deployment and interaction
with the contracts.

1. Start a local Ethereum network.
    ```bash
    > npm run testrpc
    ```
2. Start a zos session.
    ```bash
    > ./node_modules/.bin/zos session --network development --from 0x87265a62c60247f862b9149423061b36b460f4BB --expires 3600
    ```
3. Deploy your contracts. This only uploads the logic, the contracts are not meant to be directly
interacted with.
    ```bash
    > ./node_modules/.bin/zos push --network development
    ```
4. Create the proxy instances of deployed contracts you can interact with. The `args`
attribute is passed to the initialize function that sets the `owner` of the Index (it
can be an address of a multisig) and an actual instance of
[Lif token](https://github.com/windingtree/lif-token). You don't need Lif token to play with
this locally.
    ```bash
    > ./node_modules/.bin/zos create HotelDirectory --network development --init initialize --args 0x87265a62c60247f862b9149423061b36b460f4BB,0xB6e225194a1C892770c43D4B529841C99b3DA1d7
    > ./node_modules/.bin/zos create AirlineDirectory --network development --init initialize --args 0x87265a62c60247f862b9149423061b36b460f4BB,0xB6e225194a1C892770c43D4B529841C99b3DA1d7
    ```
These commands will return a network address where you can actually interact with the contracts.
For a quick test, you can use the truffle console.
```bash
> ./node_modules/.bin/truffle console --network development
truffle(development)> contract = await HotelDirectory.at('0x...address returned by zos create command')
undefined
truffle(development)> contract.getHotels()
[ '0x0000000000000000000000000000000000000000' ]
truffle(development)> contract.createAndRegisterHotel('http://windingtree.com')
truffle(development)> contract.getHotels()
[ '0x0000000000000000000000000000000000000000',
  '0x4D377b0a8fa386FA118B09947eEE2B1f7f126C76' ]
```

## Documentation

Documentation is in the [`docs`](https://github.com/windingtree/wt-contracts/tree/master/docs)
folder and can be generated by running `npm run soldoc`.

## Upgradeability FAQ

**What does upgradeability mean?**

We can update the logic of WT Index while keeping the public address
of WT Index the same.

**What happens when you upgrade the WT Index?**

The WT Index address stays the same, the client software, has to
interact with the Index only with the updated ABI which is distributed
via NPM (under the new version number). No data is lost.

**Can you change the index data structure?**

Yes, we can. If we adhere to [zos recommendations](https://docs.zeppelinos.org/docs/writing_contracts.html#modifying-your-contracts),
we can extend the data stored in WT Index.

**Can you change the organization data structure?**

Yes, we can. But it's not as smooth as with the Index. Until #218
is implemented, we cannot easily migrate all of the existing records
at once. That means that if we change the data structure, all newly
added records will have the new data structure, but the old ones
will keep the old layout and functionality.

**Can I switch to the new organization version?**

Yes, you can. There are multiple options.

1. You can remove and add your organization. This will give you a new
blockchain address of your organization. You probably don't want that.
2. We will provide an `upgrade` method which would allow you to upgrade
your record with a single transaction.
3. We will eventually implement #218 and you wouldn't have to do anything.

We suspect that in case of upgrade, the tooling will somehow support both
versions for a transitional period.

**How do I work with different organization versions on the client?**

That's a tricky one. In case of organization upgrade, you might need to
represent different records with different ABIs. We will provide an easy
way to distinguish between versions - or you can use [wt-js-libs](https://github.com/windingtree/wt-js-libs)
which will have this built in.
