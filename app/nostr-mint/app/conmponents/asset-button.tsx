import { useContext } from "react";
import { SingerContext } from "~/context/signer";
import { Event } from "@rust-nostr/nostr-sdk";

export interface AssetButtonProp {
  assetEvent: Event | undefined;
  setResult: (res: string) => void;
}

export function AssetButton({ setResult, assetEvent }: AssetButtonProp) {
  const context = useContext(SingerContext);
  const nostrSigner = context.nostrSigner!;

  const onClick = async () => {
	console.log(assetEvent?.asJson())
    setResult(assetEvent?.asJson() || "not found");
  };

  return (
    <div>
      <button onClick={onClick}>My Asset</button>
    </div>
  );
}
