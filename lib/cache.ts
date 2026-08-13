// Memory cache bypassed for 100% real-time data updates directly from Supabase
export async function cached<T>(_key: string, _ttlMs: number, loader: () => Promise<T>): Promise<T> {
  return loader();
}

export function clearCache(_prefix?: string) {
  // No-op since memory cache is disabled for real-time updates
}

