import { Script, commons, helpers } from "@ckb-lumos/lumos";
import { useContext, useState } from "react";
import { CKBSigner, SingerContext } from "~/context/signer";
import { capacityOf } from "~/protocol/ckb/helper.client";
import { blockchain } from "@ckb-lumos/base";
import { bytes } from "@ckb-lumos/codec";

interface EthereumRpc {
  (payload: {
    method: "personal_sign";
    params: [string /*from*/, string /*message*/];
  }): Promise<string>;
}

export interface EthereumProvider {
  selectedAddress: string;
  isMetaMask?: boolean;
  enable: () => Promise<string[]>;
  addListener: (
    event: "accountsChanged",
    listener: (addresses: string[]) => void
  ) => void;
  removeEventListener: (
    event: "accountsChanged",
    listener: (addresses: string[]) => void
  ) => void;
  request: EthereumRpc;
}

export function ConnectMetamask() {
  const { ckbSigner: signer, setCKBSigner: setSigner } =
    useContext(SingerContext)!;

  const [ethAddr, setEthAddr] = useState("");
  const [omniAddr, setOmniAddr] = useState("");
  const [omniLock, setOmniLock] = useState<Script>();
  const [balance, setBalance] = useState("0");

  const connect = async () => {
    //@ts-ignore
    const ethereum = window.ethereum as EthereumProvider;
    ethereum
      .enable()
      .then(([ethAddr]: string[]) => {
        const omniLockScript = commons.omnilock.createOmnilockScript({
          auth: { flag: "ETHEREUM", content: ethAddr },
        });

        const omniAddr = helpers.encodeToAddress(omniLockScript);

        setEthAddr(ethAddr);
        setOmniAddr(omniAddr);
        setOmniLock(omniLockScript);

        // update ckb signer context
        const signMessage = async (message: string) => {
          let signedMessage = await ethereum.request({
            method: "personal_sign",
            params: [ethereum.selectedAddress, message],
          });
          let v = Number.parseInt(signedMessage.slice(-2), 16);
          if (v >= 27) v -= 27;
          signedMessage =
            "0x" + signedMessage.slice(2, -2) + v.toString(16).padStart(2, "0");

          return signedMessage;
        };

        const buildWitnessPlaceholder = (eventWitness: Uint8Array) => {
          const SECP_SIGNATURE_PLACEHOLDER = bytes.hexify(
            new Uint8Array(
              commons.omnilock.OmnilockWitnessLock.pack({
                signature: new Uint8Array(65).buffer,
              }).byteLength
            )
          );

          const witness = bytes.hexify(
            blockchain.WitnessArgs.pack({
              lock: SECP_SIGNATURE_PLACEHOLDER,
              outputType: bytes.hexify(eventWitness),
            })
          );

          return witness;
        };

        const buildSigningEntries = (
          txSkeleton: any,
          eventWitness: Uint8Array
        ) => {
          const witness = buildWitnessPlaceholder(eventWitness);
          // fill txSkeleton's witness with placeholder
          for (let i = 0; i < txSkeleton.inputs.toArray().length; i++) {
            txSkeleton = txSkeleton.update(
              "witnesses",
              (witnesses: Immutable.List<string>) => witnesses.push(witness)
            );
          }

          txSkeleton = commons.omnilock.prepareSigningEntries(txSkeleton);
          return txSkeleton;
        };

        const ckbSigner: CKBSigner = {
          buildSigningEntries,
          ckbAddress: omniAddr,
          originAddress: ethAddr,
          lockScript: omniLockScript,
          signMessage,
        };
        setSigner(ckbSigner);

        return omniAddr;
      })
      .then((omniAddr) => capacityOf(omniAddr))
      .then((balance) => setBalance(balance.div(10 ** 8).toString()));
  };
  return (
    <>
      <button onClick={connect}>
        {ethAddr
          ? `eth: ${ethAddr.slice(0, 4)}..${ethAddr.slice(-4)}`
          : "connect eth account"}
      </button>
      {omniAddr && omniAddr}
      {balance && +balance > 0 && <p>balance: {balance}</p>}
    </>
  );
}
