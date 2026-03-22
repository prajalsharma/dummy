import { Context } from 'telegraf';

export interface SessionData {
  userId?: string;
  walletAddress?: string;
  pendingAction?: string;
}

export interface BotContext extends Context {
  session: SessionData;
}
