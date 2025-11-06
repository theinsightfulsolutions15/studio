
'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

// Internal Firestore query type for path extraction
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    };
    allDescendants?: boolean;
  };
}

/**
 * A React hook to subscribe to a Firestore collection or query in real-time.
 *
 * IMPORTANT: The `memoizedTargetRefOrQuery` parameter MUST be memoized using `useMemo` or `useMemoFirebase`
 * to prevent re-subscribing on every render, which can lead to performance issues and infinite loops.
 *
 * @template T The expected type of the documents in the collection.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} memoizedTargetRefOrQuery - A memoized Firestore collection reference or query. The hook is inactive if this is null or undefined.
 * @returns {UseCollectionResult<T>} An object containing the real-time data, loading state, and any error.
 */
export function useCollection<T = any>(
  memoizedTargetRefOrQuery:
    | ((CollectionReference<DocumentData> | Query<DocumentData>))
    | null
    | undefined
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // If the ref is null or undefined, do nothing.
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const internalQuery = memoizedTargetRefOrQuery as InternalQuery;
      // This is a reliable way to check for a collection group query.
      const isCollectionGroup = internalQuery?._query?.allDescendants === true;

      const path =
        (memoizedTargetRefOrQuery as any).path || // For collection references
        internalQuery?._query?.path?.canonicalString() || // For queries
        ''; // Fallback to empty string

      // Path validation — only for normal collections
      if (!isCollectionGroup && (!path || path.trim() === '' || path === '/')) {
        console.error(
          '❌ Firestore path is empty or invalid — useCollection() requires a valid collection.'
        );
        setError(new Error('Invalid Firestore collection path'));
        setIsLoading(false);
        return;
      }

      // Firestore snapshot listener
      const unsubscribe = onSnapshot(
        memoizedTargetRefOrQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const results = snapshot.docs.map((doc) => ({
            ...(doc.data() as T),
            id: doc.id,
          }));
          setData(results);
          setIsLoading(false);
          setError(null);
        },
        (err: FirestoreError) => {
          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path: isCollectionGroup
              ? `CollectionGroup(${internalQuery._query.path.toString()})`
              : path,
          });

          console.error('⚠️ Firestore Permission Error:', contextualError);
          setError(contextualError);
          setData(null);
          setIsLoading(false);
          errorEmitter.emit('permission-error', contextualError);
        }
      );

      // Cleanup
      return () => unsubscribe();
    } catch (err: any) {
      console.error('🔥 useCollection Internal Error:', err);
      setError(err);
      setIsLoading(false);
    }
  }, [memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}
