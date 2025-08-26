import Scene from 'telegraf/scenes/base';
import scenes from '../constants/scenes';
import { messages } from '../messages';
import { keyboards } from '../keyboards';
import UserModel from '../models/User';
import { safeReply, safeReplyWithHTML } from '../helpers';
import { app } from '../app';
const read = new Scene(scenes.read);

read.enter(async ctx => {
  await safeReply(ctx, messages.startMsg, keyboards.getMainKeyboard());
});

read.hears([/(.*)/gi, messages.read], async ctx => {
  if (await app.msgInterceptor.interceptedByMsgAge(ctx)) { return; }

  const { message } = ctx;

  const { from } = message;
  const user = from;
  const { id: userId, username } = user;

  try {
    const userInDB = await UserModel.findOne({ userId: user.id });

    if (!userInDB) {
      await UserModel.create({ userId, username });
    }
  } catch (e) {
    logger.error(`${__filename}: ${e}`);
  }

  ctx.session.userId = userId;
  await app.analytics.trackRead(ctx);

  await ctx.scene.enter(scenes.start);

});

export default read;
