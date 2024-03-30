import { Tag, EventId, PublicKey, EventBuilder } from "@rust-nostr/nostr-sdk";
import { TagName } from "./tag";

export interface AssetPayload {
  name?: string;
  description?: string;
  decimal?: number;
  symbol?: string;
}

export class Asset {
  public static kind = 23332;
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
