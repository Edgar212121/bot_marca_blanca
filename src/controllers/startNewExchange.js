import Scene from 'telegraf/scenes/base';
import scenes from '../constants/scenes';
import { messages } from '../messages';
import { keyboards } from '../keyboards';
import { safeReply, safeReplyWithHTML } from '../helpers';
import { app } from '../app';

const startNewExchange = new Scene(scenes.startNewExchange);

startNewExchange.enter(async ctx => {
  await app.analytics.trackWelcomeScreen(ctx);
  await safeReply(ctx, messages.cancel, keyboards.getBackKeyboard());
});

export default startNewExchange;
