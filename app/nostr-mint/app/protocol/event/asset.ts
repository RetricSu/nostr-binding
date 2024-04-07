import { Tag, EventBuilder } from "@rust-nostr/nostr-sdk";
import { TagName } from "../tag";
import { ProtocolKind } from "../kind";

export interface AssetPayload {
  name?: string;
  description?: string;
  decimal?: number;
  symbol?: string;
}

export class Asset {
  public static kind = ProtocolKind.assetMeta;
  static buildEvent(payload: AssetPayload, content: string = "") {
    const tags = [];
    if (payload.name) {
      tags.push(Tag.parse([TagName.name, payload.name]));
    }
    if (payload.description) {
      tags.push(Tag.parse([TagName.description, payload.description]));
    }
    if (payload.decimal) {
      tags.push(Tag.parse([TagName.decimal, payload.decimal.toString()]));
    }
    if (payload.symbol) {
      tags.push(Tag.parse([TagName.symbol, payload.symbol]));
    }

    const builder = new EventBuilder(this.kind, content, tags);
    return builder;
  }
}
