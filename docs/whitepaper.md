# Nostr binding protocol

## Abstract

In this paper, we propose a protocol that binds the basic data structure from the Nostr protocol to the CKB blockchain. Through such bindings, we can turn parts of the Nostr native data into on-chain mapping units, meaning that some data of Nostr protocol can suddenly work like UTXOs(in Bitcoin) or Cells(in CKB)They can inherit the features of UTXOs/Cells, bringing new opportunities with the on-chain mechanism to the Nostr protocol. One potential use case is issuing native assets on Nostr.

The Nostr binding also brings a new development paradigm for dApps. Instead of splitting your dApp into two systems, one is the off-chain server and the other one is the on-chain smart contract, we use one consistent system with different levels of data to build the dApps.

## Nostr Basic

Nostr is a simple information-distributing protocol that uses the relay-client model to distribute standard messages across the network.

The relay-client model works like the P2P network in blockchain but is cheaper, more flexible and more practical(also more centralized) and dedicated to the mass adoption of consumer-level applications.

The standard message is a more important part. Nostr defines a standard message format based on JSON, also a basic data structure for the protocol, to describe all kinds of different data. It is called "Event".

### The Structure of Event

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

## All We Need Are Two Scripts

We introduce two CKB scripts in the Nostr binding protocol.

One is called the Nostr binding script, a type-script that defines the CKB assets binding from native data of the Nostr protocol. It is a very simple script yet covers the core logic of the binding.

The second one is called the Nostr lock script, a lock script that uses Nostr native data as witnesses to unlock CKB transactions. It is used to help simplify the user experience and the process of building Nostr dApp with CKB.

### Nostr binding script

The Nostr binding script is a type-script that is used to define on-chain assets binding from some specific Events, the native data of the Nostr protocol.

The Nostr binding script assures that the Cell used this script as its type script is the one and only live cell that exits in the CKB blockchain that binds with one and only one specific Event from the Nostr protocol.

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

- TYPE_ID is used to make sure that only one live cell in the blockchain has a such type hash
- NOSTR_EVENT_ID is used to make sure that this cell only points to one unique Nostr Event

TBD
