# Nostr 绑定协议

## 摘要

在这篇文章里，我们提出了一种协议，将 Nostr 协议中的基本数据结构绑定到 CKB 区块链上。通过这种绑定，我们允许 Nostr 原生数据继承 CKB 区块链上 UTXO/Cell 的特性，为 Nostr 协议带来了基于链上机制的新的可能性。一个潜在的用例是在 Nostr 上发行原生资产。Nostr 绑定协议也为 dApp 带来了一种新的开发范式。与将你的 dApp 分成两个系统不同（一个是链下服务器，另一个是链上智能合约），我们使用一个具有不同数据级别的一致系统来构建 dApp。这与以太坊的模式有根本不同。

Web5 的三层结构:

![3-layers](/assets/3-layers.jpg)

## 关于 Nostr

Nostr 是一种简单且开放的信息分发协议，它使用中继-客户端模型在全球网络中分发标准消息。中继-客户端模型类似于区块链中的 P2P 网络，但更便宜、更灵活、更实用(也更集中化)，更适合用来打造消费级应用的大规模采用。标准消息是 Nostr 的核心创新。Nostr 基于 JSON 定义了一种标准的消息格式(这个消息格式同时也是协议的基本数据结构)，用于描述各种不同的数据。它被称为"Event"。

Event 结构:

```json
{
  "id": <32字节小写十六进制编码的序列化事件数据的sha256哈希值>，
  "pubkey": <32字节小写十六进制编码的事件创建者公钥>，
  "created_at": <Unix时间戳(秒)>，
  "kind": <0到65535之间的整数>， 
  "tags": [
    [<任意字符串>...]，
    // ...
  ]，
  "content": <任意字符串>，
  "sig": <64字节小写十六进制的序列化事件数据sha256哈希值的签名，与"id"字段相同>
}
```

Event 是一个包含任意内容并由用户签名的数据片段，因此可以在客户端进行验证，而无需信任任何中继服务器。你在 Nostr 协议中发布的所有消息都是不同种类和要求的 Event。你可以从 [NIPs](https://github.com/nostr-protocol/nips) 了解更多关于 Nostr 的信息。

## 关于 CKB  

CKB 是比特币的二层网络，具有类 UTXO 和 POW 的设计。CKB 的基本数据结构称为 Cell。Cell 是一种具有强大可编程性的通用 UTXO。

Cell 结构:

```bash
Cell: {
  capacity: 十六进制字符串; # 表示 Cell 的总存储空间大小。容量的基本单位是 shannon，1 CKB 等于 10^8 shannon。
  lock: Script; # 智能合约 
  type: Script; # 智能合约 
  data: 十六进制字符串; # 这个字段可以存储任意字节，这意味着它可以保存任何类型的数据
}
```

Script结构:

```bash
Script: {
  code_hash: 十六进制字符串
  args: 十六进制字符串
  hash_type: 无符号8位整数， 有4个允许的值: {0:"data"， 1:"type"， 2:"data1"， 3:"data2"}
}
```

你可以从 [docs.nervos.org](https://docs.nervos.org/) 了解更多关于 CKB 的信息。

## 绑定

所谓的绑定，就是在 Nostr Event 和 CKB Cell 之间创建一对一的映射关系。Event 用于定义你资产的详细信息，而与这个 Event 互相映射的 Cell 则用于提供所有权的保护和其他区块链特定的能力。要创建这种一对一映射，你需要让一个 Nostr Event 指向一个 CKB Cell，反之亦然。由于 Nostr 和 CKB 协议的简单性，创建这种绑定非常容易。

## 我们需要的只是两个 Script  

我们在 Nostr 绑定协议中引入了两个 CKB Script。第一个是 Nostr binding Script，它是一个 Type Script，定义了从 Nostr 协议的 Event 绑定到 CKB 上的方法。它是一个非常简单的 Script，但涵盖了绑定的核心逻辑。第二个是 Nostr lock Script，一个使用 Nostr Event 作为解锁签名的 Lock Script。它用于简化用户体验和构建基于 CKB 的 Nostr dApp 的过程。

### Nostr binding Script

Nostr binding Script是一个Type Script，用于定义从 Nostr 协议的某些特殊 Event 绑定到链上的规则。Nostr binding Script 确保使用该 Script 作为 Type Script的 Cell 是 CKB 区块链中唯一存在的一个与特定的 Nostr Event 绑定的 live Cell。  

binding Script:

```json
type:
  hash_type: "type" 
  code_hash: NOSTR_BINDING_TYPE_HASH
  args: BINDING_ARGS
lock: any Lock Script
witness: <Nostr 绑定的 Event， 使用 JSON 序列化>

BINDING_ARGS = NOSTR_EVENT_ID(32字节) + TYPE_ID(32字节)
```

- TYPE_ID 用于确保区块链中只有一个 live Cell 具有这种 type hash
- NOSTR_EVENT_ID 用于确保该 Cell 只指向一个唯一的 Nostr Event 

使用 Nostr binding Script 作为 Type Script的 Cell 是 Nostr Event 的绑定 Cell。

Nostr 绑定的 Event 结构:  

```json
{
  "id": <32字节小写十六进制编码的序列化事件数据的sha256哈希值>，
  "pubkey": <32字节小写十六进制编码的事件创建者公钥>，
  "created_at": <Unix时间戳(秒)>，
  "kind": <23333>，
  "tags": [
    ["e"， <第一个e标签是资产元数据事件id>]，
    ["cell_type_id"， <BINDING_ARGS的第二部分，CKB Cell type_id的32字节十六进制字符串>]，
    [<任意字符串>...]，
    // ...
  ]，
  "content": <FT面额的十六进制数值或NFT的内容>，
  "sig": <64字节小写十六进制的序列化事件数据sha256哈希值的签名，与"id"字段相同>
}
```

- cell_type_id 标签在 Nostr 资产 Event 中确保该 Event 只指向一个唯一的 CKB Cell

Nostr 资产 Event 呈现了用户铸造的资产。Nostr 资产元数据 Event 用于描述同一资产集合的元数据。

Nostr 资产元数据 Event 结构:

```json 
{
  "id": <32字节小写十六进制编码的序列化事件数据的sha256哈希值>，
  "pubkey": <32字节小写十六进制编码的事件创建者公钥>，
  "created_at": <Unix时间戳(秒)>，
  "kind": <23332>，
  "tags": [
    ["name"， <元资产名称，可选>]，
    ["symbol"， <元资产符号，可选>]， 
    ["decimals"， <元资产小数位数，可选>]，
    ["description"， <元资产描述，可选>]
    [<任意字符串>...]，
    // ...
  ]，
  "content": ""，
  "sig": <64字节小写十六进制的序列化事件数据sha256哈希值的签名，与"id"字段相同>
}
```

### Nostr Lock Script

Nostr lock Script 是一个使用 Nostr Event 作为解锁证明的 Lock Script。它用于简化用户体验和构建基于 CKB 的 Nostr dApp 的过程。

Nostr lock Script结构:

```json
lock:
  hash_type: "data2"
  code_hash: NOSTR_LOCK_DATA_HASH 
  args: NOSTR_公钥 <32字节> | POW难度 <4字节>
witness: <Nostr 解锁 Event， 使用 JSON 序列化>
```

- args 设置为 Nostr 账户的公钥。你也可以在最后 4 个字节中添加一个 POW 值，这意味着解锁 Event 必须满足一定的 POW 难度。
- 当 args 是 36 个字节全为 0 时，意味着没有人可以解锁该锁。
- 当前 32 个字节全为 0，最后 4 个字节是非零值时，意味着该锁可以被任何 Nostr 账户解锁，只要解锁 Event 满足一定的 POW 难度值(这可用于公平发行)

Nostr 解锁 Event 结构:

```json
{
  "id": <32字节小写十六进制编码的序列化事件数据的sha256哈希值>， 
  "pubkey": <32字节小写十六进制编码的事件创建者公钥>，
  "created_at": <Unix时间戳(秒)>，
  "kind": "<23334>"，
  "tags": [
    ["ckb_raw_tx"， <使用JSON序列化>]，
    ["ckb_tx_hash"， <CKB交易的哈希值>]，
    ["nonce"， <nonce值>， <难度值>]，// 可选
    [<任意字符串>...]，
    // ...
  ]，
  "content": <签名Nostr解锁Event，请理解你在签名什么...>，
  "sig": <64字节小写十六进制的序列化事件数据sha256哈希值的签名，与"id"字段相同>
}
```

要解锁使用 Nostr lock Script的 CKB Cell，必须在交易的 witness 字段中提供一个 Nostr 解锁 Event。用户可以生成多个解锁 Event，但由于 Event 在上传到链时会在标签中记录相应的 CKB 交易，剩余的 Event 将自动失效，因此不会有重放风险。

Nostr lock Script也可以支持多重签名。它的lock Script args 可以是一个 Nostr Event ID。该 Event 的 Tag 字段记录了所有所有者 M 个 P 公钥。解锁需要至少 N 个（N<=M）Nostr 账户提供 Nostr unlock Event 作为证明。

有了 Nostr lock Script的帮助，用户可以使用 Nostr 生态客户端和浏览器插件直接签名并生成解锁的 Event 作为签名证明来解锁 CKB 交易，因此这些链下 Nostr 生态工具的开发者可以尽可能少地了解和引入 CKB 与区块链相关的代码。同时，用户几乎可以"不关心"区块链。项目方或其他志愿者可以运行一个特殊的中继，监控 Nostr 网络中是否有新的解锁 Event，如果有，就帮助解析交易并提交到 CKB 链进行解锁。交易费用可以通过预留部分余额作为手续费的 Cell 来支付。

## 发行资产

### 直接绑定

用户:需要 Nostr 账户和 CKB

1. 索引 CKB Cell 并计算该 Cell 的 TYPE_ID  
2. 使用 TYPE_ID 生成带有 Nostr 签名的 Nostr 资产 Event
3. 使用 Nostr 资产 Event 生成 CKB 绑定交易，并发送到链上

### 通过 RGB++

用户:需要 Nostr 账户、比特币钱包和聪

1. 索引 UTXO，通过 RGB++ 生成映射 Cell，并计算该 Cell 的 TYPE_ID
2. 使用 TYPE_ID 生成带有 Nostr 签名的 Nostr 资产 Event  
3. 使用 Nostr 资产 Event 生成 CKB 绑定交易，并发送到链上

## 转账

### 使用 Nostr 锁定时

用户:需要 Nostr 账户

- 在 CKB 上索引你想要解锁的使用 Nostr lock Script的 Cell
- 构造一个 CKB 交易，用其他lock Script替换这个 Cell
- 使用第 2 步的结果，通过 Nostr 客户端/浏览器扩展生成 Nostr 解锁 Event
- 将 Nostr 解锁 Event 发送到一个特殊的中继组，并提交到链上

### 使用其他锁定时

用户:需要拥有对应其他锁定的钱包，无需任何 Nostr 相关操作

只需按照 CKB/RGB++ 上的正常流程解锁转账即可。

## 可扩展性问题

Nostr 绑定协议的主要优势是非常简单直接。简单性也使客户端开发者更容易在其之上构建产品。另一方面，Nostr 绑定协议的缺点是可扩展性问题。在这种简单设计下，Nostr token 的吞吐量与 CKB 区块链绑定，因此 CKB 区块链将成为瓶颈。考虑到 Nostr 作为一个更灵活的社交网络，旨在大规模采用，当未来有大量用户与这些原生资产交互时，这种吞吐量可能会成为问题。

然而，我们看到了一些解决这个问题的选择:

1. 与 CKB 闪电网络集成

由于 Nostr 绑定协议创建的 Nostr 原生资产可以被视为普通的 CKB 资产，因此一旦 CKB 闪电网络推出，我们可以利用它来扩展 Nostr 绑定协议。Nostr 绑定协议本身不需要任何更改，这是一个免费的功能。但缺点是需要等待 CKB 闪电网络推出。

2. 实现简单但有用的支付通道

在 CKB 闪电网络推出之前的另一种选择是实现一些非常简单但有用的支付通道，如 [spillman 通道](https://en.bitcoin.it/wiki/Payment_channels#Spillman-style_payment_channels)。spillman 通道是一种单向支付通道，实现更简单。通道中有一个付款人和一个收款人。对于区块链来说，这种支付通道可能不太有用，但在 Nostr 绑定协议的情况下，它非常适合内容创作者与他们的关注者之间的订阅模式。

3. N 对 1 绑定而不是 1 对 1 绑定

与创建 1 对 1 绑定不同，我们可以在 Nostr Event 和 CKB Cell 之间创建 N 对 1 绑定。换句话说，我们将多个事件捆绑到一个单元格中，以实现可扩展性。这将使链上映射存储成本比链下 Nostr Event 小得多。但是，N 对 1 绑定的问题在于，它需要设计一种新的模式来控制和拆分捆绑事件的所有权。这将更加复杂，需要额外的设计和实现工作。

4. RGB 风格解决方案

实现最终可扩展性的另一种方式是创建一种 RGB 风格的解决方案，将 CKB Cell 用作一次性密封，并使 Nostr 协议成为类似 RGB 协议的实现层。这种解决方案可以选择只实现代币标准，而排除原始 RGB 协议中的通用智能合约理念，从而简化工作流程。

## 常见问题解答

**为什么选择 Nostr?**

Nostr 是基于加密技术的大众级应用的理想层。它是一种超级简单、直接、实用、不带偏见且易于集成的信息分发协议。许多 web3 项目可能会使用类似 [Arweave](https://www.arweave.org/) 和 [IPFS](https://ipfs.tech/) 的东西，它们持有完全不同的价值观和理念。你可以将 Nostr 视为一种超级松散的协议，没有对完全去中心化的 P2P 网络的执着，也没有长期存在于 web3 世界中对代币经济和激励机制的过度承诺，这使得 Nostr 更加实用和不带偏见。

**为什么不直接使用区块链资产?**

让用户能够基于 Event 在 Nostr 网络中发行自己的原生资产，而不是在 Nostr 网络中直接使用现有的区块链代币，主要是基于这样一个简单的事实：如果没有创造价值，代币就没有意义。对于消费级产品，大多数区块链资产只会在产品工作流程中带来阻力，而不会为产品增加价值。与其将代币机制强加到产品中，不如从用户角度出发，看看他们需要什么，区块链能提供什么帮助。我们认为基于 Event 的原生资产符合这种方法论。应用开发者和用户可以从自己的角度看看他们能用资产做什么，而不是强制他们接受现有的区块链资产和规则。此外，基于 Event 的资产更容易与 Nostr 协议无缝协作，为现有的 Nostr 生态系统产品和工具带来了新的玩法。

**为什么选择 CKB?**  

由于 CKB 的可编程性，使用 CKB 实现绑定协议要容易得多。比特币就更难了。此外，考虑到 CKB 与 BTC 绑定的独特方式，通过先与 CKB 绑定，再与 BTC 绑定会更容易。

## 结语

总的来说，Nostr 作为一种简单实用的信息分发协议，非常适合消费级应用的大规模采用。而 CKB 的可编程性和与比特币的绑定关系，使其成为实现 Nostr 绑定协议的理想选择。同时，基于 Nostr Event 发行原生资产，可以从应用出发设计新的产品机制，从而让 Nostr 与其他传统互联网应用进行竞争，寻找自己独特的 PMF。
