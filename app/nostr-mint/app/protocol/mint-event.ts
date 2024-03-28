import { EventBuilder, EventId, PublicKey, Tag } from "@rust-nostr/nostr-sdk";
import { TagName } from "./tag";

export class MintEvent {
  public static kind = 23333;

  static init(
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
}
