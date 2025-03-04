# easy-firebase-ts

A TypeScript library that simplifies Firebase usage with type-safe approaches, reducing boilerplate and integrating best practices.

## Overview

easy-firebase-ts provides a clean, type-safe interface for working with Firebase services including Firestore, Cloud Functions, and PubSub. It helps developers by:

- Enforcing type-safety with TypeScript generics
- Simplifying common Firebase operations
- Providing consistent error handling
- Reducing boilerplate code
- Supporting testing with Firebase Emulator Suite

## Installation

```bash
# Using npm
npm install easy-firebase-ts firebase

# Using yarn
yarn add easy-firebase-ts firebase
```

Make sure you have Firebase as a peer dependency in your project.

## Quick Start

Initialize the Firebase Manager and start using the services:

```typescript
import { FirebaseManager } from 'easy-firebase-ts';

// Initialize Firebase Manager with your config
const firebaseManager = new FirebaseManager({
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
});

// Now you can access the various services
const firestoreService = firebaseManager.getFirestoreService();
const functionsService = firebaseManager.getFunctionsService();
const pubSubService = firebaseManager.getPubSubService();

// Clean up when done
firebaseManager.cleanup();
```

## Usage Examples

### Firestore Service

#### Creating and Reading Documents

```typescript
// Define your document type
interface User {
  id?: string;
  name: string;
  email: string;
  createdAt?: Date;
}

// Create a document
const userId = await firestoreService.createDocument<User>('users', {
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date()
});

// Read a document
const user = await firestoreService.getDocument<User>('users', userId);
console.log(user.name); // John Doe

// Query documents
const users = await firestoreService.queryDocuments<User>('users', [
  ['email', '==', 'john@example.com']
]);

// Real-time updates
const unsubscribe = firestoreService.onDocumentChange<User>(
  'users', 
  userId, 
  (user) => {
    console.log('User updated:', user);
  }
);

// Later, when done listening
unsubscribe();
```

#### Transactions and Batches

```typescript
// Run a transaction
await firestoreService.runTransaction(async (transaction) => {
  const user = await transaction.get<User>('users', userId);
  transaction.update<User>('users', userId, { name: 'Jane Doe' });
});

// Batch operations
const batch = firestoreService.createBatch();
batch.update<User>('users', userId, { name: 'Jane Doe' });
batch.delete('users', 'another-user-id');
await batch.commit();
```

### Functions Service

```typescript
// Call a function with typed parameters and response
interface GreetingParams {
  name: string;
}

interface GreetingResponse {
  message: string;
  timestamp: string;
}

const result = await functionsService.callFunction<GreetingParams, GreetingResponse>(
  'greetUser',
  { name: 'John' }
);

console.log(result.message); // Hello, John!

// With custom options
const resultWithOptions = await functionsService.callFunction<GreetingParams, GreetingResponse>(
  'greetUser',
  { name: 'John' },
  { 
    region: 'us-central1',
    timeout: 30000 
  }
);
```

### PubSub Service

```typescript
// Publish a message
interface NotificationMessage {
  userId: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

await pubSubService.publishMessage<NotificationMessage>(
  'notifications',
  {
    userId: 'user-123',
    message: 'New friend request',
    priority: 'high'
  }
);

// Subscribe to messages (in a Node.js environment)
pubSubService.subscribeToTopic<NotificationMessage>(
  'notifications',
  'notification-processor',
  (message) => {
    console.log(`Got notification for user ${message.userId}: ${message.message}`);
    return true; // Acknowledge the message
  }
);
```

## API Reference

### FirebaseManager

- `constructor(config: FirebaseOptions)`: Initializes Firebase with the provided config
- `getFirestoreService()`: Returns a FirestoreService instance
- `getFunctionsService()`: Returns a FunctionsService instance
- `getPubSubService()`: Returns a PubSubService instance
- `cleanup()`: Cleans up Firebase resources

### FirestoreService

- Document Operations:
  - `createDocument<T>(collection, data)`: Creates a document and returns its ID
  - `getDocument<T>(collection, id)`: Retrieves a document by ID
  - `updateDocument<T>(collection, id, data)`: Updates a document
  - `deleteDocument(collection, id)`: Deletes a document
  
- Queries:
  - `queryDocuments<T>(collection, conditions)`: Queries documents with conditions
  - `onDocumentChange<T>(collection, id, callback)`: Listens for document changes
  - `onQueryChange<T>(collection, conditions, callback)`: Listens for query changes
  
- Transactions and Batches:
  - `runTransaction(transactionFn)`: Runs a transaction
  - `createBatch()`: Creates a write batch

### FunctionsService

- `callFunction<Params, Response>(name, params, options)`: Calls a Cloud Function

### PubSubService

- `publishMessage<T>(topic, message, attributes)`: Publishes a message to a topic
- `createTopic(topicName)`: Creates a new topic
- `subscribeToTopic<T>(topic, subscription, callback)`: Subscribes to messages

## Development

### Prerequisites

- Node.js 14 or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/easy-firebase-ts.git
cd easy-firebase-ts

# Install dependencies
npm install
```

### Building

```bash
# Build the library
npm run build
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### Firebase Emulator Integration

For local development and testing, you can use the Firebase Emulator Suite:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start the emulators
firebase emulators:start
```

Then, configure your FirebaseManager to use the emulators:

```typescript
const firebaseManager = new FirebaseManager(config, {
  useEmulator: true,
  emulatorHost: 'localhost',
  firestoreEmulatorPort: 8080,
  functionsEmulatorPort: 5001
});
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

# easy-firebase-ts