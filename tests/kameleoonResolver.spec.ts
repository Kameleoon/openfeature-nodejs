import {
  KameleoonClient,
  KameleoonException,
  VariationType,
  VariableType,
  KameleoonError,
  JSONType,
} from '@kameleoon/nodejs-sdk';
import { KameleoonResolver } from 'src/kameleoonResolver';
import { ErrorCode, EvaluationContext } from '@openfeature/server-sdk';
import {
  BooleanVariableType,
  JSONVariableType,
  KameleoonVariableType,
  NumberVariableType,
  StringVariableType,
} from '@kameleoon/javascript-sdk-core/dist/types';
import { JsonValue } from '@openfeature/core';
import { DataType } from '@kameleoon/openfeature-core';

describe('KameleoonResolver', () => {
  let clientMock: jest.Mocked<KameleoonClient>;

  beforeEach(async () => {
    clientMock = {
      getVariation: jest.fn(),
      addData: jest.fn(),
    } as unknown as jest.Mocked<KameleoonClient>;
  });

  function setupClientMock(
    variation: VariationType | null,
    error: KameleoonError | null,
  ) {
    if (error === null && variation !== null) {
      clientMock.getVariation.mockReturnValue(variation);
    } else {
      clientMock.getVariation.mockImplementation(() => {
        throw error;
      });
    }
  }

  test.each([
    [
      {
        key: 'key',
        type: VariableType.BOOLEAN,
        value: true,
      } as BooleanVariableType,
    ],
    [
      {
        key: 'key',
        type: VariableType.STRING,
        value: 'test',
      } as StringVariableType,
    ],
  ])('resolve_MismatchType_ReturnsErrorTypeMismatch', (variable) => {
    // Arrange
    const variation: VariationType = {
      key: 'on',
      id: -1,
      experimentId: -1,
      variables: new Map([['key', variable]]),
    };
    setupClientMock(variation, null);

    const resolver = new KameleoonResolver(clientMock);
    const flagKey = 'testFlag';
    const defaultValue = 42;
    const context: EvaluationContext = { targetingKey: 'testVisitor' };

    // Act
    const result = resolver.resolve({ flagKey, defaultValue, context });

    // Assert
    expect(result.value).toBe(defaultValue);
    expect(result.errorCode).toBe(ErrorCode.TYPE_MISMATCH);
    expect(result.errorMessage).toBe(
      'The type of value received is different from the requested value.',
    );
    expect(result.variant).toBe(variation.key);
  });

  test.each([
    [
      { key: 'on', id: -1, experimentId: -1, variables: new Map() },
      false,
      "The variation 'on' has no variables",
    ],
    [
      {
        key: 'var',
        id: -1,
        experimentId: -1,
        variables: new Map([
          ['key', { key: 'key', type: VariableType.STRING, value: '' }],
        ]),
      },
      true,
      "The value for provided variable key 'variableKey' isn't found in variation 'var'",
    ],
  ])(
    'resolve_NoMatchVariable_ReturnsErrorForFlagNotFound',
    (variation, addVariableKey, errorMessage) => {
      setupClientMock(variation, null);

      const resolver = new KameleoonResolver(clientMock);
      const flagKey = 'testFlag';
      const defaultValue = 42;
      const context: EvaluationContext = {
        targetingKey: 'testVisitor',
      };
      if (addVariableKey) {
        context[DataType.VARIABLE_KEY] = 'variableKey';
      }

      const result = resolver.resolve({ flagKey, defaultValue, context });

      expect(result.value).toBe(defaultValue);
      expect(result.errorCode).toBe(ErrorCode.FLAG_NOT_FOUND);
      expect(result.errorMessage).toBe(errorMessage);
      expect(result.variant).toBe(variation.key);
    },
  );

  test.each([
    [
      new KameleoonError(
        KameleoonException.FeatureFlagConfigurationNotFound,
        'featureException',
      ),
      ErrorCode.FLAG_NOT_FOUND,
    ],
    [
      new KameleoonError(KameleoonException.VisitorCodeEmpty),
      ErrorCode.INVALID_CONTEXT,
    ],
  ])(
    'resolve_KameleoonException_ReturnsErrorProperError',
    (error, errorCode) => {
      // Arrange
      setupClientMock(null, error);

      const resolver = new KameleoonResolver(clientMock);
      const flagKey = 'testFlag';
      const defaultValue = 42;
      const context: EvaluationContext = { targetingKey: 'testVisitor' };

      // Act
      const result = resolver.resolve({ flagKey, defaultValue, context });

      // Assert
      expect(result.value).toBe(defaultValue);
      expect(result.errorCode).toBe(errorCode);
      expect(result.errorMessage).toBe(error.message);
      expect(result.variant).toBeUndefined();
    },
  );

  test.each([
    [
      null,
      new Map([
        [
          'k',
          {
            key: 'k',
            type: VariableType.NUMBER,
            value: 10,
          } as NumberVariableType,
        ],
      ]),
      10,
      9,
    ],
    [
      null,
      new Map([
        [
          'k1',
          {
            key: 'k1',
            type: VariableType.STRING,
            value: 'str',
          } as StringVariableType,
        ],
      ]),
      'str',
      'st',
    ],
    [
      null,
      new Map([
        [
          'k2',
          {
            key: 'k2',
            type: VariableType.BOOLEAN,
            value: true,
          } as BooleanVariableType,
        ],
      ]),
      true,
      false,
    ],
    [
      null,
      new Map([
        [
          'k3',
          {
            key: 'k3',
            type: VariableType.NUMBER,
            value: 10.0,
          } as NumberVariableType,
        ],
      ]),
      10.0,
      11.0,
    ],
    [
      'varKey',
      new Map([
        ['varKey', { key: 'varKey', type: VariableType.NUMBER, value: 10.0 }],
      ]),
      10.0,
      11.0,
    ],
    [
      'varKey',
      new Map([
        [
          'varKey',
          {
            key: 'varKey',
            type: VariableType.JSON,
            value: { test: 10.0 } as JSONType,
          } as JSONVariableType,
        ],
      ]),
      { test: 10.0 } as JSONType,
      { test: 11.0 } as JsonValue,
    ],
  ])(
    'resolve_ReturnsResultDetails',
    (variableKey, variables, expectedValue, defaultValue) => {
      // Arrange
      const variation: VariationType = {
        key: 'on',
        id: -1,
        experimentId: -1,
        variables: variables as Map<string, KameleoonVariableType>,
      };
      setupClientMock(variation, null);

      const resolver = new KameleoonResolver(clientMock);
      const flagKey = 'testFlag';
      const context: EvaluationContext = {
        targetingKey: 'testVisitor',
        values: variableKey ? { variableKey } : {},
      };

      // Act
      const result = resolver.resolve({ flagKey, defaultValue, context });

      // Assert
      expect(result.value).toStrictEqual(expectedValue);
      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
      expect(result.variant).toBe(variation.key);
    },
  );
});
