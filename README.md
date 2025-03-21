# jito-rpc

Jito RPC provides MEV protection, and revert protection

```
npm i jito-rpc
```

## Usage

```js
const JitoRpc = require('jito-rpc')

const jito = new JitoRpc()
const randomTipAccount = await jito.getRandomTipAccount()

// Example of a transaction
const tx = new Transaction()

// Add Jito tip!
tx.add(SystemProgram.transfer({
  fromPubkey,
  toPubkey: new PublicKey(randomTipAccount),
  lamports: 0.0001 * LAMPORTS_PER_SOL
}))

// ... (Add your normal instructions, sign, etcetera)

const txs = [
  Buffer.from(tx.serialize()).toString('base64'),
  // ... (Add more txs here)
]

const bundleId = await jito.sendBundle(txs)

console.log('Bundle sent!', bundleId)

await jito.confirmInflightBundle(bundleId)

const bundle = await jito.getBundleStatuses(bundleId)

console.log(bundle)

console.log('https://explorer.jito.wtf/bundle/' + bundleId)
```

## API

#### `jito = new JitoRpc([options])`

Create a new JitoRpc instance.

Options:

```js
{
  url: 'https://mainnet.block-engine.jito.wtf/api/v1'
}
```

#### `tipAccounts = await jito.getTipAccounts()`

Get the list of all tip accounts.

#### `randomTipAccount = await jito.getRandomTipAccount()`

Get a random tip account from the list.

#### `bundleId = await jito.sendBundle(transactions)`

Send a bundle of transactions.

Transactions must be an array of base58 encoded txs.

#### `inflight = await jito.getInflightBundleStatuses(bundleId)`

Get the inflight bundle (status, slot, etcetera).

#### `bundle = await jito.getBundleStatuses(bundleId)`

Get the full state of a bundle.

#### `slot = await jito.confirmInflightBundle(bundleId[, options])`

Wait until a bundle is landed or failed.

Options:

```js
{
  timeout: 30000
}
```

## License

MIT
