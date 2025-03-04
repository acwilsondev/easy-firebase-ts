import { PubSubService, PubSubError, MessageHandler } from '../pubsub/pubsub-service';

// Create mock classes and functions
jest.mock('@google-cloud/pubsub', () => {
  // Mock Event Emitter behavior for Subscription
  class MockEventEmitter {
    private listeners: Record<string, Function[]> = {};
    static emitted = false;

    on(event: string, listener: Function): this {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(listener);
      return this;
    }

    emit(event: string, ...args: any[]): boolean {
      const listeners = this.listeners[event] || [];
      listeners.forEach(listener => listener(...args));
      return listeners.length > 0;
    }

    removeAllListeners(): this {
      this.listeners = {};
      return this;
    }
  }

  // Mock Message class
  class Message {
    constructor(
      public data: Buffer,
      public attributes?: Record<string, string>,
    ) {}
    ack(): void {}
  }

  // Mock Subscription class
  class Subscription extends MockEventEmitter {
    constructor(public name: string) {
      super();
    }
    exists(): Promise<[boolean]> {
      return Promise.resolve([true]);
    }
  }

  // Mock Topic class
  class Topic {
    constructor(public name: string) {}
    publish(data: Buffer, attributes?: Record<string, string>): Promise<string> {
      return Promise.resolve('mock-message-id');
    }
    // We'll override this with a jest.fn() below
    createSubscription(name: string): Promise<[Subscription]> {
      return Promise.resolve([new Subscription(name)]);
    }
  }

  // Add a jest.fn() mock for createSubscription
  Topic.prototype.createSubscription = jest
    .fn()
    .mockImplementation((name: string) => Promise.resolve([new Subscription(name)]));

  // Mock PubSub class
  return {
    PubSub: jest.fn().mockImplementation(() => ({
      topic: jest.fn((name: string) => new Topic(name)),
      subscription: jest.fn((name: string) => new Subscription(name)),
    })),
    Topic,
    Subscription,
    Message,
  };
});

describe('PubSubService', () => {
  let pubSubService: PubSubService;

  beforeEach(() => {
    jest.clearAllMocks();
    pubSubService = new PubSubService({ projectId: 'test-project' });
  });

  describe('constructor', () => {
    it('should create an instance with provided options', () => {
      const service = new PubSubService({ projectId: 'test-project' });
      expect(service).toBeInstanceOf(PubSubService);
    });

    it('should create an instance without options', () => {
      const service = new PubSubService();
      expect(service).toBeInstanceOf(PubSubService);
    });
  });

  describe('publishMessage', () => {
    it('should publish a string message successfully', async () => {
      const messageId = await pubSubService.publishMessage('test-topic', 'test-message');
      expect(messageId).toBe('mock-message-id');
    });

    it('should publish an object message successfully', async () => {
      const messageId = await pubSubService.publishMessage('test-topic', { key: 'value' });
      expect(messageId).toBe('mock-message-id');
    });

    it('should publish a message with attributes', async () => {
      const messageId = await pubSubService.publishMessage('test-topic', 'test-message', {
        attribute: 'value',
      });
      expect(messageId).toBe('mock-message-id');
    });

    it('should throw PubSubError when publish fails', async () => {
      // Mock the topic.publish method to throw an error
      const mockPubSub = require('@google-cloud/pubsub');
      mockPubSub.Topic.prototype.publish = jest.fn().mockRejectedValue(new Error('Publish error'));

      await expect(pubSubService.publishMessage('test-topic', 'test-message')).rejects.toThrow(
        PubSubError,
      );
    });
  });

  describe('subscribeToTopic', () => {
    it('should subscribe to a topic successfully when subscription exists', async () => {
      const handleMessage = jest.fn();
      await pubSubService.subscribeToTopic('test-subscription', 'test-topic', handleMessage);

      // Get the mock instance
      const { PubSub } = require('@google-cloud/pubsub');
      const mockPubSubInstance = PubSub.mock.results[0].value;

      // Verify topic and subscription were created
      expect(mockPubSubInstance.topic).toHaveBeenCalledWith('test-topic');
      expect(mockPubSubInstance.subscription).toHaveBeenCalledWith('test-subscription');
    });

    it('should create a new subscription if it does not exist', async () => {
      // Mock subscription.exists to return false
      const { Subscription } = require('@google-cloud/pubsub');
      Subscription.prototype.exists = jest.fn().mockResolvedValue([false]);

      const handleMessage = jest.fn();
      await pubSubService.subscribeToTopic('test-subscription', 'test-topic', handleMessage);

      // Check if createSubscription was called
      const { Topic } = require('@google-cloud/pubsub');
      expect(Topic.prototype.createSubscription).toHaveBeenCalledWith('test-subscription');
    });

    it('should handle messages correctly', async () => {
      // Create a spy to monitor calls to the message handler
      const handleMessage = jest.fn();

      // Mock the Subscription's on method to capture the message handler
      const { Subscription, Message } = require('@google-cloud/pubsub');
      const originalOn = Subscription.prototype.on;
      let capturedMessageHandler: Function = () => {}; // Initialize with default empty function

      Subscription.prototype.on = function (event: string, handler: Function) {
        if (event === 'message') {
          capturedMessageHandler = handler;
        }
        return originalOn.call(this, event, handler);
      };

      // Subscribe to the topic
      await pubSubService.subscribeToTopic('test-subscription', 'test-topic', handleMessage);

      // Create a test message
      // Create a test message
      const testMessage = new Message(Buffer.from('test-message'));

      // Manually invoke the captured message handler
      if (typeof capturedMessageHandler === 'function') {
        capturedMessageHandler(testMessage);
      } else {
        throw new Error('Message handler was not properly captured');
      }

      Subscription.prototype.on = originalOn;

      // Check if the message handler was called with the test message
      expect(handleMessage).toHaveBeenCalledWith(testMessage);
    });

    it('should handle subscription errors', async () => {
      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock the Subscription's on method to capture the error handler
      const { Subscription } = require('@google-cloud/pubsub');
      const originalOn = Subscription.prototype.on;
      let capturedErrorHandler: Function = () => {}; // Initialize with default empty function

      Subscription.prototype.on = function (event: string, handler: Function) {
        if (event === 'error') {
          capturedErrorHandler = handler;
        }
        return originalOn.call(this, event, handler);
      };

      // Subscribe to the topic
      const handleMessage = jest.fn();
      await pubSubService.subscribeToTopic('test-subscription', 'test-topic', handleMessage);

      // Simulate an error
      const testError = new Error('Subscription error');

      // Manually invoke the captured error handler
      if (typeof capturedErrorHandler === 'function') {
        capturedErrorHandler(testError);
      } else {
        throw new Error('Error handler was not properly captured');
      }

      // Restore the original on method
      Subscription.prototype.on = originalOn;

      // Check if the error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error with subscription test-subscription:'),
        testError,
      );

      // Clean up
      consoleErrorSpy.mockRestore();
    });

    it('should throw PubSubError when subscription creation fails', async () => {
      // Mock the createSubscription method to throw an error
      const { Topic } = require('@google-cloud/pubsub');
      Topic.prototype.createSubscription = jest
        .fn()
        .mockRejectedValue(new Error('Subscription error'));

      const handleMessage = jest.fn();
      await expect(
        pubSubService.subscribeToTopic('test-subscription', 'test-topic', handleMessage),
      ).rejects.toThrow(PubSubError);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe successfully', async () => {
      // First subscribe to create an active subscription
      const handleMessage = jest.fn();
    });
  });

  describe('parseMessageData', () => {
    it('should parse JSON message data correctly', () => {
      const { Message } = require('@google-cloud/pubsub');
      const jsonData = JSON.stringify({ key: 'value' });
      const message = new Message(Buffer.from(jsonData));

      const result = PubSubService.parseMessageData(message);
      expect(result).toEqual({ key: 'value' });
    });

    it('should return string for non-JSON message data', () => {
      const { Message } = require('@google-cloud/pubsub');
      const stringData = 'plain text message';
      const message = new Message(Buffer.from(stringData));

      const result = PubSubService.parseMessageData(message);
      expect(result).toBe(stringData);
    });
  });
});
