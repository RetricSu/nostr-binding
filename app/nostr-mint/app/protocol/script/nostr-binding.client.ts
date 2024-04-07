import {
  BI,
  Cell,
  CellDep,
  HexNumber,
  HexString,
  Input,
  Script,
  helpers,
  utils,
} from "@ckb-lumos/lumos";
import offckb from "offckb.config";

const lumosConfig = offckb.lumosConfig;

export class NostrBinding {
  static buildScript(eventId: HexString, typeId: HexString): Script {
    const bindingArgs = `0x${eventId}${typeId}`;
    return {
      codeHash: lumosConfig.SCRIPTS.NOSTR_BINDING!.CODE_HASH,
      hashType: lumosConfig.SCRIPTS.NOSTR_BINDING!.HASH_TYPE,
      args: bindingArgs,
    };
  }

  static buildBindingCell(eventId: HexString, typeId: HexString, lock: Script) {
    const type = NostrBinding.buildScript(eventId, typeId);
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

  static buildTypeId(inputCell: Cell, index: HexNumber) {
    if (!inputCell.outPoint) throw new Error("input Cell has no outpoint!");

    const input: Input = {
      previousOutput: inputCell.outPoint!,
      since: "0x0",
    };
    const typeId = utils.generateTypeIdScript(input, index).args.slice(2);
    return typeId;
  }

  static buildCellDeps() {
    const cellDeps: CellDep[] = [];
    cellDeps.push(
      {
        outPoint: {
          txHash: lumosConfig.SCRIPTS.NOSTR_BINDING!.TX_HASH,
          index: lumosConfig.SCRIPTS.NOSTR_BINDING!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.NOSTR_BINDING!.DEP_TYPE,
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
}
