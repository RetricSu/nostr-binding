import {
  helpers,
  BI,
  Cell,
  Script,
  HashType,
  utils,
  Transaction,
} from "@ckb-lumos/lumos";
import offCKB from "offckb.config";
import { blockchain } from "@ckb-lumos/base";
import { bytes } from "@ckb-lumos/codec";

offCKB.initializeLumosConfig();

const lumosConfig = offCKB.lumosConfig;
const indexer = offCKB.indexer;

export async function collectCell(ckbAddress: string, neededCapacity: BI) {
  const fromScript = helpers.parseAddress(ckbAddress, {
    config: lumosConfig,
  });

  let collectedSum = BI.from(0);
  const collected: Cell[] = [];
  const collector = indexer.collector({ lock: fromScript, type: "empty" });
  for await (const cell of collector.collect()) {
    collectedSum = collectedSum.add(cell.cellOutput.capacity);
    collected.push(cell);
    if (collectedSum >= neededCapacity) break;
  }

  if (collectedSum.lt(neededCapacity)) {
    throw new Error(`Not enough CKB, ${collectedSum} < ${neededCapacity}`);
  }

  return collected;
}

export async function collectTypeCell(
  ckbAddress: string,
  type: Script,
  total: number
) {
  const fromScript = helpers.parseAddress(ckbAddress, {
    config: lumosConfig,
  });

  const collected: Cell[] = [];
  const collector = indexer.collector({ lock: fromScript, type });
  for await (const cell of collector.collect()) {
    collected.push(cell);
    if (collected.length >= total) break;
  }

  if (collected.length < total) {
    throw new Error(`Not enough type cells, ${collected.length} < ${total}`);
  }

  return collected;
}

export async function capacityOf(address: string): Promise<BI> {
  const collector = indexer.collector({
    lock: helpers.parseAddress(address),
  });

  let balance = BI.from(0);
  for await (const cell of collector.collect()) {
    balance = balance.add(cell.cellOutput.capacity);
  }

  return balance;
}

export function buildAlwaysSuccessLock(): Script {
  return {
    codeHash: lumosConfig.SCRIPTS["ALWAYS_SUCCESS"]!.CODE_HASH,
    hashType: lumosConfig.SCRIPTS["ALWAYS_SUCCESS"]!.HASH_TYPE as HashType,
    args: "0x",
  };
}

export function computeTransactionHash(rawTransaction: Transaction) {
  const transactionSerialized = bytes.hexify(
    blockchain.RawTransaction.pack(rawTransaction)
  );
  const rawTXHash = utils.ckbHash(transactionSerialized);
  return rawTXHash;
}
