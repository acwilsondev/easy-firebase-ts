// Main service classes
export { FirebaseManager } from './core/firebase-manager';
export { FirestoreService } from './firestore/firestore-service';
export { FunctionsService } from './functions/functions-service';
export { PubSubService } from './pubsub/pubsub-service';

// Types and interfaces from core/firebase-manager
export { FirebaseManagerConfig } from './core/firebase-manager';

// Types and interfaces from firestore/firestore-service
export { FirestoreError, WithId } from './firestore/firestore-service';

// Types and interfaces from functions/functions-service
export { FunctionCallOptions, FunctionsError } from './functions/functions-service';

// Types and interfaces from pubsub/pubsub-service
export { PubSubError, PubSubServiceOptions, MessageHandler } from './pubsub/pubsub-service';
