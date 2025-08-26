import Scene from 'telegraf/scenes/base';
import { messages } from '../messages';
import { keyboards } from '../keyboards';
import { getCurrencyName, getMessageIfCurrencyNotFound, isAvailableCurr, pause, validatePair } from '../helpers';
import buttons from '../constants/buttons';
import scenes from '../constants/scenes';
import { getCurrInfo, content_api } from '../api';
import { safeReply, safeReplyWithHTML } from '../helpers';
import { app } from '../app';

const curTo = new Scene(scenes.currTo);

curTo.enter(async ctx => {
  await app.analytics.trackCurTo(ctx);
  const { tradingData } = ctx.session;
  if (!ctx.session.allCurrencies) {
    ctx.session.allCurrencies = await getAllCurrencies();
  }
  const chosenCurr = tradingData.currFrom ? tradingData.currFrom.ticker : '';
  await safeReplyWithHTML(ctx, messages.selectToMsg, keyboards.getToKeyboard(chosenCurr));
});

curTo.hears([/(.*)/gi, buttons.back], async ctx => {
  if (await app.msgInterceptor.interceptedByMsgAge(ctx)) { return; }
  const { text } = ctx.message;
  if (text === buttons.back) {
    ctx.session.tradingData.currTo = '';
    await ctx.scene.enter(scenes.currFrom);
    return;
  }
  if (!ctx.session.allCurrencies) {
    ctx.session.allCurrencies = await getAllCurrencies();
  }
  const { allCurrencies, tradingData } = ctx.session;

  if (text && text.trim().length) {
    var currencyName = null
    if (text.startsWith('/')) {
      currencyName = text.slice(-text.length + 1);
    } else {
      if (text.match(/^[\u{2705}]/gu)) {
        await ctx.scene.enter(scenes.currTo);
        return;
      }
      if (text.match(/[^()A-Za-z0-9\s]+/gi)) {
        await safeReply(ctx, messages.validErr);
        return;
      }
      currencyName = getCurrencyName(text);
      const currList = await content_api.proposeAwailableCurrs(currencyName);
      if (currList.length == 0) {
        let message = getMessageIfCurrencyNotFound(currencyName);
        await safeReply(ctx, message)
        await pause(500);
        let alternatives = await app.content_api.getFuzzyCurrAlternatives(text);
        let alternativesText = alternatives
        if (alternatives.length > 0) {
          await safeReply(ctx, messages.didYouMean + alternativesText);
        }
        return;
      } else if (currList.length > 1) {
        await safeReply(ctx, messages.multipleResultsFound + currList);
        return;
      }
    }

    const currIndex = isAvailableCurr(currencyName, allCurrencies);
    if (currIndex === -1) {
      console.log(messages.cantFindThisCurrency + currencyName);
      await pause(500);
      await ctx.scene.reenter();
      return;
    }

    const currTo = await getCurrInfo(allCurrencies[currIndex].ticker);
    await safeReplyWithHTML(ctx, `Selected currency - <b>${currTo.ticker.toUpperCase()}</b>.`);

    const { currFrom } = tradingData;
    const pair = `${currFrom.ticker}_${currTo.ticker}`;
    const hasPair = await validatePair(pair);

    if (hasPair) {

      ctx.session.tradingData = { ...tradingData, currTo };

      await ctx.scene.enter(scenes.amount);
      return;
    }

    await safeReply(ctx, messages.invalidPair);
    await ctx.scene.enter(scenes.currFrom);

  }

});

export default curTo;
