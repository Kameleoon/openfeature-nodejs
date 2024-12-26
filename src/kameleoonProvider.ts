import { KameleoonClient, KameleoonError } from '@kameleoon/nodejs-sdk';
import {
  EvaluationContext,
  Hook,
  JsonValue,
  Logger,
  OpenFeatureEventEmitter,
  Provider,
  ProviderEvents,
  ProviderFatalError,
  ProviderMetadata,
  ResolutionDetails,
} from '@openfeature/server-sdk';
import { KameleoonResolver } from './kameleoonResolver';
import { DataConverter, Resolver } from '@kameleoon/openfeature-core';
import { KameleoonProviderParams } from 'src/types';
import { KameleoonVisitorCodeManager } from '@kameleoon/nodejs-visitor-code-manager';
import { KameleoonEventSource } from '@kameleoon/nodejs-event-source';
import { KameleoonRequester } from '@kameleoon/nodejs-requester';

/**
 * The `KameleoonProvider` is an OpenFeature `Provider` implementation for the Kameleoon SDK.
 */
export class KameleoonProvider implements Provider {
  readonly runsOn = 'server';
  readonly metadata: ProviderMetadata;
  readonly hooks: Hook[] = [];
  public readonly events = new OpenFeatureEventEmitter();

  private resolver: Resolver;
  private client?: KameleoonClient;

  constructor({
    siteCode,
    credentials,
    configuration,
    externals,
  }: KameleoonProviderParams) {
    this.metadata = { name: 'Kameleoon Provider' };
    try {
      this.client = new KameleoonClient({
        siteCode,
        credentials,
        configuration,
        externals: {
          eventSource: externals?.eventSource || new KameleoonEventSource(),
          visitorCodeManager:
            externals?.visitorCodeManager || new KameleoonVisitorCodeManager(),
          requester: externals?.requester || new KameleoonRequester(),
          logger: externals?.logger,
        },
      });
    } catch (error) {
      this.events.emit(ProviderEvents.Error);
      if (error instanceof Error) {
        throw new ProviderFatalError(error.message);
      }
      throw new ProviderFatalError(
        'Kameleoon client is not created with unknown error',
      );
    }
    this.resolver = new KameleoonResolver(this.client);
  }

  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<boolean>> {
    return Promise.resolve(
      this.resolver.resolve({ flagKey, defaultValue, context }),
    );
  }

  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<string>> {
    return Promise.resolve(
      this.resolver.resolve({ flagKey, defaultValue, context }),
    );
  }

  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<number>> {
    return Promise.resolve(
      this.resolver.resolve({ flagKey, defaultValue, context }),
    );
  }

  resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<T>> {
    return Promise.resolve(
      this.resolver.resolve({
        flagKey,
        defaultValue,
        context,
        isAnyType: true,
      }),
    );
  }

  async initialize(context?: EvaluationContext | undefined): Promise<void> {
    if (!this.client) {
      throw new ProviderFatalError('Kameleoon client is not created');
    }
    try {
      const isReady = await this.client.initialize();
      if (isReady) {
        const visitorCode = context?.targetingKey;
        if (visitorCode) {
          this.client.addData(
            visitorCode,
            ...DataConverter.toKameleoon(context),
          );
        }
        this.events.emit(ProviderEvents.Ready);
      } else {
        this.events.emit(ProviderEvents.Error);
      }
    } catch (error) {
      this.events.emit(ProviderEvents.Error);
      if (error instanceof Error) {
        throw new ProviderFatalError(
          `Kameleoon client failed to initialize: ${error.message}`,
        );
      }
      throw new ProviderFatalError(`Kameleoon client failed to initialize`);
    }
  }
}
