'use client'

import { useState, useEffect } from 'react'
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string }

/** Result type returned by useCollection */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null
  isLoading: boolean
  error: FirestoreError | Error | null
}

/** Internal Firestore query type (for extracting path in errors) */
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string
      toString(): string
    }
  }
}

/**
 * ✅ useCollection Hook
 * React hook to subscribe to a Firestore collection or query in real-time.
 *
 * @template T Type of the document data.
 * @param memoizedTargetRefOrQuery - Firestore CollectionReference or Query (must be memoized with useMemo)
 * @returns Object containing data, isLoading, and error.
 */
export function useCollection<T = any>(
  memoizedTargetRefOrQuery:
    | ((CollectionReference<DocumentData> | Query<DocumentData>) & { __memo?: boolean })
    | null
    | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>
  type StateDataType = ResultItemType[] | null

  const [data, setData] = useState<StateDataType>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<FirestoreError | Error | null>(null)

  useEffect(() => {
    // 🔹 अगर reference/query null है तो कुछ मत करो
    if (!memoizedTargetRefOrQuery) {
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }

    // 🔹 Loading शुरू
    setIsLoading(true)
    setError(null)

    // 🔹 Firestore real-time listener
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = snapshot.docs.map((doc) => ({
          ...(doc.data() as T),
          id: doc.id,
        }))
        setData(results)
        setIsLoading(false)
        setError(null)
      },
      (err: FirestoreError) => {
        // 🔹 Permission error handle
        const path: string =
          (memoizedTargetRefOrQuery as any).type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as InternalQuery)._query.path.canonicalString()

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        // 🔹 Global error event (optional)
        errorEmitter.emit('permission-error', contextualError)
      },
    )

    // 🔹 Cleanup on unmount
    return () => unsubscribe()
  }, [memoizedTargetRefOrQuery])

  // 🔹 Memoization check (to prevent unnecessary re-renders)
  if (memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(
      `${memoizedTargetRefOrQuery} was not properly memoized. Use useMemoFirebase() or React.useMemo.`,
    )
  }

  return { data, isLoading, error }
}
