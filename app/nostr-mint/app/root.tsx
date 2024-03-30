import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { NostrSigner } from "@rust-nostr/nostr-sdk";
import { useState } from "react";
import { CKBSigner, SingerContext } from "./context/signer";
import { Buffer } from "buffer";

globalThis.Buffer = Buffer as unknown as BufferConstructor;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [nostrSigner, setNostrSigner] = useState<NostrSigner | null>(null);
  const [ckbSigner, setCKBSigner] = useState<CKBSigner | null>(null);

  const value = { nostrSigner, setNostrSigner, ckbSigner, setCKBSigner };
  return (
    <SingerContext.Provider value={value}>
      <Outlet />
    </SingerContext.Provider>
  );
}
