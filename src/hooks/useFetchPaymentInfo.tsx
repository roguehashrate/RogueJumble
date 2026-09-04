import client from '@/services/client.service'
import { getPaymentInfoFromEvent } from '@/lib/event-metadata'
import { TPaymentInfo } from '@/types'
import { useEffect, useState } from 'react'

export function useFetchPaymentInfo(pubkey?: string | null) {
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<TPaymentInfo | null>(null)

  useEffect(() => {
    setPaymentInfo(null)
    const fetchPaymentInfo = async () => {
      if (!pubkey) {
        setIsFetching(false)
        return
      }
      setIsFetching(true)
      try {
        const event = await client.fetchPaymentInfoEvent(pubkey)
        const info = event ? getPaymentInfoFromEvent(event) : null
        if (info) setPaymentInfo(info)
      } catch (err) {
        setError(err as Error)
      } finally {
        setIsFetching(false)
      }
    }

    fetchPaymentInfo()
  }, [pubkey])

  return { isFetching, error, paymentInfo }
}