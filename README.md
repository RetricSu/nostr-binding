# Nostr binding on CKB

This repository contains the scripts for the Nostr binding on CKB. A special Nostr event(Nostr asset Event) is binding on a corresponding unique Cell on CKB, making only one Nostr account can own the Nostr asset Event.

[nostr-binding](contracts/nostr-binding/README.md)

## How to build and test

```
make build
make test
```

*This workspace was bootstrapped with [ckb-script-templates].*

[ckb-script-templates]: https://github.com/cryptape/ckb-script-templates
