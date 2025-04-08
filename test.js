const test = require('brittle')
const { PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js')
const dotenv = require('dotenv')
const { default: bs58 } = require('bs58')
const Solana = require('like-solana')
const Jito = require('./index.js')

dotenv.config()

test('basic', async function (t) {
  const jito = new Jito()
  const randomTipAccount = await jito.getRandomTipAccount()

  const keyPair = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_SECRET_KEY))
  const tx = new Transaction()

  tx.add(
    SystemProgram.transfer({
      fromPubkey: keyPair.publicKey,
      toPubkey: new PublicKey(randomTipAccount),
      lamports: 0.0001 * LAMPORTS_PER_SOL
    })
  )

  const solana = new Solana()
  const latest = await solana.request('getLatestBlockhash')

  tx.recentBlockhash = latest.value.blockhash
  tx.feePayer = keyPair.publicKey
  tx.sign(keyPair)

  const txs = [
    Buffer.from(tx.serialize()).toString('base64')
  ]

  const bundleId = await jito.sendBundle(txs)

  t.comment('Bundle sent!', bundleId)

  await jito.confirmInflightBundle(bundleId)

  const bundle = await jito.getBundleStatuses(bundleId)

  t.is(bundle.bundle_id, bundleId)
  t.is(bundle.transactions.length, 1)
  t.ok(bundle.slot)
  t.is(bundle.confirmation_status, 'confirmed')
  t.is(bundle.err.Ok, null)
})

test('simple send', async function (t) {
  const jito = new Jito()

  const keyPair = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_SECRET_KEY))
  const tx = new Transaction()

  tx.add(
    SystemProgram.transfer({
      fromPubkey: keyPair.publicKey,
      toPubkey: new PublicKey(Jito.getTipAccount()),
      lamports: 0.0001 * LAMPORTS_PER_SOL
    })
  )

  const solana = new Solana()
  const latest = await solana.request('getLatestBlockhash')

  tx.recentBlockhash = latest.value.blockhash
  tx.feePayer = keyPair.publicKey
  tx.sign(keyPair)

  const bundleId = await Jito.send([tx])

  t.comment('Bundle sent!', bundleId)

  const slot = await jito.confirmInflightBundle(bundleId)

  t.ok(slot > 0)
})
