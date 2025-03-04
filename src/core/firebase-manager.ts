import { initializeApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Import interfaces for our services (to be implemented)
import { FirestoreService } from '../firestore/firestore-service';

/**
 * Configuration options for FirebaseManager
 */
export interface FirebaseManagerConfig {
  /** Firebase configuration options */
  firebaseOptions: FirebaseOptions;
  /** Whether to enable Firestore offline persistence */
  enablePersistence?: boolean;
}

/**
 * Main class for managing Firebase services
 * 
 * Handles initialization, provides service instances, and manages cleanup
 */
export class FirebaseManager {
  private app: FirebaseApp;
  private firestoreInstance: Firestore | null = null;
  private firestoreService: FirestoreService | null = null;
  private config: FirebaseManagerConfig;
  private initialized = false;

  /**
   * Creates a new FirebaseManager instance
   * 
   * @param config - Configuration options for Firebase
   */
  constructor(config: FirebaseManagerConfig) {
    this.config = config;
    this.app = initializeApp(config.firebaseOptions);
    this.initialized = true;
  }

  /**
   * Gets the Firestore instance
   * 
   * @returns The Firestore instance
   */
  public getFirestore(): Firestore {
    if (!this.firestoreInstance) {
      this.firestoreInstance = getFirestore(this.app);
      
      // Enable persistence if specified in config
      if (this.config.enablePersistence) {
        enableIndexedDbPersistence(this.firestoreInstance)
          .catch(error => {
            console.error('Error enabling Firestore persistence:', error);
          });
      }
    }
    
    return this.firestoreInstance;
  }


  /**
   * Gets the FirestoreService instance
   * 
   * @returns The FirestoreService instance
   */
  public getFirestoreService(): FirestoreService {
    if (!this.firestoreService) {
      // Get the Firestore instance and create a new FirestoreService
      const firestoreInstance = this.getFirestore();
      this.firestoreService = new FirestoreService(firestoreInstance);
    }
    
    return this.firestoreService;
  }



  /**
   * Cleans up all Firebase resources
   * 
   * Call this method when you're done using Firebase services
   * to prevent memory leaks and ensure proper cleanup
   */
  public async cleanup(): Promise<void> {
    // Placeholder for cleanup logic
    // This would typically include:
    // - Unsubscribing from any active listeners
    // - Closing any open connections
    // - Terminating the Firebase app

    this.firestoreInstance = null;
    this.firestoreService = null;
    this.initialized = false;
    
    console.log('Firebase resources cleaned up');
  }

  /**
   * Checks if the FirebaseManager is initialized
   * 
   * @returns Whether the FirebaseManager is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

