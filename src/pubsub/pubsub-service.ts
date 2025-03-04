import { PubSub, Topic, Subscription, Message } from '@google-cloud/pubsub';

/**
 * Custom error class for PubSub-related errors
 */
export class PubSubError extends Error {
  constructor(message: string, public topic?: string, public code?: string, public originalError?: Error) {
    super(message);
    this.name = 'PubSubError';
    
    // Ensures proper prototype chain for instanceof checks
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PubSubError);
    }
  }
}

/**
 * Configuration options for PubSubService
 */
export interface PubSubServiceOptions {
  projectId?: string;
  keyFilename?: string;
}

/**
 * Message handler function type definition
 */
export type MessageHandler = (message: Message) => void;

/**
 * Service for Google Cloud PubSub operations
 * 
 * Provides methods for publishing messages and subscribing to topics
 */
export class PubSubService {
  private pubsub: PubSub;
  private activeSubscriptions: Map<string, Subscription>;

  /**
   * Creates a new PubSubService instance
   * 
   * @param options - Configuration options for the PubSub client
   */
  constructor(options?: PubSubServiceOptions) {
    this.pubsub = new PubSub(options);
    this.activeSubscriptions = new Map();
  }

  /**
   * Publishes a message to a topic
   * 
   * @param topicName - Name of the topic to publish to
   * @param data - Message data (string or object that will be JSON stringified)
   * @param attributes - Optional message attributes
   * @returns Promise resolving to the message ID
   */
  async publishMessage(
    topicName: string, 
    data: string | object, 
    attributes?: Record<string, string>
  ): Promise<string> {
    try {
      const topic = this.pubsub.topic(topicName);
      
      // Convert data to Buffer format required by PubSub
      const messageData = typeof data === 'string' ? 
        Buffer.from(data) : 
        Buffer.from(JSON.stringify(data));
      
      // Publish the message
      const messageId = await topic.publish(messageData, attributes);
      return messageId;
    } catch (error) {
      console.error(`Error publishing message to ${topicName}:`, error);
      throw new PubSubError(`Failed to publish message to topic: ${topicName}`, topicName, undefined, error as Error);
    }
  }

  /**
   * Subscribes to a topic and handles incoming messages
   * 
   * @param subscriptionName - Name of the subscription
   * @param topicName - Name of the topic to subscribe to
   * @param handleMessage - Function to process received messages
   * @returns Promise resolving to void
   */
  async subscribeToTopic(
    subscriptionName: string,
    topicName: string,
    handleMessage: MessageHandler
  ): Promise<void> {
    try {
      // Get a reference to the topic
      const topic = this.pubsub.topic(topicName);
      
      // Check if subscription exists, create if it doesn't
      let subscription: Subscription;
      
      try {
        const [exists] = await this.pubsub.subscription(subscriptionName).exists();
        if (exists) {
          subscription = this.pubsub.subscription(subscriptionName);
        } else {
          [subscription] = await topic.createSubscription(subscriptionName);
        }
      } catch (error) {
        [subscription] = await topic.createSubscription(subscriptionName);
      }
      
      // Set up message handler
      subscription.on('message', (message: Message) => {
        handleMessage(message);
      });
      
      // Set up error handler
      subscription.on('error', (error: any) => {
        console.error(`Error with subscription ${subscriptionName}:`, error);
      });
      
      // Store the active subscription for future reference
      this.activeSubscriptions.set(subscriptionName, subscription);
      
    } catch (error) {
      console.error(`Error subscribing to topic ${topicName}:`, error);
      throw new PubSubError(
        `Failed to subscribe to topic: ${topicName}`, 
        topicName,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Stops listening for messages on a subscription
   * 
   * @param subscriptionName - Name of the subscription to stop
   * @returns Promise resolving to void
   */
  async unsubscribe(subscriptionName: string): Promise<void> {
    try {
      const subscription = this.activeSubscriptions.get(subscriptionName);
      
      if (!subscription) {
        throw new Error(`No active subscription named ${subscriptionName} found`);
      }
      
      // Remove all listeners and close the subscription
      subscription.removeAllListeners();
      
      // Remove from our active subscriptions map
      this.activeSubscriptions.delete(subscriptionName);
      
    } catch (error) {
      console.error(`Error unsubscribing from ${subscriptionName}:`, error);
      throw new PubSubError(
        error instanceof Error ? error.message : `Failed to unsubscribe: ${subscriptionName}`, 
        undefined, 
        undefined, 
        error as Error
      );
    }
  }

  /**
   * Helper method to parse PubSub message data
   * 
   * @param message - The PubSub message
   * @returns The parsed data (as string or object)
   */
  static parseMessageData(message: Message): string | object {
    const data = message.data.toString();
    
    try {
      // Attempt to parse as JSON
      return JSON.parse(data);
    } catch (e) {
      // Return as string if not valid JSON
      return data;
    }
  }
}

