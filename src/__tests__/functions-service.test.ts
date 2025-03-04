import { Functions, HttpsCallableResult } from 'firebase/functions';
import { FunctionsService, FunctionsError } from '../functions/functions-service';

// Mock Firebase Functions
jest.mock('firebase/functions', () => {
  return {
    getFunctions: jest.fn(),
    httpsCallable: jest.fn(),
    connectFunctionsEmulator: jest.fn(),
  };
});

// Import mocked Firebase functions
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

describe('FunctionsService', () => {
  let functionsService: FunctionsService;
  let mockApp: any;
  let mockFunctions: jest.Mocked<Functions>;
  let mockCallableResult: jest.Mocked<HttpsCallableResult<any>>;
  let mockCallable: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Firebase app
    mockApp = {
      name: 'mock-app',
    };

    // Mock Functions instance
    mockFunctions = {
      app: mockApp,
    } as unknown as jest.Mocked<Functions>;

    // Mock callable result
    mockCallableResult = {
      data: { message: 'Success response' },
    } as unknown as jest.Mocked<HttpsCallableResult<any>>;

    // Mock callable function
    mockCallable = jest.fn().mockResolvedValue(mockCallableResult);

    // Mock Firebase functions
    (getFunctions as jest.Mock).mockReturnValue(mockFunctions);
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);
    (connectFunctionsEmulator as jest.Mock).mockReturnValue(undefined);

    // Initialize FunctionsService with mock app
    functionsService = new FunctionsService(mockApp);
  });

  describe('constructor', () => {
    it('should initialize with the provided Firebase app instance', () => {
      const service = new FunctionsService(mockApp);
      expect(service).toBeInstanceOf(FunctionsService);
    });

    it('should throw an error if Firebase app instance is not provided', () => {
      expect(() => new FunctionsService(undefined as any)).toThrow(
        'FunctionsService requires a valid Firebase app instance',
      );
    });

    it('should initialize with emulator config when provided', () => {
      const emulatorConfig = { host: 'localhost', port: 5001 };
      const service = new FunctionsService(mockApp, emulatorConfig);
      expect(service).toBeInstanceOf(FunctionsService);
    });
  });

  describe('callFunction', () => {
    it('should call a function successfully', async () => {
      const params = { name: 'Test User' };
      const result = await functionsService.callFunction<typeof params, { message: string }>(
        'helloWorld',
        params,
      );

      expect(getFunctions).toHaveBeenCalledWith(mockApp, 'us-central1');
      expect(httpsCallable).toHaveBeenCalledWith(mockFunctions, 'helloWorld', {});
      expect(mockCallable).toHaveBeenCalledWith(params);
      expect(result).toEqual({ message: 'Success response' });
    });

    it('should call a function with a custom region', async () => {
      const params = { name: 'Test User' };
      const options = { region: 'europe-west1' };

      await functionsService.callFunction<typeof params, { message: string }>(
        'helloWorld',
        params,
        options,
      );

      expect(getFunctions).toHaveBeenCalledWith(mockApp, 'europe-west1');
    });

    it('should call a function with a custom timeout', async () => {
      const params = { name: 'Test User' };
      const options = { timeout: 30000 };

      await functionsService.callFunction<typeof params, { message: string }>(
        'helloWorld',
        params,
        options,
      );

      expect(httpsCallable).toHaveBeenCalledWith(mockFunctions, 'helloWorld', { timeout: 30000 });
    });

    it('should reuse Functions instances for the same region', async () => {
      await functionsService.callFunction<{}, {}>('function1', {});

      await functionsService.callFunction<{}, {}>('function2', {});

      // getFunctions should only be called once for the default region
      expect(getFunctions).toHaveBeenCalledTimes(1);
    });

    it('should create new Functions instances for different regions', async () => {
      await functionsService.callFunction<{}, {}>('function1', {}, { region: 'us-central1' });

      await functionsService.callFunction<{}, {}>('function2', {}, { region: 'europe-west1' });

      // getFunctions should be called twice, once for each region
      expect(getFunctions).toHaveBeenCalledTimes(2);
      expect(getFunctions).toHaveBeenCalledWith(mockApp, 'us-central1');
      expect(getFunctions).toHaveBeenCalledWith(mockApp, 'europe-west1');
    });

    it('should throw a FunctionsError on function call error', async () => {
      const error = new Error('Function execution failed');
      (error as any).code = 'functions/invalid-argument';

      // Reset the mock to ensure it's not returning the success response
      mockCallable.mockReset();
      // Mock reject for all calls to this test
      mockCallable.mockRejectedValue(error);

      await expect(functionsService.callFunction<{}, {}>('errorFunction', {})).rejects.toThrow(
        FunctionsError,
      );

      await expect(
        functionsService.callFunction<{}, {}>('errorFunction', {}),
      ).rejects.toMatchObject({
        name: 'FunctionsError',
        message: 'Function execution failed',
        functionName: 'errorFunction',
        code: 'functions/invalid-argument',
      });
    });
  });

  describe('emulator configuration', () => {
    it('should connect to the emulator when configured', async () => {
      const emulatorConfig = { host: 'localhost', port: 5001 };
      const emulatorService = new FunctionsService(mockApp, emulatorConfig);

      await emulatorService.callFunction<{}, {}>('emulatorFunction', {});

      expect(connectFunctionsEmulator).toHaveBeenCalledWith(mockFunctions, 'localhost', 5001);
    });

    it('should not connect to the emulator when not configured', async () => {
      await functionsService.callFunction<{}, {}>('regularFunction', {});

      expect(connectFunctionsEmulator).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clear functions instances on cleanup', async () => {
      // Call functions with different regions to populate the instances map
      await functionsService.callFunction<{}, {}>('function1', {}, { region: 'us-central1' });
      await functionsService.callFunction<{}, {}>('function2', {}, { region: 'europe-west1' });

      functionsService.cleanup();

      // Call a function again, which should recreate the Functions instance
      await functionsService.callFunction<{}, {}>('function1', {});

      // getFunctions should now be called 3 times in total
      expect(getFunctions).toHaveBeenCalledTimes(3);
    });
  });
});
