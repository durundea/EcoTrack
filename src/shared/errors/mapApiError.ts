import { ServiceHttpError } from '../services';

export type MappedError = {
  title: string;
  message: string;
  retryable: boolean;
};

export function mapApiError(error: unknown): MappedError {
  const statusCode =
    typeof error === 'number'
      ? error
      : error instanceof ServiceHttpError
        ? error.statusCode
        : 0;
  if (statusCode === 401) return { title: 'Access denied', message: 'Your session has expired. Please log in again.', retryable: false };
  if (statusCode === 403) return { title: 'Access denied', message: 'You do not have permission to perform this action.', retryable: false };
  if (statusCode === 404) return { title: 'Record not found', message: 'The requested record could not be found.', retryable: false };
  if (statusCode === 409) return { title: 'Conflict detected', message: 'This record was modified by another user. Please refresh and try again.', retryable: true };
  if (statusCode >= 500) return { title: 'Unexpected server error', message: 'Something went wrong on the server. Please try again.', retryable: true };
  return { title: 'Request failed', message: 'An unexpected error occurred.', retryable: true };
}
