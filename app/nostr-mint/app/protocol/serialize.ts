import { Event } from "@rust-nostr/nostr-sdk";

export class Serializer {
  static packEvents(events: Event[]) {
    const totalEventCount = numberToLEOneByte(events.length);
    const eventBytes: Array<Uint8Array> = [];
    for (const event of events) {
      const e = jsonStringToBytes(event.asJson());
      const len = numberToLE8Bytes(e.length);
      eventBytes.push(concatUint8Arrays([len, e]));
    }
    return concatUint8Arrays([totalEventCount, ...eventBytes]);
  }
}

function numberToLEOneByte(number: number): Uint8Array {
  const buffer = new ArrayBuffer(1); // Using a single byte buffer
  const view = new DataView(buffer);
  view.setUint8(0, number); // Setting the number directly as a byte
  return new Uint8Array(buffer);
}

function numberToLE8Bytes(number: number): Uint8Array {
  const buffer = new ArrayBuffer(8); // Using a single byte buffer
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(number), true); // Setting the number in little-endian format
  return new Uint8Array(buffer);
}

function jsonStringToBytes(jsonString: string): Uint8Array {
  const encoder = new TextEncoder();
  const encodedString = encoder.encode(jsonString);
  return encodedString;
}

function concatUint8Arrays(arrays: Array<Uint8Array>): Uint8Array {
  const length = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  arrays.forEach((arr) => {
    result.set(arr, offset);
    offset += arr.length;
  });
  return result;
}
