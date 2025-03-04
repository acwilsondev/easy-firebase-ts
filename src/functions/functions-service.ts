import { Functions, HttpsCallable, HttpsCallableOptions, httpsCallable } from 'firebase/functions';

/**
 * Error class for Firebase Cloud Functions related errors
 */
export class FunctionsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'FunctionsError';
  }
}

/**
 * Configuration options for the FunctionsService
 */
export interface FunctionsServiceConfig {
  /** Default region for function calls (e.g., 'us-central1') */
  region?: string;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Whether to automatically retry on failure */
  autoRetry?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
}

/**
 * Result of a function call with metadata
 */
export interface FunctionCallResult<T> {
  /** The data returned by the function */
  data: T;
  /** Time taken to execute the function in milliseconds */
  executionTime: number;
}

/**
 * Service for interacting with Firebase Cloud Functions
 */
export class FunctionsService {
  private functions: Functions;
  private config: FunctionsServiceConfig;

  /**
   * Creates a new FunctionsService instance
   * 
   * @param functions - The Firebase Functions instance
   * @param config - Configuration options for the service
   */
  constructor(functions: Functions, config: FunctionsServiceConfig = {}) {
    this.functions = functions;
    this.config = {
      region: 'us-central1',
      timeout: 60000,
      autoRetry: false,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Calls a Firebase Cloud Function with the provided data
   * 
   * @param functionName - Name of the function to call
   * @param data - Data to send to the function
   * @param options - Function call options (overrides defaults)
   * @returns A promise that resolves with the function result
   */
  async callFunction<TData = unknown, TResult = unknown>(
    functionName: string,
    data?: TData,
    options?: Partial<FunctionsServiceConfig>
  ): Promise<FunctionCallResult<TResult>> {
    try {
      const startTime = Date.now();
      const callOptions: HttpsCallableOptions = {
        timeout: options?.timeout || this.config.timeout,
      };

      const callable = this.getCallable<TData, TResult>(functionName, callOptions);
      const result = await callable(data);

      return {
        data: result.data as TResult,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      throw this.handleFunctionError(error, functionName);
    }
  }

  /**
   * Creates a callable function that can be reused
   * 
   * @param functionName - Name of the function to create a callable for
   * @param options - Function call options
   * @returns A callable function
   */
  getCallable<TData = unknown, TResult = unknown>(
    functionName: string,
    options?: HttpsCallableOptions
  ): HttpsCallable<TData, TResult> {
    return httpsCallable<TData, TResult>(
      this.functions,
      functionName,
      options
    );
  }

  /**
   * Calls a function with automatic retries on failure
   * 
   * @param functionName - Name of the function to call
   * @param data - Data to send to the function
   * @param options - Function call options (overrides defaults)
   * @returns A promise that resolves with the function result
   */
  async callFunctionWithRetry<TData = unknown, TResult = unknown>(
    functionName: string,
    data?: TData,
    options?: Partial<FunctionsServiceConfig> & { maxRetries?: number }
  ): Promise<FunctionCallResult<TResult>> {
    const maxRetries = options?.maxRetries || this.config.maxRetries || 3;
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.callFunction<TData, TResult>(functionName, data, options);
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain types of errors
        if (error instanceof FunctionsError) {
          // Don't retry on permission errors, invalid arguments, etc.
          if (['permission-denied', 'invalid-argument', 'not-found'].includes(error.code)) {
            throw error;
          }
        }
        
        // Last attempt failed, give up
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
    
    // This should never be reached due to the throw in the loop, but TypeScript doesn't know that
    throw lastError;
  }

  /**
   * Updates the service configuration
   * 
   * @param config - New configuration options (partial)
   */
  updateConfig(config: Partial<FunctionsServiceConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Handles errors from function calls and converts them to FunctionsError
   * 
   * @param error - The error that occurred
   * @param functionName - Name of the function that was called
   * @returns A FunctionsError with appropriate details
   */
  private handleFunctionError(error: unknown, functionName: string): FunctionsError {
    // Default error details
    let code = 'unknown-error';
    let message = `Error calling function '${functionName}': Unknown error`;
    
    // Extract Firebase error details if available
    if (error && typeof error === 'object') {
      if ('code' in error && typeof error.code === 'string') {
        code = error.code.replace('functions/', '');
      }
      
      if ('message' in error && typeof error.message === 'string') {
        message = `Error calling function '${functionName}': ${error.message}`;
      }
    }
    
    return new FunctionsError(message, code, error);
  }
}

