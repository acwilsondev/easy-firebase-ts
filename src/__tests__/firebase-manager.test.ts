import { FirebaseManager, FirebaseManagerConfig } from '../core/firebase-manager';
import { FirestoreService } from '../firestore/firestore-service';
import { FunctionsService } from '../functions/functions-service';

// Mock Firebase modules
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn().mockReturnValue({ name: 'mock-app' }),
  FirebaseApp: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn().mockReturnValue({ id: 'mock-firestore' }),
  enableIndexedDbPersistence: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn().mockReturnValue({ id: 'mock-functions' }),
  httpsCallable: jest.fn(),
}));

// Mock Firebase imports
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

describe('FirebaseManager', () => {
  // Sample Firebase config for testing
  const mockConfig: FirebaseManagerConfig = {
    firebaseOptions: {
      apiKey: 'test-api-key',
      authDomain: 'test-auth-domain',
      projectId: 'test-project-id',
      appId: 'test-app-id',
    },
    enablePersistence: false,
  };

  let firebaseManager: FirebaseManager;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance for each test
    firebaseManager = new FirebaseManager(mockConfig);
  });

  afterEach(() => {
    // Clean up after each test
    firebaseManager.cleanup();
  });

  describe('initialization', () => {
    it('should initialize Firebase app with the provided config', () => {
      expect(initializeApp).toHaveBeenCalledWith(mockConfig.firebaseOptions);
      expect(firebaseManager.isInitialized()).toBe(true);
    });

  });

  describe('getFirestore', () => {
    it('should return a Firestore instance', () => {
      const firestoreInstance = firebaseManager.getFirestore();
      expect(getFirestore).toHaveBeenCalled();
      expect(firestoreInstance).toBeDefined();
    });

    it('should not enable persistence when not specified in config', () => {
      const config = { ...mockConfig, enablePersistence: false };
      const manager = new FirebaseManager(config);
      
      manager.getFirestore();
      expect(enableIndexedDbPersistence).not.toHaveBeenCalled();
    });

    it('should enable persistence when specified in config', () => {
      const config = { ...mockConfig, enablePersistence: true };
      const manager = new FirebaseManager(config);
      
      manager.getFirestore();
      expect(enableIndexedDbPersistence).toHaveBeenCalled();
    });

    it('should cache the Firestore instance', () => {
      const instance1 = firebaseManager.getFirestore();
      const instance2 = firebaseManager.getFirestore();
      
      expect(getFirestore).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(instance2);
    });
  });

  describe('service instances', () => {
    it('should provide a FirestoreService instance', () => {
      const service = firebaseManager.getFirestoreService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FirestoreService);
    });

    it('should provide a FunctionsService instance', () => {
      const service = firebaseManager.getFunctionsService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FunctionsService);
    });
  
    it('should cache Firestore service instance', () => {
      const service1 = firebaseManager.getFirestoreService();
      const service2 = firebaseManager.getFirestoreService();
      expect(service1).toBe(service2);
    });

    it('should cache Functions service instance', () => {
      const service1 = firebaseManager.getFunctionsService();
      const service2 = firebaseManager.getFunctionsService();
      expect(service1).toBe(service2);
    });
  });

  describe('cleanup', () => {
    it('should reset all instances', async () => {
      // Get instances first
      // Get instances first
      const firestoreInstance = firebaseManager.getFirestore();
      const firestoreService = firebaseManager.getFirestoreService();
      const functionsService = firebaseManager.getFunctionsService();
      // Then clean up
      await firebaseManager.cleanup();
      
      // Check initialization status
      expect(firebaseManager.isInitialized()).toBe(false);
      
      // Check that instances are reset (implementation detail, using any to access private properties)
      const manager = firebaseManager as any;
      expect(manager.firestoreInstance).toBeNull();
      expect(manager.firestoreService).toBeNull();
      expect(manager.functionsService).toBeNull();
    });

    it('should log cleanup message', async () => {
      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log');
      
      await firebaseManager.cleanup();
      
      expect(consoleSpy).toHaveBeenCalledWith('Firebase resources cleaned up');
      
      // Restore console.log
      consoleSpy.mockRestore();
    });
  });
});

