import {
  Functions,
  getFunctions,
  httpsCallable,
  HttpsCallableOptions,
  HttpsCallableResult,
  connectFunctionsEmulator
} from 'firebase/functions';

/**
 * Options for configuring function calls
 */
export interface FunctionCallOptions {
  /** Region where the function is deployed (default: 'us-central1') */
  region?: string;
  /** Timeout in milliseconds (default: 60000) */
  timeout?: number;
}

/**
 * Custom error class for Functions-related errors
 */
export class FunctionsError extends Error {
  constructor(
    message: string, 
    public functionName?: string, 
    public code?: string, 
    public originalError?: Error
  ) {
    super(message);
    this.name = 'FunctionsError';
    
    // Ensures proper prototype chain for instanceof checks
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FunctionsError);
    }
  }
}

/**
 * Service for Firebase Cloud Functions operations
 * 
 * Provides typed methods for calling Firebase Functions with support for
 * custom regions and timeout options
 */
export class FunctionsService {
  private functionsInstances: Map<string, Functions> = new Map();
  private app: any;
  private emulatorConfig?: {
    host: string;
    port: number;
  };

  /**
   * Creates a new FunctionsService instance
   * 
   * @param app - The Firebase app instance
   * @param emulatorConfig - Optional emulator configuration
   */
  constructor(
    app: any, 
    emulatorConfig?: { host: string; port: number }
  ) {
    if (!app) {
      throw new Error('FunctionsService requires a valid Firebase app instance');
    }
    this.app = app;
    this.emulatorConfig = emulatorConfig;
  }

  /**
   * Gets a Functions instance for a specific region
   * 
   * @param region - The region to get the Functions instance for
   * @returns The Functions instance for the specified region
   */
  private getFunctionsInstance(region: string = 'us-central1'): Functions {
    if (!this.functionsInstances.has(region)) {
      const functions = getFunctions(this.app, region);
      
      // Connect to emulator if configured
      if (this.emulatorConfig) {
        connectFunctionsEmulator(
          functions, 
          this.emulatorConfig.host, 
          this.emulatorConfig.port
        );
      }
      
      this.functionsInstances.set(region, functions);
    }
    
    return this.functionsInstances.get(region)!;
  }

  /**
   * Calls a Firebase Cloud Function with typed parameters and response
   * 
   * @param functionName - Name of the function to call
   * @param params - Parameters to pass to the function
   * @param options - Optional configuration for the function call
   * @returns Promise resolving to the function response
   */
  async callFunction<TParams, TResponse>(
    functionName: string,
    params: TParams,
    options?: FunctionCallOptions
  ): Promise<TResponse> {
    try {
      const region = options?.region || 'us-central1';
      const functionsInstance = this.getFunctionsInstance(region);
      
      const callableOptions: HttpsCallableOptions = {};
      if (options?.timeout) {
        callableOptions.timeout = options.timeout;
      }
      
      const callable = httpsCallable<TParams, TResponse>(
        functionsInstance,
        functionName,
        callableOptions
      );
      
      const result: HttpsCallableResult<TResponse> = await callable(params);
      return result.data;
    } catch (error: any) {
      console.error(`Error calling function ${functionName}:`, error);
      
      const functionError = new FunctionsError(
        error.message || `Error calling function: ${functionName}`,
        functionName,
        error.code,
        error
      );
      
      throw functionError;
    }
  }
  
  /**
   * Cleans up resources used by the FunctionsService
   */
  cleanup(): void {
    this.functionsInstances.clear();
  }
}

