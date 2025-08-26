import Scene from 'telegraf/scenes/base';
import { getMinimumDepositAmount } from '../api';
import { keyboards } from '../keyboards';
import { messages } from '../messages';
import scenes from '../constants/scenes';
import buttons from '../constants/buttons';
import { pause } from '../helpers';
import { safeReply, safeReplyWithHTML } from '../helpers';
import { app } from '../app';

const amount = new Scene(scenes.amount);

amount.enter(async (ctx) => {
  const { tradingData } = ctx.session;
  const { currFrom, currTo } = tradingData;
  const tradePair = `${currFrom.ticker}_${currTo.ticker}`;
  const { minAmount } = await getMinimumDepositAmount(tradePair);

  ctx.session.tradingData = { ...tradingData, minAmount };
  const minAmountMsg = minAmount ? `Minimal amount - <b>${minAmount}</b>` : '';

  await app.analytics.trackEnterAmount(ctx);
  await safeReplyWithHTML(ctx,
    `Enter the amount of <b>${currFrom.ticker.toUpperCase()}</b> you would like to exchange.\n${minAmountMsg}`,
    keyboards.getAmountKeyboard(ctx)
  );
});

amount.hears([/[.,0-9a-zA-Zа-яА-Я]+/gi, buttons.back], async ctx => {
  if (await app.msgInterceptor.interceptedByMsgAge(ctx)) { return; }
  const { text } = ctx.message;
  const { tradingData } = ctx.session;

  if (text === buttons.back) {
    ctx.session.tradingData = {
      ...tradingData,
      currTo: '',
    };

    delete ctx.session.tradingData.minAmount;

    await ctx.scene.enter(scenes.currTo);
    return;
  }

  const formattingAmount = Number(text.replace(',', '.'));

  if (tradingData.minAmount > formattingAmount) {
    await safeReply(ctx, `Oops! Wrong amount.`);

    await pause(500);

    await ctx.scene.reenter();

    return;
  }

  if (!formattingAmount || text.match(/0x[\da-f]/i)) {
    await safeReply(ctx, messages.numErr);
    return;
  }

  ctx.session.tradingData = { ...tradingData, amount: formattingAmount };

  await ctx.scene.enter(scenes.estExch);

});

export default amount;