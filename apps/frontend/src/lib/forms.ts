import { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/lib/api';

/** Copies backend field errors (422 / 409) onto the matching form fields. Returns the general message. */
export function applyApiErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, fields: string[]): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : 'Something went wrong';
  let mapped = false;
  err.errors.forEach((e) => {
    if (e.field && fields.includes(e.field)) {
      setError(e.field as Path<T>, { type: 'server', message: e.message });
      mapped = true;
    }
  });
  return mapped && err.status === 422 ? 'Please fix the highlighted fields.' : err.message;
}
