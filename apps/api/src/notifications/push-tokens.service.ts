import { Injectable } from "@nestjs/common";

@Injectable()
export class PushTokensService {
  private tokens = new Map<string, string[]>(); // userId -> pushToken[]

  register(userId: string, token: string) {
    const existing = this.tokens.get(userId) || [];
    if (!existing.includes(token)) {
      existing.push(token);
      this.tokens.set(userId, existing);
    }
  }

  getTokens(userId: string): string[] {
    return this.tokens.get(userId) || [];
  }

  getAllTokens(): string[] {
    const all: string[] = [];
    for (const tokens of this.tokens.values()) {
      all.push(...tokens);
    }
    return all;
  }
}
