import Scene from 'telegraf/scenes/base';
import { isAvailableCurr, getCurrencyName, pause, getMessageIfCurrencyNotFound } from '../helpers';
import { messages } from '../messages';
import { getAllCurrencies, getCurrInfo, content_api } from '../api';
import { keyboards } from '../keyboards';
import scenes from '../constants/scenes';
import Transaction from '../models/Transaction';

import { safeReply, safeReplyWithHTML } from '../helpers';
import { app } from '../app';

const currFrom = new Scene(scenes.currFrom);

currFrom.enter(async ctx => {
  await app.analytics.trackCurFrom(ctx);

  if (ctx.session.listenPressButton) {
    ctx.session.listenPressButton = false;
  }

  if (!ctx.session.allCurrencies) {
    ctx.session.allCurrencies = await getAllCurrencies();
  }

  ctx.session.tradingData = {};

  const { tradingData, userId } = ctx.session;

  const userTransactions = await Transaction.find({ telegramUserId: userId });

  if (userTransactions) {
    const promises = userTransactions.map(async trn => {

      trn.notifyEnabled = false;
      if (isNaN(trn.createdTimestamp)) {
        trn.createdTimestamp = new Date().getTime
      }
      await trn.save();
    });

    await Promise.all(promises);
  }

  const chosenCurr = tradingData.currFrom ? tradingData.currFrom.ticker : '';
  await safeReplyWithHTML(ctx, messages.selectFromMsg, keyboards.getFromKeyboard(chosenCurr));
});

currFrom.hears(/(.*)/gi, async (ctx) => {
  if (await app.msgInterceptor.interceptedByMsgAge(ctx)) { return; }
  const { text } = ctx.message;
  if (!ctx.session.allCurrencies) {
    ctx.session.allCurrencies = await getAllCurrencies();
  }
  const { allCurrencies, tradingData } = ctx.session;

  if (text && text.trim().length) {
    var currencyName = null
    if (text.startsWith('/')) {
      currencyName = text.slice(-text.length + 1);
      //nop1
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
        let alternatives = await content_api.getFuzzyCurrAlternatives(text);
        let alternativesText = alternatives
        if (alternatives.length > 0) {
          await safeReply(ctx, " Did you mean: " + alternativesText);
        }
        return;
      } else if (currList.length > 1) {
        await safeReply(ctx, " Multiple results found: " + currList);
        return;
      }
    }

    const currIndex = isAvailableCurr(currencyName, allCurrencies);
    if (currIndex === -1) {
      console.log("cant find this currency:" + currencyName);
      await pause(500);
      await ctx.scene.reenter();
      return;
    }

    await safeReplyWithHTML(ctx, `Selected currency - <b>${allCurrencies[currIndex].ticker.toUpperCase()}</b>.`);

    ctx.session.tradingData = { ...tradingData, currFrom: await getCurrInfo(allCurrencies[currIndex].ticker) };

    await ctx.scene.enter(scenes.currTo);
  }

});

export default currFrom;
