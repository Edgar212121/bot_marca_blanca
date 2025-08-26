import Scene from 'telegraf/scenes/base';
import scenes from '../constants/scenes';
import { keyboards } from '../keyboards';
import { safeReply, safeReplyWithHTML } from '../helpers';
import { app } from '../app';

const start = new Scene(scenes.start);

start.enter(async ctx => {
  const { userId } = ctx.session;

  await app.analytics.trackStart(ctx);
  const opts = {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...keyboards.getStartEmptyKeyboard(),
  };

  await safeReplyWithHTML(ctx, `Please follow this <a href="${process.env.APP_EXTERNAL_HOST}/user-ip/${userId}">link</a> to read our Terms of Use and Privacy Policy. Then, return to the bot to proceed.`, opts);
});

export default start;
