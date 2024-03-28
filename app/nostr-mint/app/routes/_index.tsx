import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Nostr binding</h1>
      <ul>
        <li>
        <button>mint nostr tokens</button>
        </li>
        <li>
          <button>my tokens</button>
        </li>
        <li>
          <button>explore</button>
        </li>
      </ul>
    </div>
  );
}
