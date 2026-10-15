import type { ReceiptItem } from '@/types/contracts'
import { formatEth } from '@/lib/eth'
export function TransactionItems({
  items,
  receipt = false,
}: {
  items: ReceiptItem[]
  receipt?: boolean
}) {
  return (
    <>
      <div className={`transaction-head ${receipt ? 'with-editions' : ''}`}>
        <span>NFTs</span>
        {receipt && <span>Edições</span>}
        <span>Subtotal</span>
      </div>
      <ul className={`transaction-items ${receipt ? 'with-editions' : ''}`}>
        {items.map((item) => (
          <li key={item.key}>
            <img
              src={item.image}
              width="70"
              height="70"
              alt={`Arte digital ${item.name}`}
            />
            <div>
              <strong>{item.name}</strong>
              <small>
                ID do token: #
                {item.token || item.name.split('#')[1]?.padStart(4, '0')}
              </small>
            </div>
            <span>(x {item.quantity})</span>
            <strong>{formatEth(item.subtotal)}</strong>
          </li>
        ))}
      </ul>
    </>
  )
}
