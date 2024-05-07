# Nostr binding on CKB

> [!WARNING]
> This repository is still in the proof-of-concept stage.

This repository contains the scripts for the Nostr binding protocol on CKB. A special Nostr event(Nostr asset Event) is binding on a corresponding unique Cell on CKB, making only one Nostr account owning the Nostr asset Event.

We also build a very simple POC demo of the Nostr binding protocol in the `/app` directory. Check out the [README.md](/app/nostr-mint/README.md) about how to run it.

## Docs

Short PDF to explain the purpose of the Nostr binding protocol

- [Nostr Binding Protocol.pdf](/assets/Nostr%20Binding%20Protocol%20full.pdf)

Draft paper to describe the Nostr binding protocol

- [docs/whitepaper.md](/docs/whitepaper.md)

## Develop

### How to build and test scripts

```
make build
make test
```

### How to deploy scripts on CKB local blockchain for testing

use [offckb](https://github.com/RetricSu/offckb) to make this easier:

```bash
cd app/nostr-mint
offckb deploy --network devnet
```

The deployed script info is auto-updated in the `offckb.config.ts` file in the app so you can use it directly.

*This workspace was bootstrapped with [ckb-script-templates].*

[ckb-script-templates]: https://github.com/cryptape/ckb-script-templates
