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

import { buildAlwaysSuccessLock, collectCell } from "./ckb/helper";
import offCKBConfig from "offckb.config";

const lumosConfig = offCKBConfig.lumosConfig;

export class Mint {
  public static kind = 23333;
  public static mintDifficulty = 10;

  static buildEvent(
    assetEventId: string,
    cellTypeId: string,
    firstOwnerPubkey: string,
    content = ""
  ) {
    const tags = [
      Tag.event(EventId.fromHex(assetEventId)),
      Tag.public_key(PublicKey.fromHex(firstOwnerPubkey)),
      Tag.parse([TagName.cellTypeId, cellTypeId]),
    ];
    const builder = new EventBuilder(this.kind, content, tags);
    return builder;
  }

  static buildBindingTypeScript(eventId: HexString, typeId: HexString): Script {
    const bindingArgs = `0x${eventId}${typeId}`;
    return {
      codeHash: lumosConfig.SCRIPTS.OMNILOCK!.CODE_HASH, // todo: change to deployed contract...
      hashType: lumosConfig.SCRIPTS.OMNILOCK!.HASH_TYPE,
      args: bindingArgs,
    };
  }

  static buildBindingCell(eventId: HexString, typeId: HexString) {
    const lock = buildAlwaysSuccessLock();
    const type = this.buildBindingTypeScript(eventId, typeId);
    const bindingOutput: Cell = {
      cellOutput: {
        capacity: BI.from(0).toHexString(),
        lock,
        type,
      },
      data: "0x",
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
      }
    );
    return cellDeps;
  }

  static async build(ckbAddress: string, assetEvent: Event) {
    let txSkeleton = helpers.TransactionSkeleton({});
    const inputs = await collectCell(ckbAddress, BI.from(10000));

    const input: Input = {
      previousOutput: inputs[0].outPoint!,
      since: "0x0",
    };
    const typeId = utils.generateTypeIdScript(input, "0x0").args.slice(2);

    const owner = assetEvent.author.toHex();

    const mintEvent = this.buildEvent(
      assetEvent.id.toHex(),
      typeId,
      owner
    ).toUnsignedPowEvent(assetEvent.author, this.mintDifficulty);

    const bindingCell = this.buildBindingCell(mintEvent.id.toHex(), typeId);

    const txCellDeps = this.buildCellDeps();

    txSkeleton = txSkeleton.update("inputs", (_inputs) =>
      _inputs.push(...inputs)
    );
    txSkeleton = txSkeleton.update("outputs", (outputs) =>
      outputs.push(bindingCell)
    );
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.concat(txCellDeps)
    );
    console.log("tx skeleton is ready");
    return { txSkeleton, mintEvent };
  }
}
