import { useZap } from '@/providers/ZapProvider'
import { TTransaction } from '@/services/lightning.service'
import { ArrowDownLeft, ArrowUpRight, Check, Clock, X } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface TransactionItemProps {
  transaction: TTransaction
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const { formatBalance } = useZap()

  const Icon = transaction.type === 'sent' ? ArrowUpRight : ArrowDownLeft
  const colorClass = transaction.type === 'sent' ? 'text-red-500' : 'text-green-500'
  const bgColorClass = transaction.type === 'sent' ? 'bg-red-500/10' : 'bg-green-500/10'

  const StatusIcon =
    transaction.status === 'completed' ? Check : transaction.status === 'pending' ? Clock : X
  const statusColorClass =
    transaction.status === 'completed'
      ? 'text-green-500'
      : transaction.status === 'pending'
        ? 'text-yellow-500'
        : 'text-red-500'

  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`flex size-10 items-center justify-center rounded-full ${bgColorClass}`}>
        <Icon className={`size-5 ${colorClass}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${colorClass}`}>
            {transaction.type === 'sent' ? '-' : '+'}
            {formatBalance(transaction.amount)}
          </span>
          <StatusIcon className={`size-3.5 ${statusColorClass}`} />
        </div>
        <div className="text-sm text-muted-foreground">
          {transaction.description || (transaction.type === 'sent' ? 'Payment' : 'Received')}
        </div>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        {dayjs(transaction.date).fromNow()}
      </div>
    </div>
  )
}
