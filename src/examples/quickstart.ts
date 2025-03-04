/**
 * Quickstart Example for easy-firebase-ts
 *
 * This example demonstrates how to use the easy-firebase-ts library to:
 * - Initialize Firebase with FirebaseManager
 * - Perform CRUD operations with FirestoreService
 * - Call Cloud Functions with FunctionsService
 * - Publish and subscribe to messages with PubSubService
 */

import { FirebaseManager, FirestoreService, FunctionsService, PubSubService } from '../index';

async function main() {
  try {
    // --------------------------------------------------------------------------
    // STEP 1: Initialize Firebase with FirebaseManager
    // --------------------------------------------------------------------------
    console.log('Initializing Firebase...');

    // Option 1: Initialize with environment variables
    // Requires FIREBASE_PROJECT_ID, FIREBASE_API_KEY, etc. in environment
    const firebaseManager = new FirebaseManager();
    await firebaseManager.initialize();

    // Option 2: Initialize with explicit configuration
    /*
    const firebaseManager = new FirebaseManager({
      projectId: 'your-project-id',
      apiKey: 'your-api-key',
      authDomain: 'your-project-id.firebaseapp.com',
      storageBucket: 'your-project-id.appspot.com',
    });
    await firebaseManager.initialize();
    */

    // Get service instances
    const firestoreService = firebaseManager.getFirestoreService();
    const functionsService = firebaseManager.getFunctionsService();
    const pubsubService = firebaseManager.getPubSubService();

    // --------------------------------------------------------------------------
    // STEP 2: Using FirestoreService for CRUD operations
    // --------------------------------------------------------------------------
    console.log('Demonstrating Firestore CRUD operations...');

    // Define a type for our document
    interface User {
      id: string;
      name: string;
      email: string;
      age: number;
      createdAt: Date;
    }

    // Create a new document
    const userId = 'user123';
    const newUser: Omit<User, 'id' | 'createdAt'> = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    };

    await firestoreService.create<User>('users', userId, newUser);
    console.log(`Created user with ID: ${userId}`);

    // Read a document
    const user = await firestoreService.getById<User>('users', userId);
    console.log('Retrieved user:', user);

    // Update a document
    await firestoreService.update<User>('users', userId, {
      name: 'John Smith',
      age: 31,
    });
    console.log(`Updated user ${userId}`);

    // Query documents
    const youngUsers = await firestoreService.query<User>('users', [
      { field: 'age', operator: '<', value: 40 },
    ]);
    console.log(`Found ${youngUsers.length} young users`);

    // Subscribe to real-time updates
    const unsubscribe = firestoreService.subscribe<User>(
      'users',
      [{ field: 'age', operator: '>', value: 25 }],
      users => {
        console.log(`Real-time update: ${users.length} users over 25 years old`);
      },
    );

    // Don't forget to unsubscribe when done
    // unsubscribe();

    // Delete a document
    // await firestoreService.delete('users', userId);
    // console.log(`Deleted user ${userId}`);

    // --------------------------------------------------------------------------
    // STEP 3: Using FunctionsService to call Cloud Functions
    // --------------------------------------------------------------------------
    console.log('Demonstrating Cloud Functions calls...');

    // Call a function without data
    const welcomeMessage = await functionsService.callFunction<string>('generateWelcomeMessage');
    console.log('Welcome message:', welcomeMessage);

    // Call a function with data
    interface CalculateParams {
      x: number;
      y: number;
    }

    interface CalculateResult {
      sum: number;
      product: number;
    }

    const calcResult = await functionsService.callFunction<CalculateResult, CalculateParams>(
      'calculateValues',
      { x: 5, y: 10 },
    );
    console.log('Calculation results:', calcResult);

    // Call a function with region specified
    const europeResult = await functionsService.callFunction<{ message: string }>(
      'getRegionInfo',
      {},
      { region: 'europe-west1' },
    );
    console.log('Europe function result:', europeResult);

    // --------------------------------------------------------------------------
    // STEP 4: Using PubSubService to publish and subscribe to messages
    // --------------------------------------------------------------------------
    console.log('Demonstrating PubSub operations...');

    // Define message types
    interface OrderMessage {
      orderId: string;
      customerId: string;
      amount: number;
      timestamp: string;
    }

    // Publish a message to a topic
    const newOrder: OrderMessage = {
      orderId: 'ord123',
      customerId: 'cust456',
      amount: 99.99,
      timestamp: new Date().toISOString(),
    };

    await pubsubService.publishMessage<OrderMessage>('new-orders', newOrder);
    console.log('Published order message to new-orders topic');

    // Create a subscription if it doesn't exist
    await pubsubService.createSubscription('new-orders', 'process-orders');
    console.log('Created subscription: process-orders');

    // Subscribe to messages
    pubsubService.subscribe<OrderMessage>(
      'new-orders',
      'process-orders',
      message => {
        console.log('Received order:', message);
        return true; // acknowledge the message
      },
      error => {
        console.error('Error processing message:', error);
      },
    );

    console.log('Subscribed to new-orders topic');
    console.log('Waiting for messages... (press Ctrl+C to exit)');

    // Keep the process alive for demonstration purposes
    // In a real application, you would typically run this in a service
    // await new Promise(() => {}); // Uncomment to keep the process running
  } catch (error) {
    console.error('Error in quickstart example:', error);
  } finally {
    // Cleanup (uncomment for actual use)
    // await firebaseManager.cleanup();
    // console.log('Cleaned up Firebase resources');
  }
}

// Run the example
main();
