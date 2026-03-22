'use client'

import { useState, useEffect, useCallback } from 'react'

const L1_REST_URL = process.env.NEXT_PUBLIC_L1_REST_URL || 'https://rest.testnet.initia.xyz'
const USERNAMES_MODULE = process.env.NEXT_PUBLIC_USERNAMES_MODULE ||
  '0x42cd8467b1c86e59bf319e5664a09b6b5840bb3fac64f5ce690b5041c530565a'

// Cache to avoid repeated L1 REST calls
const nameCache = new Map<string, string | null>()

/**
 * Resolve an Initia address to its .init username via the L1 Move view function.
 *
 * Uses the Initia REST API view function endpoint for the usernames module.
 * See: https://docs.initia.xyz/developers/developer-guides/integrating-initia-apps/usernames
 */
async function getNameFromAddress(initiaAddress: string): Promise<string | null> {
  if (!initiaAddress) return null

  // Check cache first
  if (nameCache.has(initiaAddress)) {
    return nameCache.get(initiaAddress) ?? null
  }

  try {
    // Convert bech32 init1... address to 32-byte hex, then base64
    // The address bytes from bech32 decode are 20 bytes
    // Pad to 32 bytes with leading zeros for Move address format
    
    const bech32 = await import('bech32')
    const decoded = bech32.decode(initiaAddress)
    const bytes20 = new Uint8Array(bech32.fromWords(decoded.words))
    
    // Move address is 32 bytes, pad 20-byte address with 12 leading zero bytes
    const bytes32 = new Uint8Array(32)
    bytes32.set(bytes20, 12)
    
    // Base64 encode the 32 bytes
    const base64arg = btoa(String.fromCharCode(...Array.from(bytes32)))
    
    const response = await fetch(
      `${L1_REST_URL}/initia/move/v1/accounts/${USERNAMES_MODULE}/modules/usernames/view_functions/get_name_from_address`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: [base64arg] })
      }
    )
    
    if (!response.ok) {
      nameCache.set(initiaAddress, null)
      return null
    }

    const data = await response.json()
    
    // Response is { data: '"name"' } or { data: 'null' }
    // Or Move Option format: { data: { vec: ["name"] } }
    const raw = data?.data
    if (!raw) {
      nameCache.set(initiaAddress, null)
      return null
    }

    let resultName: string | null = null

    if (typeof raw === 'string') {
      const cleaned = raw.replace(/"/g, '').trim()
      resultName = cleaned === 'null' || cleaned === '' ? null : cleaned
    } else if (raw?.vec?.length > 0) {
      resultName = raw.vec[0]
    }

    nameCache.set(initiaAddress, resultName)
    return resultName
  } catch (err) {
    console.warn('Username lookup failed for', initiaAddress, err)
    nameCache.set(initiaAddress, null)
    return null
  }
}

/**
 * Resolve a .init username to its Initia address.
 */
async function getAddressFromName(name: string): Promise<string | null> {
  if (!name) return null

  try {
    // Name argument: JSON-serialize the string, then base64
    const encodedArg = btoa(JSON.stringify(name))

    const response = await fetch(
      `${L1_REST_URL}/initia/move/v1/accounts/${USERNAMES_MODULE}/modules/usernames/view_functions/get_address_from_name`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          args: [encodedArg],
          type_args: [],
        }),
      }
    )

    if (!response.ok) return null

    const result = await response.json()

    if (result?.data) {
      const parsed = typeof result.data === 'string' ? JSON.parse(result.data) : result.data

      // Handle Option<address> → { vec: ["addr"] }
      if (parsed && typeof parsed === 'object' && 'vec' in parsed) {
        const vec = parsed.vec
        if (Array.isArray(vec) && vec.length > 0) return vec[0]
        return null
      }

      if (typeof parsed === 'string') return parsed
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0]
    }

    return null
  } catch (err) {
    console.warn('Address lookup failed for', name, err)
    return null
  }
}

// ─── React Hooks ────────────────────────────────────────────────────────

/**
 * Hook to look up a .init username from an address.
 * Caches results to avoid repeated API calls.
 */
export function useNameFromAddress(address: string | undefined) {
  const [name, setName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!address) {
      setName(null)
      return
    }

    setIsLoading(true)
    getNameFromAddress(address)
      .then(setName)
      .finally(() => setIsLoading(false))
  }, [address])

  return { name, isLoading }
}

/**
 * Hook to resolve a .init name to an address.
 */
export function useAddressFromName(name: string | undefined) {
  const [address, setAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!name) {
      setAddress(null)
      return
    }

    setIsLoading(true)
    getAddressFromName(name)
      .then(setAddress)
      .finally(() => setIsLoading(false))
  }, [name])

  return { address, isLoading }
}

/**
 * Hook to check if a given address has a .init username.
 * Returns the name if found, null if not.
 */
export function useUsername(address: string | undefined) {
  const { name, isLoading } = useNameFromAddress(address)
  return {
    username: name,
    hasUsername: name !== null,
    isLoading,
  }
}

/**
 * Utility: shorten an address for display.
 */
export function shortenAddress(address: string): string {
  if (!address) return ''
  if (address.startsWith('init1')) {
    return `${address.slice(0, 8)}...${address.slice(-4)}`
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
