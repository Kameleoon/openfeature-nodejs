# Kameleoon OpenFeature provider for server-side Node.js

The Kameleoon OpenFeature provider for server-side Node.js allows you to connect your OpenFeature server implementation in Node.js to Kameleoon without needing to install the Kameleoon SDK for Node.js
> [!WARNING]
> This is a beta version. Breaking changes may be introduced before general release.

## Supported Node.js versions

This version of the SDK is built for the following targets:

* Node.js version 18+

## Get started

This section explains how to install, configure, and customize the Kameleoon OpenFeature provider.

### Install

```bash
npm install @kameleoon/openfeature-server
```
### Usage

The following example shows how to use the Kameleoon provider with the OpenFeature SDK.

<details>
  <summary>TypeScript</summary>

```ts
let provider: KameleoonProvider;
const userId = "userId";
const featureKey = "featureKey";
const CLIENT_ID = 'clientId';
const CLIENT_SECRET = 'clientSecret';
const SITE_CODE = 'tndueuutdq';

try {
  provider = new KameleoonProvider({
    siteCode: SITE_CODE,
    credentials: { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET },
  });
} catch (e) {
  throw new Error();
}

OpenFeature.setProvider(provider);

// Or use OpenFeature.setProviderAndWait for wait for the provider to be ready
try {
  await OpenFeature.setProviderAndWait(provider);
} catch (e) {
  throw new Error();
}

const client = OpenFeature.getClient();

let evalContext: EvaluationContext = {
  targetingKey: VISITOR_CODE,
  [DataType.VARIABLE_KEY]: 'variableKey',
};

let numberOfRecommendedProducts = await client.getNumberValue(
  FEATURE_KEY,
  5,
  evalContext,
);
showRecommendedProducts(numberOfRecommendedProducts);
```
</details>
<details>
  <summary>JavaScript</summary>

```js
let provider;
try {
  provider = new KameleoonProvider({
    siteCode: SITE_CODE,
    credentials: { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET },
  });
} catch (e) {
  throw new Error(e.message);
}

OpenFeature.setProvider(provider);

// Or use OpenFeature.setProviderAndWait to wait for the provider to be ready
try {
  await OpenFeature.setProviderAndWait(provider);
} catch (e) {
  throw new Error(e.message);
}

const client = OpenFeature.getClient();

const evalContext = {
  targetingKey: VISITOR_CODE,
  [DataType.VARIABLE_KEY]: 'variableKey',
};

const numberOfRecommendedProducts = await client.getNumberValue(
  FEATURE_KEY,
  5,
  evalContext,
);
showRecommendedProducts(numberOfRecommendedProducts);
```
</details>

#### Customize the Kameleoon provider

You can customize the Kameleoon provider by changing the `KameleoonClientConfig` object that you passed to the constructor above. For example:

<details>
  <summary>TypeScript</summary>

```ts
const configuration = {
  updateInterval: 20,
  environment: Environment.Production,
  domain: '.example.com',
};

const client = new KameleoonClient({
  siteCode: 'my_site_code',
  credentials,
  configuration,
});
```
</details>
<details>
  <summary>JavaScript</summary>

```js
const configuration = {
  updateInterval: 20,
  environment: Environment.Production,
  domain: '.example.com',
};

const client = new KameleoonClient({
  siteCode: 'my_site_code',
  credentials,
  configuration,
});
```
</details>

> [!NOTE]
> For additional configuration options, see the [Kameleoon documentation](https://developers.kameleoon.com/feature-management-and-experimentation/web-sdks/nodejs-sdk/#initializing-the-kameleoon-client).

## EvaluationContext and Kameleoon Data

Kameleoon uses the concept of associating `Data` to users, while the OpenFeature SDK uses the concept of an `EvaluationContext`, which is a dictionary of string keys and values. The Kameleoon provider maps the `EvaluationContext` to the Kameleoon `Data`.

<details>
  <summary>TypeScript</summary>

```ts
const evalContext: EvaluationContext = {
  targetingKey: VISITOR_CODE,
};
```
</details>
<details>
  <summary>JavaScript</summary>

```js
const evalContext = {
  targetingKey: VISITOR_CODE,
};
```
</details>

The Kameleoon provider provides a few predefined parameters that you can use to target a visitor from a specific audience and track each conversion. These are:

| Parameter               | Description                                                                                                                                                             |
|-------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `DataType.CUSTOM_DATA`  | The parameter is used to set [`CustomData`](https://developers.kameleoon.com/feature-management-and-experimentation/web-sdks/nodejs-sdk/#customdata) for a visitor.     |
| `DataType.CONVERSION`   | The parameter is used to track a [`Conversion`](https://developers.kameleoon.com/feature-management-and-experimentation/web-sdks/nodejs-sdk/#conversion) for a visitor. |
| `DataType.VARIABLE_KEY` | The parameter is used to set key of the variable you want to get a value.                                                                                               |

### DataType.VARIABLE_KEY

The `DataType.VARIABLE_KEY` field has the following parameter:

| Type     | Description                                                                       |
|----------|-----------------------------------------------------------------------------------|
| `string` | Value of the key of the variable you want to get a value This field is mandatory. |

#### Example

<details>
  <summary>TypeScript</summary>

```ts
const evalContext: EvaluationContext = {
  targetingKey: VISITOR_CODE,
  [DataType.VARIABLE_KEY]: 'variableKey',
};
```
</details>
<details>
  <summary>JavaScript</summary>

```js
const evalContext = {
  targetingKey: VISITOR_CODE,
  [DataType.VARIABLE_KEY]: 'variableKey',
};
```
</details>

### DataType.CUSTOM_DATA

Use `DataType.CUSTOM_DATA` to set [`CustomData`](https://developers.kameleoon.com/feature-management-and-experimentation/web-sdks/nodejs-sdk/#customdata) for a visitor. For creation use `DataType.makeCustomData` method with the following parameters:

| Parameter | Type       | Description                                                       |
|-----------|------------|-------------------------------------------------------------------|
| id        | `number`   | Index or ID of the custom data to store. This field is mandatory. |
| values    | `string[]` | Value(s) of the custom data to store. This field is optional.     |

#### Example

<details>
  <summary>TypeScript</summary>

```ts
const customDataDictionary = {
  [DataType.CUSTOM_DATA]: DataType.makeCustomData(1, '10'),
};

const evalContext: EvaluationContext = {
  targetingKey: VISITOR_CODE,
  ...customDataDictionary,
};
```
</details>
<details>
  <summary>JavaScript</summary>

```js
const customDataDictionary = {
  [DataType.CUSTOM_DATA]: DataType.makeCustomData(1, '10'),
};

const evalContext = {
  targetingKey: VISITOR_CODE,
  ...customDataDictionary,
};
```
</details>

### DataType.CONVERSION

Use `DataType.CONVERSION` to track a [`Conversion`](https://developers.kameleoon.com/feature-management-and-experimentation/web-sdks/nodejs-sdk/#conversion) for a visitor. For creation use `DataType.makeConversion` method with the following parameters:

| Parameter | Type     | Description                                                     |
|-----------|----------|-----------------------------------------------------------------|
| goalId    | `number` | Identifier of the goal. This field is mandatory.                |
| revenue   | `number` | Revenue associated with the conversion. This field is optional. |

#### Example

<details>
  <summary>TypeScript</summary>

```ts
const conversionDictionary = {
  [DataType.CONVERSION]: DataType.makeConversion(1, 200),
};

const evalContext: EvaluationContext = {
  targetingKey: VISITOR_CODE,
  ...conversionDictionary,
};
```
</details>
<details>
  <summary>JavaScript</summary>

```js
const conversionDictionary = {
  [DataType.CONVERSION]: DataType.makeConversion(1, 200),
};

const evalContext = {
  targetingKey: VISITOR_CODE,
  ...conversionDictionary,
};
```
</details>

### Use multiple Kameleoon Data types

You can provide many different kinds of Kameleoon data within a single `EvaluationContext` instance.

For example, the following code provides one `DataType.CONVERSION` instance and two `DataType.CUSTOM_DATA` instances.

<details>
  <summary>TypeScript</summary>

```ts
const dataDictionary = {
  [DataType.CONVERSION]: DataType.makeConversion(1, 200),
  [DataType.CUSTOM_DATA]: [
    DataType.makeCustomData(1, "10", "30"),
    DataType.makeCustomData(2, "20"),
  ],
};

const evalContext: EvaluationContext = {
  targetingKey: VISITOR_CODE,
  ...dataDictionary,
};
```
</details>
<details>
  <summary>JavaScript</summary>

```js
const dataDictionary = {
  [DataType.CONVERSION]: DataType.makeConversion(1, 200),
  [DataType.CUSTOM_DATA]: [
    DataType.makeCustomData(1, "10", "30"),
    DataType.makeCustomData(2, "20"),
  ],
};

const evalContext = {
  targetingKey: VISITOR_CODE,
  ...dataDictionary,
};
```
</details>
