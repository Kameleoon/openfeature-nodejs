import {
  CredentialsType,
  ExternalsType,
  SDKConfigurationType,
} from '@kameleoon/nodejs-sdk';
import { ErrorCode } from '@openfeature/server-sdk';

/**
 * @param {string} siteCode - client's siteCode defined on Kameleoon platform
 * @param {CredentialsType} credentials - client API credentials to get an access token for requests' Authorization header, such requests are handled with higher request rate limit
 * @param {Partial<SDKConfigurationType> | undefined} configuration - client's configuration
 * @param {ExternalsType} externals - external dependencies
 * */
export type KameleoonProviderParams = {
  siteCode: string;
  credentials: CredentialsType;
  configuration?: Partial<SDKConfigurationType>;
  externals?: ExternalsType;
};

export type ResolutionDetailsParams<T> = {
  value: T;
  variant?: string;
  errorCode?: ErrorCode;
  errorMessage?: string;
};
