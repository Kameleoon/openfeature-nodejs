import {
  ErrorCode,
  EvaluationContext,
  ResolutionDetails,
} from '@openfeature/server-sdk';
import {
  DataConverter,
  DataType,
  ResolveParams,
  Resolver,
} from '@kameleoon/openfeature-core';
import {
  KameleoonClient,
  KameleoonError,
  KameleoonException,
  VariationType,
  KameleoonVariableType,
} from '@kameleoon/nodejs-sdk';
import {
  EvaluationContextValue,
  StandardResolutionReasons,
} from '@openfeature/core';
import { ResolutionDetailsParams } from './types';

/**
 * KameleoonResolver makes evaluations based on provided data, conforms to Resolver interface
 */
export class KameleoonResolver implements Resolver {
  private client: KameleoonClient;

  constructor(client: KameleoonClient) {
    this.client = client;
  }

  /**
   * Main method for getting resolution details based on provided data.
   */
  resolve<T>({
    flagKey,
    defaultValue,
    context,
    isAnyType = false,
  }: ResolveParams<T>): ResolutionDetails<T> {
    try {
      // Get visitor code
      const visitorCode = context?.targetingKey;
      if (!visitorCode) {
        return this.makeResolutionDetails({
          value: defaultValue,
          errorCode: ErrorCode.TARGETING_KEY_MISSING,
          errorMessage:
            'The TargetingKey is required in context and cannot be omitted.',
        });
      }

      // Add targeting data from context to KameleoonClient by visitor code
      this.client.addData(visitorCode, ...DataConverter.toKameleoon(context));

      // Get a variation (main SDK method)
      const variation: VariationType = this.client.getVariation({
        visitorCode: visitorCode,
        featureKey: flagKey,
      });

      // Get variant (variation key)
      const variant: string = variation.key;

      // Get variableKey if it's provided in context or any first in variation.
      // It's the responsibility of the client to have only one variable per variation if
      // variableKey is not provided.
      const variableKey = this.getVariableKey(context, variation.variables);

      // Try to get variable by variable key
      const variable = variation.variables.get(variableKey!);

      // Try to get value from variable
      const value = variable?.value || null;

      if (variableKey === null || value === null) {
        return this.makeResolutionDetails({
          value: defaultValue,
          variant,
          errorCode: ErrorCode.FLAG_NOT_FOUND,
          errorMessage: this.makeErrorDescription(variant, variableKey),
        });
      }

      // Check if the variable value has a required type
      if (!isAnyType && typeof (defaultValue as T) !== typeof value) {
        return this.makeResolutionDetails({
          value: defaultValue,
          variant,
          errorCode: ErrorCode.TYPE_MISMATCH,
          errorMessage:
            'The type of value received is different from the requested value.',
        });
      }

      return this.makeResolutionDetails({
        value: value as T,
        variant,
      });
    } catch (exception) {
      if (exception instanceof KameleoonError) {
        switch (exception.type) {
          case KameleoonException.FeatureFlagConfigurationNotFound:
          case KameleoonException.FeatureFlagEnvironmentDisabled:
          case KameleoonException.FeatureFlagVariableNotFound:
          case KameleoonException.FeatureFlagVariationNotFound:
            return this.makeResolutionDetails({
              value: defaultValue,
              errorCode: ErrorCode.FLAG_NOT_FOUND,
              errorMessage: exception.message,
            });
          case KameleoonException.VisitorCodeEmpty:
          case KameleoonException.VisitorCodeMaxLength:
            return this.makeResolutionDetails({
              value: defaultValue,
              errorCode: ErrorCode.INVALID_CONTEXT,
              errorMessage: exception.message,
            });
        }
      } else if (exception instanceof Error) {
        return this.makeResolutionDetails({
          value: defaultValue,
          errorCode: ErrorCode.GENERAL,
          errorMessage: exception.message,
        });
      }
      return this.makeResolutionDetails({
        value: defaultValue,
        errorCode: ErrorCode.GENERAL,
        errorMessage: 'An unexpected error occurred.',
      });
    }
  }

  /**
   * Helper method to get the variable key from the context or variables map.
   */
  private getVariableKey(
    context: EvaluationContext,
    variables: Map<string, KameleoonVariableType>,
  ): string | null {
    const structContext = context as { [key: string]: EvaluationContextValue };
    let variableKeyValue = structContext[DataType.VARIABLE_KEY] || null;
    let variableKey =
      typeof variableKeyValue === 'string' ? variableKeyValue : null;
    if (!variableKey) {
      variableKey = [...variables.values()][0]?.key || null;
    }
    return variableKey;
  }

  /**
   * Helper method to create a ResolutionDetails object.
   */
  private makeResolutionDetails<T>({
    value,
    variant,
    errorCode,
    errorMessage,
  }: ResolutionDetailsParams<T>): ResolutionDetails<T> {
    return {
      value: value,
      variant: variant,
      reason: StandardResolutionReasons.STATIC,
      errorCode: errorCode,
      errorMessage: errorMessage,
    };
  }

  /**
   * Helper method to create an error description.
   */
  private makeErrorDescription(variant: string, variableKey: string | null) {
    return variableKey === null || variableKey === ''
      ? `The variation '${variant}' has no variables`
      : `The value for provided variable key '${variableKey}' isn't found in variation '${variant}'`;
  }
}
