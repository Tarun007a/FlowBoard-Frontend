export function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Something went wrong';
  }

  const candidate = error as { error?: unknown; message?: string };
  const body = candidate.error;

  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (body && typeof body === 'object') {
    const nested = body as { message?: unknown; error?: unknown; details?: unknown };

    if (typeof nested.message === 'string' && nested.message.trim()) {
      return nested.message;
    }

    if (typeof nested.error === 'string' && nested.error.trim()) {
      return nested.error;
    }

    if (typeof nested.details === 'string' && nested.details.trim()) {
      return nested.details;
    }
  }

  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }

  return 'Request failed';
}

export function readHttpErrorMessage(error: unknown, fallback = 'Request failed'): string {
  const parsedMessage = readErrorMessage(error);

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const status = Number((error as { status?: unknown }).status ?? 0);

  if (status === 400) {
    return parsedMessage !== 'Request failed'
      ? parsedMessage
      : 'Bad request. Please check your input and try again.';
  }

  if (status === 401) {
    return parsedMessage !== 'Request failed'
      ? parsedMessage
      : 'Unauthorized. Please check your credentials.';
  }

  if (status === 500) {
    return 'Server error. Please try again later.';
  }

  return parsedMessage !== 'Request failed' ? parsedMessage : fallback;
}

export function toNumberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function splitCsvNumbers(value: string): number[] {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}