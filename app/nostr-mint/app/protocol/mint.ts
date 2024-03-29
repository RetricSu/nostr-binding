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
import { lumosConfig } from "./ckb/ckb";
import { buildAlwaysSuccessLock, collectCell } from "./ckb/helper";

export class Mint {
  public static kind = 23333;

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
    const bindingArgs = `${eventId.slice(2)}${typeId.slice(2)}`;
    return {
      codeHash: "", // todo...
      hashType: "type",
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
    const typeId = utils.generateTypeIdScript(input, "0x0").args;

    const owner = assetEvent.author.toHex();
    const difficulty = 20;

    const mintEvent = this.buildEvent(
      assetEvent.id.toHex(),
      typeId,
      owner
    ).toUnsignedPowEvent(assetEvent.author, difficulty);

    const bindingCell = this.buildBindingCell(mintEvent.id.toHex(), typeId);

    const txCellDeps = this.buildCellDeps();

    txSkeleton = txSkeleton.update("inputs", (inputs) =>
      inputs.push(...inputs)
    );
    txSkeleton = txSkeleton.update("outputs", (outputs) =>
      outputs.push(bindingCell)
    );
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.concat(txCellDeps)
    );
    return {txSkeleton, mintEvent};
  }
}
