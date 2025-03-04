import { initializeApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Import interfaces for our services (to be implemented)
import { FirestoreService } from '../firestore/firestore-service';
import { FunctionsService } from '../functions/functions-service';
import { PubSubService } from '../pubsub/pubsub-service';

/**
 * Configuration options for FirebaseManager
 */
export interface FirebaseManagerConfig {
  /** Firebase configuration options */
  firebaseOptions: FirebaseOptions;
  /** Whether to enable Firestore offline persistence */
  enablePersistence?: boolean;
  /** Firebase Functions emulator configuration */
  functionsEmulator?: {
    host: string;
    port: number;
  };
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
  private functionsService: FunctionsService | null = null;
  private pubSubService: PubSubService | null = null;
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
        enableIndexedDbPersistence(this.firestoreInstance).catch(error => {
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
   * Gets the FunctionsService instance
   *
   * @returns The FunctionsService instance
   */
  public getFunctionsService(): FunctionsService {
    if (!this.functionsService) {
      // Create a new FunctionsService with the Firebase app instance
      // and optional emulator configuration
      this.functionsService = new FunctionsService(this.app, this.config.functionsEmulator);
    }

    return this.functionsService;
  }

  /**
   * Gets the PubSubService instance
   *
   * @returns The PubSubService instance
   */
  public getPubSubService(): PubSubService {
    if (!this.pubSubService) {
      // Create a new PubSubService
      this.pubSubService = new PubSubService();
    }

    return this.pubSubService;
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
    this.functionsService = null;
    this.pubSubService = null;
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
