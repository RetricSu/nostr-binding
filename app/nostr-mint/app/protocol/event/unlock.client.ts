import {
  BI,
  Cell,
  HexString,
  Script,
  helpers,
} from "@ckb-lumos/lumos";
import { Tag, EventBuilder, PublicKey } from "@rust-nostr/nostr-sdk";
import { TagName } from "../tag";
import { collectTypeCell } from "../ckb-helper.client";
import { NostrLock } from "../script/nostr-lock.client";
import { ProtocolKind } from "../kind";

export class Unlock {
  public static kind = ProtocolKind.unlock;
  public static unlockDifficulty = 10;

  static buildEvent(txHash: HexString) {
    const tags = [Tag.parse([TagName.ckbTxHash, txHash])];
    const builder = new EventBuilder(this.kind, "", tags);
    return builder;
  }

  static async buildCKBTransaction(
    nostrPublicKey: PublicKey,
    newLock: Script,
    type: Script
  ) {
    const ckbAddress = NostrLock.encodeToCKBAddress(nostrPublicKey);

    let txSkeleton = helpers.TransactionSkeleton({});
    const collectedInputs = await collectTypeCell(ckbAddress, type, 1);

    const output: Cell = {
      cellOutput: {
        capacity: BI.from(0).toHexString(),
        lock: newLock,
        type,
      },
      data: "0x00",
    };
    const capacity = helpers.minimalCellCapacity(output);
    output.cellOutput.capacity = BI.from(capacity).toHexString();

    const txCellDeps = NostrLock.buildCellDeps();

    txSkeleton = txSkeleton.update("inputs", (inputs) =>
      inputs.push(...collectedInputs)
    );
    txSkeleton = txSkeleton.update("outputs", (outputs) =>
      outputs.push(output)
    );
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.concat(txCellDeps)
    );

    return txSkeleton;
  }
}
