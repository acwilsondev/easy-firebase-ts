import { PubSub, Topic, Subscription, Message } from '@google-cloud/pubsub';
import { FirebaseApp } from 'firebase-admin/app';

/**
 * Error class for PubSub operations
 */
export class PubSubError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'PubSubError';
  }
}

/**
 * Configuration options for the PubSubService
 */
export interface PubSubConfig {
  /** Default project ID to use if not specified in individual methods */
  projectId?: string;
  /** Default timeout in milliseconds for operations */
  timeout?: number;
  /** Default retry configuration */
  retry?: {
    /** Maximum number of retry attempts */
    maxRetries: number;
    /** Initial backoff in milliseconds */
    initialBackoffMs: number;
    /** Maximum backoff in milliseconds */
    maxBackoffMs: number;
  };
}

/**
 * Options for publishing messages
 */
export interface PublishOptions {
  /** Message attributes (metadata) */
  attributes?: Record<string, string>;
  /** Ordering key for messages that should be delivered in order */
  orderingKey?: string;
}

/**
 * Options for subscription creation
 */
export interface SubscriptionOptions {
  /** The number of seconds after which a message is automatically acknowledged if it hasn't been acknowledged manually */
  ackDeadlineSeconds?: number;
  /** Whether to retain acknowledged messages */
  retainAckedMessages?: boolean;
  /** For how long to retain acknowledged messages */
  messageRetentionDuration?: {
    seconds: number;
    nanos?: number;
  };
  /** Filter for messages to be delivered */
  filter?: string;
  /** Whether the subscription should receive messages from topics with the same name in other projects */
  enableMessageOrdering?: boolean;
}

/**
 * Options for message handling
 */
export interface MessageHandlerOptions {
  /** Maximum number of concurrent messages that can be processed */
  maxConcurrency?: number;
  /** Whether to automatically acknowledge messages after successful processing */
  autoAcknowledge?: boolean;
  /** Timeout for message processing in milliseconds */
  timeout?: number;
}

/**
 * A message received from PubSub with typed data
 */
export interface TypedPubSubMessage<T> {
  /** The message data, parsed as the specified type */
  data: T;
  /** Message attributes (metadata) */
  attributes: Record<string, string>;
  /** Message ID */
  id: string;
  /** When the message was published */
  publishTime: Date;
  /** Function to acknowledge the message */
  ack(): Promise<void>;
  /** Function to reject/nack the message */
  nack(): Promise<void>;
}

/**
 * Service class for interacting with Google Cloud PubSub
 */
export class PubSubService {
  private pubsub: PubSub;
  private config: PubSubConfig;

  /**
   * Creates a new instance of PubSubService
   * 
   * @param app Firebase app instance
   * @param config Configuration options
   */
  constructor(app: FirebaseApp, config: PubSubConfig = {}) {
    this.pubsub = new PubSub({
      projectId: config.projectId,
    });
    this.config = {
      timeout: 30000,
      retry: {
        maxRetries: 3,
        initialBackoffMs: 100,
        maxBackoffMs: 3000,
      },
      ...config
    };
  }

  /**
   * Creates a new topic if it doesn't exist
   * 
   * @param topicName Name of the topic to create
   * @returns The Topic object
   * @throws {PubSubError} If topic creation fails
   */
  public async createTopic(topicName: string): Promise<Topic> {
    try {
      const [topic] = await this.pubsub.createTopic(topicName);
      return topic;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ALREADY_EXISTS')) {
        // Return existing topic if it already exists
        return this.pubsub.topic(topicName);
      }
      throw new PubSubError(
        `Failed to create topic ${topicName}`,
        'topic-creation-failed',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets a topic by name, creating it if it doesn't exist
   * 
   * @param topicName Name of the topic to get or create
   * @returns The Topic object
   * @throws {PubSubError} If topic retrieval fails
   */
  public async getOrCreateTopic(topicName: string): Promise<Topic> {
    try {
      const topic = this.pubsub.topic(topicName);
      const [exists] = await topic.exists();
      
      if (!exists) {
        return this.createTopic(topicName);
      }
      
      return topic;
    } catch (error) {
      throw new PubSubError(
        `Failed to get or create topic ${topicName}`,
        'topic-access-failed',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Creates a subscription to a topic
   * 
   * @param topicName Name of the topic to subscribe to
   * @param subscriptionName Name of the subscription to create
   * @param options Subscription options
   * @returns The Subscription object
   * @throws {PubSubError} If subscription creation fails
   */
  public async createSubscription(
    topicName: string,
    subscriptionName: string,
    options: SubscriptionOptions = {}
  ): Promise<Subscription> {
    try {
      const topic = this.pubsub.topic(topicName);
      const [subscription] = await topic.createSubscription(subscriptionName, options);
      return subscription;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ALREADY_EXISTS')) {
        // Return existing subscription if it already exists
        return this.pubsub.subscription(subscriptionName);
      }
      throw new PubSubError(
        `Failed to create subscription ${subscriptionName} for topic ${topicName}`,
        'subscription-creation-failed',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets a subscription by name, creating it if it doesn't exist
   * 
   * @param topicName Name of the topic to subscribe to
   * @param subscriptionName Name of the subscription to get or create
   * @param options Subscription options
   * @returns The Subscription object
   * @throws {PubSubError} If subscription retrieval fails
   */
  public async getOrCreateSubscription(
    topicName: string,
    subscriptionName: string,
    options: SubscriptionOptions = {}
  ): Promise<Subscription> {
    try {
      const subscription = this.pubsub.subscription(subscriptionName);
      const [exists] = await subscription.exists();
      
      if (!exists) {
        return this.createSubscription(topicName, subscriptionName, options);
      }
      
      return subscription;
    } catch (error) {
      throw new PubSubError(
        `Failed to get or create subscription ${subscriptionName} for topic ${topicName}`,
        'subscription-access-failed',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Publishes a message to a topic with type safety
   * 
   * @template T Type of message data to publish
   * @param topicName Name of the topic to publish to
   * @param message Message data to publish
   * @param options Publishing options
   * @returns The ID of the published message
   * @throws {PubSubError} If message publishing fails
   */
  public async publishMessage<T>(
    topicName: string,
    message: T,
    options: PublishOptions = {}
  ): Promise<string> {
    try {
      const topic = this.pubsub.topic(topicName);
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const messageId = await topic.publish(messageBuffer, options.attributes);
      return messageId;
    } catch (error) {
      throw new PubSubError(
        `Failed to publish message to topic ${topicName}`,
        'message-publish-failed',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Publishes multiple messages to a topic with type safety
   * 
   * @template T Type of message data to publish
   * @param topicName Name of the topic to publish to
   * @param messages Array of message data to publish
   * @param options Publishing options
   * @returns Array of IDs of the published messages
   * @throws {PubSubError} If batch publishing fails
   */
  public async publishBatch<T>(
    topicName: string,
    messages: T[],
    options: PublishOptions = {}
  ): Promise<string[]> {
    try {
      const topic = this.pubsub.topic(topicName);
      const publishPromises = messages.map(message => {
        const messageBuffer = Buffer.from(JSON.stringify(message));
        return topic.publish(messageBuffer, options.attributes);
      });
      
      return Promise.all(publishPromises);
    } catch (error) {
      throw new PubSubError(
        `Failed to publish batch messages to topic ${topicName}`,
        'batch-publish-failed',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Subscribes to a topic and processes messages with type safety
   * 
   * @template T Type of message data expected
   * @param subscriptionName Name of the subscription
   * @param handler Function to handle each message
   * @param options Message handling options
   * @returns A function that can be called to stop listening for messages
   * @throws {PubSubError} If subscription fails
   */
  public subscribeToTopic<T>(
    subscriptionName: string,
    handler: (message: TypedPubSubMessage<T>) => Promise<void>,
    options: MessageHandlerOptions = {}
  ): () => void {
    try {
      const subscription = this.pubsub.subscription(subscriptionName);
      
      const messageHandler = async (message: Message) => {
        try {
          // Parse message data to the expected type
          const data = JSON.parse(message.data.toString()) as T;
          
          // Create a typed message object
          const typedMessage: TypedPubSubMessage<T> = {
            data,
            attributes: message.attributes,
            id: message.id,
            publishTime: message.publishTime,
            ack: async () => message.ack(),
            nack: async () => message.nack()
          };
          
          // Set up a timeout if specified
          const timeoutMs = options.timeout || this.config.timeout;
          let timeoutId: NodeJS.Timeout | undefined;
          
          const timeoutPromise = new Promise<void>((_, reject) => {
            if (timeoutMs) {
              timeoutId = setTimeout(() => {
                reject(new Error(`Message processing timed out after ${timeoutMs}ms`));
              }, timeoutMs);
            }
          });
          
          try {
            // Process the message with a timeout
            await Promise.race([
              handler(typedMessage),
              timeoutPromise
            ]);
            
            // Auto-acknowledge the message if enabled
            if (options.autoAcknowledge) {
              await typedMessage.ack();
            }
          } catch (handlerError) {
            // Automatically nack messages that fail processing
            await message.nack();
            throw handlerError;
          } finally {
            // Clear the timeout
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
        } catch (error) {
          console.error('Error processing message:', error);
          await message.nack();
        }
      };
      
      const subscriptionOptions = {
        flowControl: {
          maxMessages: options.maxConcurrency || 10,
        },
      };
      
      subscription.on('error', (error) => {
        console.error('Subscription error:', error);
      });
      
      subscription.on('message', messageHandler);
      
      // Return a function to stop listening
      return () => {
        subscription.removeListener('message', messageHandler);
      };
    } catch (error) {
      throw new PubSubError(
        `Failed to subscribe to ${subscriptionName}`,
        'subscription-failed',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Pull messages from a subscription once (non-streaming)
   * 
   * @template T Type of message data expected
   * @param subscriptionName Name of the subscription
   * @param maxMessages Maximum number of messages to pull
   * @returns Array of typed messages
   * @throws {PubSubError} If message pull fails
   */
  public async pullMessages<T>(
    subscriptionName: string,
    maxMessages: number = 10
  ): Promise<TypedPubSubMessage<T>[]> {
    try {
      const subscription = this.pubsub.subscription(subscriptionName);
      const [messages] = await subscription.pull({ maxMessages });
      
      return messages.map(message => {
        const data = JSON.parse(message.data.toString()) as T;
        
        return {
          data,
          attributes: message.attributes,
          id: message.id,
          publishTime: message.publishTime,
          ack: async () => message.ack(),
          nack: async () => message.nack()
        };
      });
    } catch (error) {
      throw new PubSubError(
        `Failed to pull messages from subscription ${subscriptionName}`,
        'message-pull-failed',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Deletes a topic
   * 
   * @param topicName Name of the topic to delete
   * @throws {PubSubError} If topic deletion fails
   */
  public async deleteTopic(topicName: string): Promise<void> {
    try {
      const topic = this.pubsub.topic(topicName);
      await topic.delete();
    } catch (error) {
      throw new PubSubError(
        `Failed to delete topic ${topicName}`,
        'topic-deletion-failed',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Deletes a subscription
   * 
   * @param subscriptionName Name of the subscription to delete
   * @throws {PubSubError} If subscription deletion fails
   */
  public async deleteSubscription(subscriptionName: string): Promise<void> {
    try {
      const subscription = this.pubsub.subscription(subscriptionName);
      await subscription.delete();
    } catch (error) {
      throw new PubSubError(
        `Failed to delete subscription ${subscriptionName}`,
        'subscription-deletion-failed',
        error instanceof Error ? error : undefined
      );
    }
  }
}

