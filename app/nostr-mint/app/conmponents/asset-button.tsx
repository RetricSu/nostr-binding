import { ReactNode, useContext } from "react";
import { SingerContext } from "~/context/signer";
import { Event } from "@rust-nostr/nostr-sdk";

export interface AssetButtonProp {
  assetEvent: Event | undefined;
  setResult: (res: string | ReactNode) => void;
}

export function AssetButton({ setResult, assetEvent }: AssetButtonProp) {
  const context = useContext(SingerContext);

  const onClick = async () => {
    const jsonEvent = assetEvent?.asJson();
    if (jsonEvent) {
      return setResult(
        <code className="whitespace-pre">
          {JSON.stringify(JSON.parse(jsonEvent), null, 2)}
        </code>
      );
    }
    setResult("not found");
  };

  return (
    <div>
      <button onClick={onClick}>My Asset</button>
    </div>
  );
}
