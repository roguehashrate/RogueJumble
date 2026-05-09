import { useZap } from '@/providers/ZapProvider'
import { TTransaction } from '@/services/lightning.service'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock,
  X
} from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface TransactionItemProps {
  transaction: TTransaction
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const { formatBalance } = useZap()

  const isSent = transaction.type === 'sent'

  const DirectionIcon = isSent ? ArrowUpRight : ArrowDownLeft
  const StatusIcon =
    transaction.status === 'completed' ? Check : transaction.status === 'pending' ? Clock : X

  const accentRing = isSent ? 'bg-red-500/50' : 'bg-green-500/50'
  const iconBg = isSent ? 'bg-red-500/10' : 'bg-green-500/10'
  const iconColor = isSent ? 'text-red-500' : 'text-green-500'
  const amountColor = isSent ? 'text-red-500' : 'text-green-500'
  const directionLabelColor = isSent ? 'text-red-600 bg-red-500/15' : 'text-green-600 bg-green-500/15'

  const statusIconColor =
    transaction.status === 'completed'
      ? 'text-green-700 bg-green-500/15'
      : transaction.status === 'pending'
        ? 'text-yellow-700 bg-yellow-500/15'
        : 'text-red-700 bg-red-500/15'

  return (
    <div className="relative flex items-center gap-3 py-3 pl-3">
      <div className={`absolute bottom-2 left-0 top-2 w-0.5 rounded-full ${accentRing}`} />

      <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <DirectionIcon className={`size-5 ${iconColor}`} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-base font-bold ${amountColor}`}>
            {isSent ? '-' : '+'}
            {formatBalance(transaction.amount)}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${statusIconColor}`}
          >
            <StatusIcon className="mr-0.5 size-2.5" />
            {transaction.status === 'completed'
              ? 'Done'
              : transaction.status === 'pending'
                ? 'Pending'
                : 'Failed'}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span
            className={`rounded px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider ${directionLabelColor}`}
          >
            {isSent ? 'Sent' : 'Received'}
          </span>
          {transaction.description && (
            <span className="truncate text-sm text-muted-foreground">
              {transaction.description}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 self-start text-right text-xs text-muted-foreground">
        {dayjs(transaction.date).fromNow()}
      </div>
    </div>
  )
}
