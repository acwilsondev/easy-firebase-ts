import {
  Firestore,
  DocumentReference,
  DocumentSnapshot,
  Query,
  QuerySnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { FirestoreService } from '../firestore/firestore-service';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => {
  return {
    doc: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    getDocs: jest.fn(),
  };
});

// Import mocked Firebase functions
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query as firestoreQuery,
  getDocs,
} from 'firebase/firestore';

describe('FirestoreService', () => {
  let firestoreService: FirestoreService;
  let mockFirestore: jest.Mocked<Firestore>;
  let mockDocRef: jest.Mocked<DocumentReference>;
  let mockDocSnapshot: jest.Mocked<DocumentSnapshot>;
  let mockQuerySnapshot: jest.Mocked<QuerySnapshot>;
  let mockQuery: jest.Mocked<Query>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Firestore instance
    mockFirestore = {
      app: { name: 'mock-app' },
      type: 'firestore',
    } as unknown as jest.Mocked<Firestore>;

    // Mock document reference
    mockDocRef = {
      id: 'mock-doc-id',
      path: 'users/mock-doc-id',
    } as unknown as jest.Mocked<DocumentReference>;

    // Mock document snapshot
    // Mock document snapshot
    mockDocSnapshot = {
      exists: jest.fn(() => true),
      data: jest.fn().mockReturnValue({ id: 'mock-id', name: 'Mock User' }),
      id: 'mock-doc-id',
    } as unknown as jest.Mocked<DocumentSnapshot>;
    // Mock query snapshot
    mockQuerySnapshot = {
      docs: [
        {
          data: jest.fn().mockReturnValue({ id: 'doc1', name: 'Document 1' }),
          id: 'doc1',
        },
        {
          data: jest.fn().mockReturnValue({ id: 'doc2', name: 'Document 2' }),
          id: 'doc2',
        },
      ],
      forEach: jest.fn().mockImplementation(callback => {
        mockQuerySnapshot.docs.forEach(doc => callback(doc));
      }),
    } as unknown as jest.Mocked<QuerySnapshot>;

    // Mock query
    mockQuery = {} as unknown as jest.Mocked<Query>;

    // Mock Firebase functions
    (doc as jest.Mock).mockReturnValue(mockDocRef);
    (getDoc as jest.Mock).mockResolvedValue(mockDocSnapshot);
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
    (collection as jest.Mock).mockReturnValue({});
    (firestoreQuery as jest.Mock).mockReturnValue(mockQuery);
    (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

    // Initialize FirestoreService with mock Firestore
    firestoreService = new FirestoreService(mockFirestore);
  });

  describe('constructor', () => {
    it('should initialize with the provided Firestore instance', () => {
      const service = new FirestoreService(mockFirestore);
      expect(service).toBeInstanceOf(FirestoreService);
    });

    it('should throw an error if Firestore instance is not provided', () => {
      expect(() => new FirestoreService(undefined as unknown as Firestore)).toThrow(
        'FirestoreService requires a valid Firestore instance',
      );
    });
  });

  describe('getDocument', () => {
    it('should retrieve a document successfully', async () => {
      const data = await firestoreService.getDocument<{ id: string; name: string }>(
        'users/mock-doc-id',
      );

      expect(doc).toHaveBeenCalledWith(mockFirestore, 'users/mock-doc-id');
      expect(getDoc).toHaveBeenCalledWith(mockDocRef);
      expect(data).toEqual({ id: 'mock-id', name: 'Mock User' });
    });

    it('should throw an error if document does not exist', async () => {
      // Use mockImplementation to change the return value of the exists function
      mockDocSnapshot.exists.mockImplementation(() => false);

      await expect(firestoreService.getDocument('users/non-existent')).rejects.toThrow(
        'Document does not exist at path: users/non-existent',
      );
    });

    it('should handle errors during document retrieval', async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(firestoreService.getDocument('users/error-doc')).rejects.toThrow(
        'Firestore error',
      );
    });
  });

  describe('setDocument', () => {
    it('should set a document successfully', async () => {
      const testData = { id: 'test-id', name: 'Test User' };

      await firestoreService.setDocument<typeof testData>('users/test-id', testData);

      expect(doc).toHaveBeenCalledWith(mockFirestore, 'users/test-id');
      expect(setDoc).toHaveBeenCalledWith(mockDocRef, testData);
    });

    it('should set a document with options successfully', async () => {
      const testData = { id: 'test-id', name: 'Test User' };
      const options = { merge: true };

      await firestoreService.setDocument<typeof testData>('users/test-id', testData, options);

      expect(doc).toHaveBeenCalledWith(mockFirestore, 'users/test-id');
      expect(setDoc).toHaveBeenCalledWith(mockDocRef, testData, options);
    });

    it('should handle errors during document setting', async () => {
      const testData = { id: 'error-id', name: 'Error User' };
      (setDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(firestoreService.setDocument('users/error-id', testData)).rejects.toThrow(
        'Firestore error',
      );
    });
  });

  describe('updateDocument', () => {
    it('should update a document successfully', async () => {
      const updateData = { name: 'Updated User' };

      await firestoreService.updateDocument('users/update-id', updateData);

      expect(doc).toHaveBeenCalledWith(mockFirestore, 'users/update-id');
      expect(updateDoc).toHaveBeenCalledWith(mockDocRef, updateData);
    });

    it('should handle errors during document update', async () => {
      const updateData = { name: 'Error User' };
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(firestoreService.updateDocument('users/error-id', updateData)).rejects.toThrow(
        'Firestore error',
      );
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document successfully', async () => {
      await firestoreService.deleteDocument('users/delete-id');

      expect(doc).toHaveBeenCalledWith(mockFirestore, 'users/delete-id');
      expect(deleteDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should handle errors during document deletion', async () => {
      (deleteDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(firestoreService.deleteDocument('users/error-id')).rejects.toThrow(
        'Firestore error',
      );
    });
  });

  describe('query', () => {
    it('should query documents successfully', async () => {
      const queryConstraint1 = {} as unknown as QueryConstraint;
      const queryConstraint2 = {} as unknown as QueryConstraint;

      const result = await firestoreService.query<{ id: string; name: string }>(
        'users',
        queryConstraint1,
        queryConstraint2,
      );

      expect(collection).toHaveBeenCalledWith(mockFirestore, 'users');
      expect(firestoreQuery).toHaveBeenCalled();
      expect(getDocs).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual([
        { id: 'doc1', name: 'Document 1' },
        { id: 'doc2', name: 'Document 2' },
      ]);
    });

    it('should return an empty array if no documents match the query', async () => {
      // Empty query snapshot
      (mockQuerySnapshot as unknown as { docs: any[] }).docs = [];

      const result = await firestoreService.query<{ id: string; name: string }>('users');

      expect(result).toEqual([]);
    });

    it('should handle errors during querying', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(firestoreService.query('users')).rejects.toThrow('Firestore error');
    });
  });
});
