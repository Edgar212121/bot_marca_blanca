import Scene from 'telegraf/scenes/base';
import { keyboards } from '../keyboards';
import { messages } from '../messages';
import scenes from '../constants/scenes';
import buttons from '../constants/buttons';
import { getExchAmount } from '../api';
import { safeReply, safeReplyWithHTML } from '../helpers';
import { app } from '../app';

const estimateExchange = new Scene(scenes.estExch);

estimateExchange.enter(async ctx => {
  const { tradingData } = ctx.session;
  const { amount, currFrom, currTo, externalIdName, extraId } = tradingData;
  const { ticker: currFromTicker } = currFrom;
  const { ticker: currToTicker } = currTo;

  const fromTo = `${currFromTicker}_${currToTicker}`;
  const { estimatedAmount } = await getExchAmount(amount, fromTo);

  if (typeof estimatedAmount !== 'number') {
    await safeReplyWithHTML(ctx, messages.sorryWeCatchedSomeError);
    delete ctx.session.tradingData.amount;
    await ctx.scene.enter(scenes.amount);
    return
  }
  await app.analytics.trackEstimate(ctx);

  if (externalIdName) {
    delete ctx.session.tradingData.externalIdName;
  }

  if (extraId) {
    delete ctx.session.tradingData.extraId;
  }

  await safeReplyWithHTML(ctx,
    `Selected pair <b>${currFromTicker.toUpperCase()}-${currToTicker.toUpperCase()}</b>. You’re sending <b>${amount} ${currFromTicker.toUpperCase()}</b>; you’ll get ~<b>${estimatedAmount} ${currToTicker.toUpperCase()}</b>.\nEnter the recipient <b>${currToTicker.toUpperCase()}</b> wallet address.`,
    keyboards.getAmountKeyboard(ctx)
  );
});

estimateExchange.hears([/(.*)/gi, buttons.back], async ctx => {
  if (await app.msgInterceptor.interceptedByMsgAge(ctx)) { return; }
  const { text } = ctx.message;
  const { tradingData } = ctx.session;

  if (text === buttons.back) {
    delete ctx.session.tradingData.amount;
    await ctx.scene.enter(scenes.amount);
    return;
  }

  if (text.match(/[^()A-Za-z0-9\s]+/gi)) {
    await safeReply(ctx, messages.validErr);
    return;
  }

  ctx.session.tradingData = { ...tradingData, walletCode: text };

  await ctx.scene.enter(scenes.addInfo);

});

export default estimateExchange;
