function requirePublicEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const PUBLIC_API_URL = requirePublicEnv('NEXT_PUBLIC_API_URL');
export const PUBLIC_BOT_URL = requirePublicEnv('NEXT_PUBLIC_BOT_URL');
