# Nostr binding protocol

## Abstract

In this paper, we propose a protocol that binds the basic data structure from the Nostr protocol to the CKB blockchain. Through such bindings, we allow the Nostr native data to inherit the features of UTXOs/Cells on the CKB blockchain, bringing new opportunities with the on-chain mechanism to the Nostr protocol. One potential use case is issuing native assets on Nostr.

The Nostr binding protocol also brings a new development paradigm for dApps. Instead of splitting your dApp into two systems, one is the off-chain server and the other one is the on-chain smart contract, we use one consistent system with different levels of data to build the dApps. This is fundament different from the pattern of Ethereum.

3 layers structure for Web5:

![3-layers](/assets/3-layers.jpg)

## Nostr Basic

Nostr is a simple and open information-distributing protocol that uses the relay-client model to distribute standard messages across the global network.

The relay-client model works like the P2P network in blockchain but is cheaper, more flexible and more practical(also more centralized) and is dedicated to the mass adoption of consumer-level applications.

The standard message is the core innovation from Nostr. Nostr defines a standard message format(also a basic data structure for the protocol) based on JSON, to describe all kinds of different data. It is called "Event".

Event structure:

```json
{
  "id": <32-bytes lowercase hex-encoded sha256 of the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key of the event creator>,
  "created_at": <unix timestamp in seconds>,
  "kind": <integer between 0 and 65535>,
  "tags": [
    [<arbitrary string>...],
    // ...
  ],
  "content": <arbitrary string>,
  "sig": <64-bytes lowercase hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field>
}
```

The Event is a piece of data that holds arbitrary content and is signed by users so it can be verified on the client side without trusting any relay servers. All the messages you post in the Nostr protocol are Events of different kinds and requirements.

You can learn more about Nostr from [NIPs](https://github.com/nostr-protocol/nips).

## CKB Basic

CKB is the layer 2 of Bitcoin with UTXO-like and POW design. The basic data structure of CKB is called Cell. Cell is a generalized UTXO with powerful programmability.

Cell structure:

```bash
Cell: {
  capacity: HexString; # represent the total storage space size of the Cell. The basic unit for capcaity is shannon, where 1 CKB equals 10**8 shannons.
  lock: Script; # a piece of code
  type: Script; # a piece of code
  data: HexString; # this field can store arbitrary bytes, which means it can hold any type of data 
}
```

Script structure:

```bash
Script: {
  code_hash: HexString
  args: HexString
  hash_type: Uint8, there are 4 allowed values: {0: "data", 1: "type", 2: "data1", 3: "data2"}
}
```

You can learn more about CKB from [docs.nervos.org](https://docs.nervos.org/).

## The Binding

The idea of binding is to create a 1-vs-1 mapping between a Nostr Event and a CKB Cell. The Event is used to define the details of your assets while the mapping Event is used to provide guard of the ownership and other blockchain-specific abilities.

To create such a 1-vs-1 mapping, you need to make one Nostr Event point to one CKB Cell, and vice versa. Thanks to the simplicity of both Nostr and CKB protocol, it is very easy to create such bindings.

## All We Need Are Two Scripts

We introduce two CKB scripts in the Nostr binding protocol.

One is called the Nostr binding script, a type-script that defines the CKB assets binding from Events of the Nostr protocol. It is a very simple script yet covers the core logic of the binding.

The second one is called the Nostr lock script, a lock script that uses Nostr Events as witnesses to unlock CKB transactions. It is used to help simplify the user experience and the process of building Nostr dApp with CKB.

### Nostr binding script

The Nostr binding script is a type-script that is used to define on-chain assets binding from some specific Events, the native data of the Nostr protocol.

The Nostr binding script assures that the Cell used this script as its type script is the only live cell that exits in the CKB blockchain that binds with one and only one specific Event from the Nostr protocol.

Binding script structure:

```json
type:
    hash_type: "type"
    code_hash: NOSTR_BINDING_TYPE_HASH
    args: BINDING_ARGS
lock:
    any lock

witness:
		<Nostr asset Event, serialized by JSON>
		
BINDING_ARGS = NOSTR_EVENT_ID(32 bytes) + TYPE_ID(32 bytes)
```

- TYPE_ID is used to make sure that only one live cell in the blockchain has such a type hash
- NOSTR_EVENT_ID is used to make sure that this cell only points to one unique Nostr Event

A cell that uses the Nostr binding script as its type script is the mapping cell of a Nostr asset Event.

Nostr asset Event structure:

```json
{
  "id": <32-bytes lowercase hex-encoded sha256 of the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key of the event creator>,
  "created_at": <unix timestamp in seconds>,
  "kind": <23333>,
  "tags": [
	  ["e", <first e tag is the asset meta data event id>],
	  ["cell_type_id", <the second part of the BINDING_ARGS，hex string of CKB Cell type_id，32 bytes>],
    [<arbitrary string>...],
    // ...
  ],
  "content": <Hex num of FT's denomination or the content of NFT>,
  "sig": <64-bytes lowercase hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field>
}
```

- the cell_type_id tag in the Nostr asset Event assures that this Event only points to one unique CKB cell

The Nostr asset Event presents an asset minted by users. Nostr asset metadata Event is used to describe the metadata of the set of the same assets.

Nostr asset metadata Event structure:

```json
{
  "id": <32-bytes lowercase hex-encoded sha256 of the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key of the event creator>,
  "created_at": <unix timestamp in seconds>,
  "kind": <23332>,
  "tags": [
    ["name", <name of the meta asset, optional>],
    ["symbol", <symbol of the meta asset, optional>],
    ["decimals", <decimals of the meta asset, optional>],
    ["description", <description of the meta asset, optional>]
    [<arbitrary string>...],
    // ...
  ],
  "content": "",
  "sig": <64-bytes lowercase hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field>
}
```

### Nostr lock script

Nostr lock script is a lock script that uses Nostr Events as witnesses to unlock CKB transactions. It is used to help simplify the user experience and the process of building Nostr dApp with CKB.

Nostr lock script structure:

```json
lock:
    hash_type: "data2"
    code_hash: NOSTR_LOCK_DATA_HASH
    args: NOSTR_PUBLICKEY <32 bytes> | POW difficulties <4 bytes>

witness:
		<Nostr unlock Event, serialized by JSON>
```

- args is set to the public key of the Nostr account. You can also add a POW value in the last 4 bytes, which means that the unlock event must meet a certain difficulty of POW.
- When args is 32bytes with all 0s, it means that no one can unlock the lock.
- When the first 32 bytes of args are all 0 and the last 4 bytes are a non-zero value, it means that the lock can be unlocked by any Nostr account, as long as the unlock event meets a certain POW difficulty value (this can be used to do fair launch)

Nostr unlock Event structure:

```json
{
  "id": <32-bytes lowercase hex-encoded sha256 of the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key of the event creator>,
  "created_at": <unix timestamp in seconds>,
  "kind": "<23334>",
  "tags": [
	  ["ckb_raw_tx", <serialized by JSON>],
	  ["ckb_tx_hash", <hash of the CKB transaction>],
	  ["nonce", <nonce_value>, <difficuties>],// optional
    [<arbitrary string>...],
    // ...
  ],
  "content": <Signing Nostr unlock Event, please understand what you are signing for...>,
   "sig": <64-bytes lowercase hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field>
}
```

To unlock a CKB Cell that uses Nostr lock script, a Nostr unlock Event must be provided in the witness field of the transaction. Users can generate multiple unlock events, but since the event records the corresponding CKB transaction in the tag when one event is uploaded to the chain, the remaining events will automatically become invalid, and there will be no risk of replay.

Nostr lock script can also support multi-signature. Its lock script args can be a Nostr Event ID. This Event records M P tags, representing the public Keys of all owners. Unlocking requires at least N of M Nostr accounts to provide Nostr unlock event in the witness.

With the help of The Nostr lock script, users can use Nostr ecological clients and browser extensions to directly sign and generate unlock events as witnesses to unlock the CKB transactions so that developers of these off-chain Nostr ecological tools can do their best to minimize the introduction of CKB and blockchain-related code.

At the same time, users can be almost "indifferent" to blockchain. The project party or other volunteers can run a special relay to monitor whether there are new unlock events in the Nostr network, and if so, help parse the transactions and submit them to the CKB chain for unlocking. Transaction fees can be paid by reserving a portion of capacity through Cell.

## Issue assets

### Direct binding

Users: Requires Nostr account and CKB

1. Index the CKB Cell and calculate the TYPE_ID of this Cell
2. Take TYPE_ID and generate a Nostr asset Event with Nostr signature
3. Take the Nostr asset Event, generate a CKB binding transaction, and send it to the chain

### via RGB++

Users: Requires Nostr account, Bitcoin wallet and Satoshi

1. Index UTXO, generate a mapping Cell through RGB++, and calculate the TYPE_ID of this Cell
2. Take TYPE_ID and generate a Nostr asset Event with Nostr signature
3. Take the Nostr asset Event, generate a CKB binding transaction, and send it to the chain

## Transfer

### When using Nostr lock

Users: Requires Nostr account

1. Index the Cell using the Nostr lock script on CKB that you want to unlock
2. Construct a CKB transaction that replaces this Cell with a Cell with other lock scripts
3. Take the result of 2 and generate a Nostr unlock Event through the Nostr client/browser extension.
4. Send the Nostr unlock Event to a special group of relays and submit it to the chain.

### When using other locks

Users: Need to have wallets corresponding to other locks, no Nostr-related things required

Just follow the normal process on CKB/RGB++ to unlock the transfer.

## Scalability Problem

The main advantage of the Nostr binding protocol is that it is very simple and straightforward. Simplicity also makes client developers build products more easily on top of it.

On the other hand, the disadvantage of the Nostr binding protocol is the scalability problem. Under this simple design, the throughput of the Nostr tokens is tied with the CKB blockchain so CKB blockchain will become the bottleneck. Consider Nostr as a more flexible social network ami for mass adoption, such throughput with Nostr tokens might be a problem when there are tons of users interacting with these native assets in the future.

However, we see some options for this problem:

1. Integrated with the CKB lighting network

Since the Nostr native assets created by the Nostr binding protocol can be treated as a common CKB asset, we can leverage the CKB lighting network for scalability on the Nostr binding protocol once it is ready. There is nothing that needs to change in the Nostr binding protocol, it is a free feature. but the downside is that it needs to wait for the CKB lighting network launch.

2. Implement the simple yet useful payment channel

Another option before the CKB lighting network comes out is to implement some very simple yet useful payment channels like [spillman channel](https://en.bitcoin.it/wiki/Payment_channels#Spillman-style_payment_channels).

The spillman channel is a unidirectional payment channel with a much simpler implementation. There is a payer and a payee in the channel. Such a payment channel might not be useful for blockchains but in the case of the Nostr binding protocol, it is suitable for a subscription model for content creators and their followers.

3. N-vs-1 binding instead of 1-vs-1 binding

Instead of creating 1-vs-1 binding, we can create N-vs-1 binding between Nostr Events and CKB Cells. In other words, we bundle multiple events into one single cell to allow scalability. This will make the on-chain mapping storage cost much smaller than the off-chain Nostr Events. 

However, the problem with N-vs-1 binding is that it requires the design of a new pattern to control and split the bundle Events's ownership.

4. RGB style solution

Another way to achieve scalability is to create an RGB-style solution that uses CKB Cells as a single-use seal and making the Nostr protocol the implementation layer of the RGB protocol. This will be more complex, but we only need to implement the tokens standard. The general smart contract in the RGB protocol can be removed in such a case.
