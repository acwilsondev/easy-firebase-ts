import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query as firestoreQuery,
  getDocs,
  QueryConstraint,
  DocumentReference,
  DocumentData,
  WithFieldValue,
  SetOptions
} from 'firebase/firestore';

/**
 * Adds an 'id' field to any type
 */
export type WithId<T> = T & { id: string };

/**
 * Custom error class for Firestore-related errors
 */
export class FirestoreError extends Error {
  constructor(message: string, public path?: string, public code?: string, public originalError?: Error) {
    super(message);
    this.name = 'FirestoreError';
    
    // Ensures proper prototype chain for instanceof checks
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestoreError);
    }
  }
}

/**
 * Service for Firestore database operations
 * 
 * Provides methods for CRUD operations and querying Firestore data
 */
export class FirestoreService {
  private firestore: Firestore;

  /**
   * Creates a new FirestoreService instance
   * 
   * @param firestore - The Firestore instance to use
   */
  constructor(firestore: Firestore) {
    if (!firestore) {
      throw new Error('FirestoreService requires a valid Firestore instance');
    }
    this.firestore = firestore;
  }

  /**
   * Gets a document from Firestore
   * 
   * @param path - Path to the document (e.g., 'users/123')
   * @returns Promise resolving to the document data
   * @throws Error if document doesn't exist or there's a Firestore error
   */
  async getDocument<T>(path: string): Promise<T> {
    try {
      const docRef = doc(this.firestore, path);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`Document does not exist at path: ${path}`);
      }
      
      return docSnap.data() as T;
    } catch (error) {
      console.error(`Error getting document at ${path}:`, error);
      throw error;
    }
  }

  /**
   * Creates or replaces a document in Firestore
   * 
   * @param path - Path to the document (e.g., 'users/123')
   * @param data - Data to store in the document
   * @param options - Optional SetOptions (e.g., { merge: true })
   * @returns Promise that resolves when the operation is complete
   */
  async setDocument<T>(path: string, data: T, options?: SetOptions): Promise<void> {
    try {
      const docRef = doc(this.firestore, path);
      if (options) {
        await setDoc(docRef, data as WithFieldValue<DocumentData>, options);
      } else {
        await setDoc(docRef, data as WithFieldValue<DocumentData>);
      }
    } catch (error) {
      console.error(`Error setting document at ${path}:`, error);
      throw error;
    }
  }

  /**
   * Updates an existing document in Firestore
   * 
   * @param path - Path to the document (e.g., 'users/123')
   * @param data - Fields to update in the document
   * @returns Promise that resolves when the operation is complete
   */
  async updateDocument(path: string, data: Partial<any>): Promise<void> {
    try {
      const docRef = doc(this.firestore, path);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error(`Error updating document at ${path}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a document from Firestore
   * 
   * @param path - Path to the document (e.g., 'users/123')
   * @returns Promise that resolves when the operation is complete
   */
  async deleteDocument(path: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, path);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document at ${path}:`, error);
      throw error;
    }
  }

  /**
   * Queries a collection with the given constraints
   * 
   * @param collectionPath - Path to the collection (e.g., 'users')
   * @param queryConstraints - Query constraints (e.g., where, orderBy, limit)
   * @returns Promise resolving to an array of documents matching the query
   */
  async query<T>(collectionPath: string, ...queryConstraints: QueryConstraint[]): Promise<WithId<T>[]> {
    try {
      const collectionRef = collection(this.firestore, collectionPath);
      const q = firestoreQuery(collectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      const results: WithId<T>[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as WithId<T>);
      });
      
      return results;
    } catch (error) {
      console.error(`Error querying collection ${collectionPath}:`, error);
      throw error;
    }
  }
}

