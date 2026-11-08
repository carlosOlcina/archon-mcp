import fs from 'node:fs';
import type { EnvConfig } from '@archon/validators';

export interface EmbeddingProvider {
  /**
   * Genera el embedding vectorial correspondiente a un texto individual.
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Genera en lote los embeddings para una lista de textos.
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Retorna la dimensionalidad de los vectores producidos (e.g., 384 o 1536).
   */
  getDimensions(): number;

  /**
   * Comprueba la operatividad y salud del proveedor.
   */
  isHealthy(): Promise<boolean>;
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  private readonly dimensions: number;

  constructor(dimensions = 384) {
    this.dimensions = dimensions;
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) + text.charCodeAt(i);
      hash = hash & hash;
    }

    const vector: number[] = new Array(this.dimensions);
    let norm = 0;
    for (let j = 0; j < this.dimensions; j++) {
      const val = Math.sin(hash + j);
      vector[j] = val;
      norm += val * val;
    }

    norm = Math.sqrt(norm);
    return vector.map((v) => (norm === 0 ? 0 : Number((v / norm).toFixed(6))));
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }

  public getDimensions(): number {
    return this.dimensions;
  }

  public async isHealthy(): Promise<boolean> {
    return true;
  }
}

export class WorkerUnavailableError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(`Worker real no disponible: ${message}`);
    this.name = 'WorkerUnavailableError';
    this.cause = cause;
    Object.setPrototypeOf(this, WorkerUnavailableError.prototype);
  }
}

export interface RealWorkerClientOptions {
  binaryPath?: string;
  socketPath?: string;
  dimensions?: number;
}

export class RealWorkerClient implements EmbeddingProvider {
  private readonly binaryPath?: string;
  private readonly socketPath?: string;
  private readonly dimensions: number;

  constructor(options: RealWorkerClientOptions) {
    this.binaryPath = options.binaryPath;
    this.socketPath = options.socketPath;
    this.dimensions = options.dimensions ?? 384;
  }

  public getDimensions(): number {
    return this.dimensions;
  }

  public async isHealthy(): Promise<boolean> {
    if (this.binaryPath) {
      return fs.existsSync(this.binaryPath);
    }
    return Boolean(this.socketPath);
  }

  public async generateEmbedding(_text: string): Promise<number[]> {
    if (this.binaryPath && !fs.existsSync(this.binaryPath)) {
      throw new WorkerUnavailableError(`Binario no encontrado en la ruta '${this.binaryPath}'`);
    }
    throw new WorkerUnavailableError(
      'Canal de comunicación con archon-worker no inicializado o en espera de fase posterior'
    );
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }
}

export class WorkerProviderFactory {
  public static createProvider(config: EnvConfig): EmbeddingProvider {
    if (config.WORKER_MODE === 'mock') {
      return new MockEmbeddingProvider(config.EMBEDDING_DIMENSION);
    }

    if (!config.WORKER_BIN_PATH && !config.WORKER_SOCKET_PATH) {
      throw new WorkerUnavailableError(
        "Faltan parámetros de comunicación (WORKER_BIN_PATH o WORKER_SOCKET_PATH) para modo 'real'"
      );
    }

    return new RealWorkerClient({
      binaryPath: config.WORKER_BIN_PATH,
      socketPath: config.WORKER_SOCKET_PATH,
      dimensions: config.EMBEDDING_DIMENSION,
    });
  }
}
