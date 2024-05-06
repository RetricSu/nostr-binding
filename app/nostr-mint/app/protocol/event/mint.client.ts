import {
  Event,
  EventBuilder,
  EventId,
  PublicKey,
  Tag,
} from "@rust-nostr/nostr-sdk";
import { TagName } from "../tag";
import { BI, helpers } from "@ckb-lumos/lumos";

import { collectCell } from "../ckb-helper.client";
import { NostrLock } from "../script/nostr-lock.client";
import { NostrBinding } from "../script/nostr-binding.client";
import { ProtocolKind } from "../kind";
import { mergeArraysAndRemoveDuplicates } from "../util";

export class Mint {
  public static kind = ProtocolKind.mint;
  public static mintDifficulty = 10;

  static buildEvent(assetEventId: string, cellTypeId: string, content = "") {
    const tags = [
      Tag.event(EventId.fromHex(assetEventId)),
      Tag.parse([TagName.cellTypeId, cellTypeId]),
    ];
    const builder = new EventBuilder(this.kind, content, tags);
    return builder;
  }

  static async buildTransaction(ckbAddress: string, assetEvent: Event) {
    let txSkeleton = helpers.TransactionSkeleton({});
    const collectedInputs = await collectCell(ckbAddress, BI.from(16000000000));

    const typeId = NostrBinding.buildTypeId(collectedInputs[0], "0x0");

    const mintEvent = this.buildEvent(
      assetEvent.id.toHex(),
      typeId,
      "This is the content of the Test-NFT Item"
    ).toUnsignedPowEvent(assetEvent.author, this.mintDifficulty);

    const ownerPubkeyStr = NostrLock.parseCBKAddressToNostrPubkey(ckbAddress);
    const ownerPubkey = PublicKey.fromHex(ownerPubkeyStr.slice(2));
    const lock = NostrLock.buildScript(ownerPubkey);
    const bindingCell = NostrBinding.buildBindingCell(
      mintEvent.id.toHex(),
      typeId,
      lock
    );
    // todo: add changeCell and fee rate

    const txCellDeps = mergeArraysAndRemoveDuplicates(
      NostrBinding.buildCellDeps(),
      NostrLock.buildCellDeps()
    );

    txSkeleton = txSkeleton.update("inputs", (inputs) =>
      inputs.push(...collectedInputs)
    );
    txSkeleton = txSkeleton.update("outputs", (outputs) =>
      outputs.push(bindingCell)
    );
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.concat(txCellDeps)
    );
    return { txSkeleton, mintEvent };
  }
}
