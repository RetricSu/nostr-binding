# Nostr binding on CKB

> Move to [https://github.com/cryptape/nostr-binding](https://github.com/cryptape/nostr-binding)

> [!WARNING]
> This repository is still in the proof-of-concept stage.

This repository contains the scripts for the Nostr binding protocol on CKB. A special Nostr event(Nostr asset Event) is binding on a corresponding unique Cell on CKB, making only one Nostr account owning the Nostr asset Event.

We also build a very simple POC demo of the Nostr binding protocol in the `/app` directory. Check out the [README.md](/app/nostr-mint/README.md) about how to run it.

## Docs

A short presentation for the Bitcoin hackathon to explain the idea of the Nostr binding protocol

- [Nostr Binding Protocol.pdf](/assets/nostr-binding-presentation.pdf)

Light paper to describe the Nostr binding protocol

- [docs/lightpaper.md](/docs/lightpaper.md)
- [docs/lightpaper-zh.md](/docs/lightpaper-zh.md)(中文版)

## Run Demo

### 1. Start Devnet

```sh
offckb node
```

*Required [offckb](https://github.com/RetricSu/offckb) version >= 0.2.2*

### 2. Prepare Scripts

The following dependencies are required for building the Scripts:

* `git`, `make`, `sed`, `bash`, `sha256sum` and others Unix utilities. Refer to the documentation for your operating systems for how to install them. Chances are your system might already have them.
* `Rust`: latest stable Rust installed via [rustup](https://rustup.rs/) should work. Make sure you have `riscv64` target installed via: `rustup target add riscv64imac-unknown-none-elf`
* `Clang`: make sure you have clang 16+ installed, sample installtion steps for selected platforms are:
    + Debian / Ubuntu: `wget https://apt.llvm.org/llvm.sh && chmod +x llvm.sh && sudo ./llvm.sh 16 && rm llvm.sh`
    + Fedora 39+: `sudo dnf -y install clang`
    + Archlinux: `sudo pacman --noconfirm -Syu clang`
    + macOS: `brew install llvm@16`
    + Windows(with [Scoop](scoop install llvm yasm)): `scoop install llvm yasm`

Run the following commands to build the Scripts:

```sh
make build
cp deps/auth build/release/auth
```

### 3. Deploy Scripts

```sh
cd app/nostr-mint
offckb deploy --network devnet
```
The deployed script info is auto-updated in the `offckb.config.ts` file in the app so you can use it directly.

### 4. Start the DApp

```sh
cd app/nostr-mint
npm i && NETWORK=devnet npm run dev 
```

### 5. Deposit CKB to Nostr Account

```sh
offckb deposit --network devnet <Your-nostr-account-corresponding-address> <AmountInShannon>
```

*This workspace was bootstrapped with [ckb-script-templates].*

[ckb-script-templates]: https://github.com/cryptape/ckb-script-templates
