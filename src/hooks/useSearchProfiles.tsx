import client from '@/services/client.service'
import fayan from '@/services/fayan.service'
import { TProfile } from '@/types'
import { useEffect, useState } from 'react'

export function useSearchProfiles(search: string, limit: number) {
  const [isFetching, setIsFetching] = useState(true)
  const [profiles, setProfiles] = useState<TProfile[]>([])

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!search) {
        setProfiles([])
        return
      }

      setIsFetching(true)
      setProfiles([])
      const existingPubkeys = new Set<string>()
      const results: TProfile[] = []

      try {
        // Try fayan service first (external search API)
        const fetchedProfiles = await fayan.searchUsers(search, limit)
        for (const profile of fetchedProfiles) {
          if (!existingPubkeys.has(profile.pubkey)) {
            existingPubkeys.add(profile.pubkey)
            results.push(profile)
          }
        }
      } catch {
        // fayan failed, fall through to local search
      }

      // Fall back to local search if fayan returned nothing
      if (results.length < limit) {
        try {
          const localProfiles = await client.searchProfilesFromLocal(search, limit)
          for (const profile of localProfiles) {
            if (!existingPubkeys.has(profile.pubkey)) {
              existingPubkeys.add(profile.pubkey)
              results.push(profile)
            }
          }
        } catch {
          // local search failed too
        }
      }

      setProfiles(results.slice(0, limit))
      setIsFetching(false)
    }

    fetchProfiles()
  }, [search, limit])

  return { isFetching, profiles }
}
