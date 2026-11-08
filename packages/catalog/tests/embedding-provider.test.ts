import { describe, it, expect } from 'vitest';
import type { EnvConfig } from '@archon/validators';
import {
  MockEmbeddingProvider,
  RealWorkerClient,
  WorkerProviderFactory,
  WorkerUnavailableError,
} from '../src/index.js';

describe('@archon/catalog Embedding Providers and Factory', () => {
  describe('MockEmbeddingProvider [R13]', () => {
    it('should generate deterministic vectors for the same input text', async () => {
      const provider = new MockEmbeddingProvider(384);
      const text = 'Archon deterministic embedding text';

      const embedding1 = await provider.generateEmbedding(text);
      const embedding2 = await provider.generateEmbedding(text);

      expect(embedding1).toEqual(embedding2);
      expect(embedding1.length).toBe(384);
    });

    it('should generate distinct vectors for different input texts', async () => {
      const provider = new MockEmbeddingProvider(384);

      const embeddingA = await provider.generateEmbedding('First document query');
      const embeddingB = await provider.generateEmbedding('Second unrelated query');

      expect(embeddingA).not.toEqual(embeddingB);
    });

    it('should respect custom dimensions', async () => {
      const provider = new MockEmbeddingProvider(128);
      const embedding = await provider.generateEmbedding('Custom dimension text');

      expect(provider.getDimensions()).toBe(128);
      expect(embedding.length).toBe(128);
    });

    it('should produce unit-normalized vectors (Euclidean L2 norm ~ 1.0)', async () => {
      const provider = new MockEmbeddingProvider(384);
      const embedding = await provider.generateEmbedding('Normalized vector check');

      const sumSquares = embedding.reduce((acc, val) => acc + val * val, 0);
      const norm = Math.sqrt(sumSquares);

      // Float representation rounded to 6 decimal places yields norm close to 1.0
      expect(norm).toBeGreaterThan(0.99);
      expect(norm).toBeLessThan(1.01);
    });

    it('should support batch embedding generation via generateEmbeddings', async () => {
      const provider = new MockEmbeddingProvider(64);
      const texts = ['Text 1', 'Text 2', 'Text 3'];

      const batch = await provider.generateEmbeddings(texts);

      expect(batch.length).toBe(3);
      expect(batch[0]?.length).toBe(64);
      expect(batch[1]?.length).toBe(64);
      expect(batch[2]?.length).toBe(64);
      expect(batch[0]).not.toEqual(batch[1]);
    });

    it('should report healthy operational status', async () => {
      const provider = new MockEmbeddingProvider();
      const isHealthy = await provider.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('RealWorkerClient and WorkerUnavailableError [R14]', () => {
    it('should throw WorkerUnavailableError when binary path does not exist', async () => {
      const client = new RealWorkerClient({
        binaryPath: '/non/existent/path/to/archon-worker',
        dimensions: 384,
      });

      expect(await client.isHealthy()).toBe(false);
      await expect(client.generateEmbedding('test')).rejects.toThrowError(WorkerUnavailableError);
    });

    it('should correctly expose error name and cause on WorkerUnavailableError', () => {
      const err = new WorkerUnavailableError('Connection refused', { code: 'ECONNREFUSED' });
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('WorkerUnavailableError');
      expect(err.message).toContain('Worker real no disponible: Connection refused');
      expect(err.cause).toEqual({ code: 'ECONNREFUSED' });
    });
  });

  describe('WorkerProviderFactory [R13, R14]', () => {
    it('should instantiate MockEmbeddingProvider when WORKER_MODE is "mock" [R13]', () => {
      const config: EnvConfig = {
        NODE_ENV: 'development',
        PORT: 3000,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/archon_dev',
        WORKER_MODE: 'mock',
        EMBEDDING_DIMENSION: 384,
      };

      const provider = WorkerProviderFactory.createProvider(config);
      expect(provider).toBeInstanceOf(MockEmbeddingProvider);
      expect(provider.getDimensions()).toBe(384);
    });

    it('should instantiate RealWorkerClient when WORKER_MODE is "real" with binary path [R14]', () => {
      const config: EnvConfig = {
        NODE_ENV: 'development',
        PORT: 3000,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/archon_dev',
        WORKER_MODE: 'real',
        WORKER_BIN_PATH: '/workspaces/archon-mcp/target/debug/archon-worker',
        EMBEDDING_DIMENSION: 384,
      };

      const provider = WorkerProviderFactory.createProvider(config);
      expect(provider).toBeInstanceOf(RealWorkerClient);
      expect(provider.getDimensions()).toBe(384);
    });

    it('should throw WorkerUnavailableError when WORKER_MODE is "real" without binary or socket [R14]', () => {
      const invalidRealConfig = {
        NODE_ENV: 'development',
        PORT: 3000,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/archon_dev',
        WORKER_MODE: 'real',
        EMBEDDING_DIMENSION: 384,
      } as EnvConfig;

      expect(() => WorkerProviderFactory.createProvider(invalidRealConfig)).toThrowError(
        WorkerUnavailableError
      );
    });
  });
});
