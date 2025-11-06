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
    },
    // This property exists on collection group queries
    allDescendants?: boolean;
  }
}

/**
 * ✅ useCollection Hook (Fixed Version)
 * Works safely with proper Firestore paths and handles permission errors cleanly.
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
    // ❌ अगर reference/query null या invalid है तो कुछ मत करो
    if (!memoizedTargetRefOrQuery) {
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }
    
    const internalQuery = memoizedTargetRefOrQuery as InternalQuery;
    const isCollectionGroup = internalQuery?._query?.allDescendants === true;

    // ✅ अगर path खाली है, तो error throw करो ताकि Firestore root ना call हो
    const path =
      (memoizedTargetRefOrQuery as any).path ||
      (internalQuery?._query?.path?.canonicalString?.() ?? '')

    if (!isCollectionGroup && (!path || path.trim() === '' || path === '/')) {
      console.error('❌ Firestore path खाली या invalid है — useCollection() को सही collection दीजिए।')
      setError(new Error('Invalid Firestore collection path'))
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
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: isCollectionGroup ? `Collection Group: ${internalQuery._query.path.toString()}` : path,
        })
        console.error('⚠️ Firestore Permission Error:', contextualError)
        setError(contextualError)
        setData(null)
        setIsLoading(false)

        // 🔹 Optional global emitter
        errorEmitter.emit('permission-error', contextualError)
      },
    )

    // 🔹 Cleanup on unmount
    return () => unsubscribe()
  }, [memoizedTargetRefOrQuery])

  return { data, isLoading, error }
}
