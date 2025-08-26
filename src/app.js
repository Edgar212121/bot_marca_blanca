import { analytics } from './analytics';
import { content_api } from './api';
import { msgInterceptor, sessionAdapter } from './helpers';

class BotApplication {
  constructor() {
    this.content_api = content_api;
    this.analytics = analytics;
    this.sessionAdapter = sessionAdapter;
    this.msgInterceptor = msgInterceptor;
  }
}


export const app = new BotApplication();
