import Scene from 'telegraf/scenes/base';
import { keyboards } from '../keyboards';
import { messages } from '../messages';
import buttons from '../constants/buttons';
import scenes from '../constants/scenes';
import { safeReply } from '../helpers';
import { app } from '../app';

const addInfo = new Scene(scenes.addInfo);

addInfo.enter(async ctx => {
  const { tradingData } = ctx.session;
  const { currTo } = tradingData;
  const { hasExternalId, externalIdName } = currTo;

  if (hasExternalId) {
    await safeReply(ctx, `Enter the ${externalIdName}`, keyboards.getExtraIDKeyboard());
    ctx.session.tradingData = { ...tradingData, externalIdName };
  } else {
    await ctx.scene.enter(scenes.agree);
  }
});

addInfo.hears([/(.*)/gi, buttons.back, buttons.next], async ctx => {
  if (await app.msgInterceptor.interceptedByMsgAge(ctx)) { return; }
  const { text } = ctx.message;
  const { tradingData } = ctx.session;

  if (text === buttons.back) {
    await ctx.scene.enter(scenes.estExch);
    return;
  }

  if (text === buttons.next) {
    await ctx.scene.enter(scenes.agree);
    return;
  }

  if (text.match(/[^A-Za-z0-9\s]+/gi)) {
    await safeReply(ctx, messages.validErr);
    return;
  }

  ctx.session.tradingData = { ...tradingData, extraId: text };

  await ctx.scene.enter(scenes.agree);

}
);

export default addInfo;
