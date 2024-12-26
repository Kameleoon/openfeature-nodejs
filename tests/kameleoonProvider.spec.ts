import {
  Conversion,
  CustomData,
  JSONType,
  KameleoonClient,
} from '@kameleoon/nodejs-sdk';
import { KameleoonProvider } from 'src/kameleoonProvider';
import { KameleoonResolver } from 'src/kameleoonResolver';
import {
  ResolutionDetails,
  Metadata,
  Logger,
  ProviderFatalError,
  EvaluationContext,
} from '@openfeature/server-sdk';
import { JsonValue } from '@openfeature/core';
import { DataType } from '@kameleoon/openfeature-core';

describe('KameleoonProvider', () => {
  const CLIENT_ID = 'clientId';
  const CLIENT_SECRET = 'clientSecret';
  const SITE_CODE = 'siteCode';
  const FLAG_KEY = 'flagKey';

  let credentials: any;
  let clientMock: jest.Mocked<KameleoonClient>;
  let resolverMock: jest.Mocked<KameleoonResolver>;
  let provider: KameleoonProvider;
  let loggerMock: jest.Mocked<Logger>;

  beforeEach(() => {
    clientMock = {
      waitInit: jest.fn(),
      addData: jest.fn(),
      getFeatureVariationKey: jest.fn(),
      getFeatureVariationVariables: jest.fn(),
    } as unknown as jest.Mocked<KameleoonClient>;

    resolverMock = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<KameleoonResolver>;

    credentials = { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET };

    provider = new KameleoonProvider({
      siteCode: SITE_CODE,
      credentials,
    });

    provider['resolver'] = resolverMock;
    loggerMock = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
  });

  test('throws ProviderFatalError when initialized with invalid credentials', () => {
    expect(
      () =>
        new KameleoonProvider({
          siteCode: '',
          credentials: { clientId: CLIENT_ID, clientSecret: '' },
        }),
    ).toThrow(
      new ProviderFatalError(
        'KameleoonClient can not be created without credentials',
      ),
    );
  });

  test('returns correct metadata from getMetadata', () => {
    const metadata: Metadata = provider.metadata;
    expect(metadata.name).toBe('Kameleoon Provider');
  });

  const setupResolverMock = (expectedValue: any): void => {
    resolverMock.resolve.mockReturnValue({
      value: expectedValue,
    });
  };

  const assertResult = <T>(result: ResolutionDetails<T>, expectedValue: T) => {
    expect(result).toBeDefined();
    if (result) {
      expect(result.value).toBe(expectedValue);
      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    }
  };

  test('resolveBooleanEvaluation returns the correct value', async () => {
    const defaultValue = false;
    const expectedValue = true;
    setupResolverMock(expectedValue);

    const result = await provider.resolveBooleanEvaluation(
      FLAG_KEY,
      defaultValue,
      {},
      loggerMock,
    );
    assertResult(result, expectedValue);
  });

  test('resolveNumberEvaluation returns the correct value', async () => {
    const defaultValue = 0.5;
    const expectedValue = 2.5;
    setupResolverMock(expectedValue);

    const result = await provider.resolveNumberEvaluation(
      FLAG_KEY,
      defaultValue,
      {},
      loggerMock,
    );
    assertResult(result, expectedValue);
  });

  test('resolveNumberEvaluation returns the correct value', async () => {
    const defaultValue = 1;
    const expectedValue = 2;
    setupResolverMock(expectedValue);

    const result = await provider.resolveNumberEvaluation(
      FLAG_KEY,
      defaultValue,
      {},
      loggerMock,
    );
    assertResult(result, expectedValue);
  });

  test('resolveStringEvaluation returns the correct value', async () => {
    const defaultValue = '1';
    const expectedValue = '2';
    setupResolverMock(expectedValue);

    const result = await provider.resolveStringEvaluation(
      FLAG_KEY,
      defaultValue,
      {},
      loggerMock,
    );
    assertResult(result, expectedValue);
  });

  test.each([
    [{ 1: '1' }, { 1: '1' }],
    ['1', { 1: '1' }],
    ['1', '1'],
    [{ 1: '1' }, '1'],
  ])(
    `resolveObjectEvaluation returns the correct value for %p and %p`,
    async (defaultValue, expectedValue) => {
      const defaultValueOpenfeature: JsonValue = defaultValue;
      const expectedValueOpenfeature: JsonValue = expectedValue;
      const kameleonValue = expectedValue;

      setupResolverMock(kameleonValue);

      const result = await provider.resolveObjectEvaluation(
        FLAG_KEY,
        defaultValueOpenfeature,
        {},
        loggerMock,
      );

      expect(result.value).toEqual(expectedValueOpenfeature);
      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    },
  );

  test.each([[{ 1: '1' }, { 1: '1' }]])(
    `resolveObjectEvaluation returns the correct value`,
    async (defaultValue, expectedValue) => {
      const defaultValueKameleoon: JSONType = defaultValue;
      const expectedValueOpenfeature: JsonValue = expectedValue;
      const kameleonValue: JSONType = expectedValue;

      setupResolverMock(kameleonValue);

      const result = await provider.resolveObjectEvaluation(
        FLAG_KEY,
        defaultValueKameleoon,
        {},
        loggerMock,
      );

      expect(result.value).toEqual(expectedValueOpenfeature);
      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    },
  );

  test('check called addData method', () => {
    const provider = new KameleoonProvider({
      siteCode: SITE_CODE,
      credentials,
    });

    const resolver = provider['resolver'] as KameleoonResolver;
    resolver['client'] = clientMock;
    provider['client'] = clientMock;
    const dataDictionary = {
      [DataType.CUSTOM_DATA]: DataType.makeCustomData(1),
      [DataType.CONVERSION]: DataType.makeConversion({ goalId: 1 }),
    };

    let evalContext: EvaluationContext = {
      targetingKey: 'visitorCode',
      ...dataDictionary,
    };

    const expectedData = [new CustomData(1),
      {
        ...new Conversion({ goalId: 1 }),
        id: expect.any(Number),
      },
    ];

    provider.resolveNumberEvaluation(FLAG_KEY, 1, evalContext, loggerMock);
    expect(clientMock.addData).toHaveBeenCalledTimes(1);
    expect(clientMock.addData).toHaveBeenCalledWith('visitorCode', ...expectedData);
  });
});
