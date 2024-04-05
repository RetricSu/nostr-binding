import {
  Event,
  EventBuilder,
  EventId,
  PublicKey,
  Tag,
} from "@rust-nostr/nostr-sdk";
import { TagName } from "./tag";
import {
  BI,
  Cell,
  CellDep,
  HexString,
  Input,
  Script,
  helpers,
  utils,
} from "@ckb-lumos/lumos";

import { collectCell } from "./ckb/helper.client";
import offCKBConfig from "offckb.config";

const lumosConfig = offCKBConfig.lumosConfig;

export class Mint {
  public static kind = 23333;
  public static mintDifficulty = 10;

  static buildEvent(assetEventId: string, cellTypeId: string, content = "") {
    const tags = [
      Tag.event(EventId.fromHex(assetEventId)),
      Tag.parse([TagName.cellTypeId, cellTypeId]),
    ];
    const builder = new EventBuilder(this.kind, content, tags);
    return builder;
  }

  static buildBindingTypeScript(eventId: HexString, typeId: HexString): Script {
    const bindingArgs = `0x${eventId}${typeId}`;
    return {
      codeHash: lumosConfig.SCRIPTS.NOSTR_BINDING!.CODE_HASH,
      hashType: lumosConfig.SCRIPTS.NOSTR_BINDING!.HASH_TYPE,
      args: bindingArgs,
    };
  }

  static buildNostrLockScript(publicKey: PublicKey): Script {
    const lockArgs = "0x" + publicKey.toHex();
    return {
      codeHash: lumosConfig.SCRIPTS.NOSTR_LOCK!.CODE_HASH,
      hashType: lumosConfig.SCRIPTS.NOSTR_LOCK!.HASH_TYPE,
      args: lockArgs,
    };
  }

  static buildBindingCell(
    eventId: HexString,
    typeId: HexString,
    ownerPubkey: PublicKey
  ) {
    const lock = this.buildNostrLockScript(ownerPubkey);
    const type = this.buildBindingTypeScript(eventId, typeId);
    const bindingOutput: Cell = {
      cellOutput: {
        capacity: BI.from(0).toHexString(),
        lock,
        type,
      },
      data: "0x00",
    };
    const capacity = helpers.minimalCellCapacity(bindingOutput);
    bindingOutput.cellOutput.capacity = BI.from(capacity).toHexString();
    return bindingOutput;
  }

  static buildCellDeps() {
    const cellDeps: CellDep[] = [];
    cellDeps.push(
      {
        outPoint: {
          txHash: lumosConfig.SCRIPTS.SECP256K1_BLAKE160!.TX_HASH,
          index: lumosConfig.SCRIPTS.SECP256K1_BLAKE160!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.SECP256K1_BLAKE160!.DEP_TYPE,
      },
      {
        outPoint: {
          txHash: lumosConfig.SCRIPTS.OMNILOCK!.TX_HASH,
          index: lumosConfig.SCRIPTS.OMNILOCK!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.OMNILOCK!.DEP_TYPE,
      },
      {
        outPoint: {
          txHash: lumosConfig.SCRIPTS.NOSTR_BINDING!.TX_HASH,
          index: lumosConfig.SCRIPTS.NOSTR_BINDING!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.NOSTR_BINDING!.DEP_TYPE,
      },
      {
        outPoint: {
          txHash: lumosConfig.SCRIPTS.NOSTR_LOCK!.TX_HASH,
          index: lumosConfig.SCRIPTS.NOSTR_LOCK!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.NOSTR_LOCK!.DEP_TYPE,
      },
      {
        outPoint: {
          txHash: lumosConfig.SCRIPTS.AUTH!.TX_HASH,
          index: lumosConfig.SCRIPTS.AUTH!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.AUTH!.DEP_TYPE,
      }
    );
    return cellDeps;
  }

  static async build(ckbAddress: string, assetEvent: Event) {
    let txSkeleton = helpers.TransactionSkeleton({});
    const collectedInputs = await collectCell(ckbAddress, BI.from(16000000000));

    const input: Input = {
      previousOutput: collectedInputs[0].outPoint!,
      since: "0x0",
    };
    const typeId = utils.generateTypeIdScript(input, "0x0").args.slice(2);

    const owner = assetEvent.author.toHex();

    const mintEvent = this.buildEvent(
      assetEvent.id.toHex(),
      typeId,
      owner
    ).toUnsignedPowEvent(assetEvent.author, this.mintDifficulty);

    const bindingCell = this.buildBindingCell(
      mintEvent.id.toHex(),
      typeId,
      mintEvent.pubkey
    );

    const txCellDeps = this.buildCellDeps();

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
