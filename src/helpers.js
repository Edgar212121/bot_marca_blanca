import { getPairs } from './api';
import UserModel from './models/User';
import TransactionModel from './models/Transaction';
import VisitModel from './models/Visit';
import statuses from './constants/statusTransactions';
import updateSubTypes from './constants/updateSubTypes';
import { messages } from './messages';
import { keyboards } from './keyboards';

export const createAnswerByUpdateSubType = (type) => {
  switch (type) {
    case updateSubTypes.photo:
      return messages.answersByPhoto[getRandomNumber(0, messages.answersByPhoto.length - 1)];
    case updateSubTypes[type]:
      return messages.randomText[getRandomNumber(0, messages.randomText.length - 1)];
    default:
      return null;
  }
};

export const getMessageIfCurrencyNotFound = (selectedCurr) => {
  const initialMsg = messages.currNotFound[getRandomNumber(0, messages.currNotFound.length - 1)];
  return initialMsg.replace('%s', selectedCurr);
};

export const getRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};


export const getIpFromDB = async (userId) => {
  return "127.0.0.1"
};

export const isAvailableCurr = (name, allCurr) => {
  return allCurr.findIndex(c => {
    return c.ticker.toLowerCase() === name.toLowerCase() ||
      c.name.toLowerCase() === name.toLowerCase();
  });
};
function get_bigrams(string) {
  var s = string.toLowerCase()
  var v = s.split('');
  for (var i = 0; i < v.length; i++) { v[i] = s.slice(i, i + 2); }
  return v;
}
export function string_similarity(str1, str2) {
  if (str1.length > 0 && str2.length > 0) {
    var pairs1 = get_bigrams(str1);
    var pairs2 = get_bigrams(str2);
    var union = pairs1.length + pairs2.length;
    var hits = 0;
    for (var x = 0; x < pairs1.length; x++) {
      for (var y = 0; y < pairs2.length; y++) {
        if (pairs1[x] == pairs2[y]) hits++;
      }
    }
    if (hits > 0) return ((2.0 * hits) / union);
  }
  return 0.0
}

export const pause = time => new Promise(resolve => setTimeout(resolve, time));

export const getCurrencyName = text => {
  const textFromBtn = text.match(/(?<=\().+?(?=\))/gi);
  return textFromBtn ? textFromBtn[0].trim() : text.trim();
};

export const validatePair = async pair => {
  const availablePairs = await getPairs();

  return availablePairs.includes(pair);
};

export const addTransactionToDB = async (trn, telegramUserId, transactionExplorerMask) => {
  const user = await UserModel.findOne({ userId: telegramUserId });

  const { id: transactionId, ...fields } = trn;

  const newTrn = await TransactionModel.create({
    ...fields,
    transactionId,
    telegramUserId,
    owner: user.id,
    status: statuses.waiting,
    transactionExplorerMask
  });

  user.transactions.push(newTrn);

  await user.save();
};

export const getIpAction = async req => {
  let userIp;
  if (req.headers['x-forwarded-for']) {
    userIp = req.headers['x-forwarded-for'].split(',')[0];
  } else if (req.connection && req.connection.remoteAddress) {
    userIp = req.connection.remoteAddress;
  } else {
    userIp = req.ip;
  }

  try {
    const user = await UserModel.findOne({ userId: req.params.id }).populate('Visit');
    const visit = await VisitModel.create({ userIp, ipParsed: new Date(), user: user.id });

    user.visits.push(visit);

    await user.save();
    await visit.save();
  } catch (e) {
    logger.error(`${__filename}: ${e}`);
  }
};

class SessionAdapter {
  readUserId(ctx) {
    try {
      var userId
      userId = ctx && ctx.session && ctx.session.userId;
      if (userId == null || userId === undefined) {
        console.log("no userId in session");
        if (userId === undefined) {
          console.log("user id was undefined. restoring by cts.message.from.userId");
          userId = ctx && ctx.message && ctx.message.from && ctx.message.from.userId;
        }
        if (userId == null) {
          console.log("userId was null. restoring by cts.message.from.userId");
          userId = ctx && ctx.message && ctx.message.from && ctx.message.from.userId;
        }
        if (userId == null) {
          console.log("userId was null. restoring by cts.message.from.id");
          userId = ctx && ctx.message && ctx.message.from && ctx.message.from.id;
        }
        if (userId == null) {
          console.log("userId was null. restoring by ctx.from.id");
          userId = ctx && ctx.from && ctx.from.id;
        }
        if (userId != null) {
          console.log("userId restored");
          ctx.session.userId = userId;
        }
      }
      return userId;
    } catch (e) {
      return null;
    }
  }

  readUserIdStr(ctx) {
    var userId = this.readUserId(ctx);
    if (userId == null) {
      return "undefined";
    } else {
      return userId.toString();
    }
  }

}

export const sessionAdapter = new SessionAdapter();

class MessageInterceptor {
  constructor() {
    this.initTimestamp = Date.now() + 1000 * 60 * 60 * 48;// 48hours to receive all old messages - if telegram collected a lot of em
    this.newMessagesPeriod = 1000 * 60 * 60 * 47;// messages newer than 47 hours will be processed even while bot is in state of ignoring old messages
    this.oldUsers = new Array();
  }

  async interceptedByMsgAge(ctx) {
    var userId = sessionAdapter.readUserId(ctx);
    if (userId === undefined){
      console.log("intercepted communication for undefined user");
      return true;
    }
    console.log("intercepting from user " + userId);
    if (Date.now() - this.initTimestamp < 0 && ctx.message.date * 1000 < Date.now() - this.newMessagesPeriod) {
      if (this.oldUsers.includes(ctx.session.userId)) {
        //nop - already excluded
      } else {
        this.oldUsers.push(ctx.session.userId)
      }
      return true;
    }
    const { text } = ctx.message;
    if (text == null) {
      // example case: sent photo
      console.log('intercepted input with null text');
      await safeReply(ctx, messages.validErr);
      return true;
    }
    // latin symbols and space:
    // /[A-Za-z0-9\s]+/ug
    // usual emoji symbols:
    // /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/ug
    // symbols from our menu (see: unicodelookup.com):
    // \u{25C0}\u{25B6}\u{2705}\u{274C}\u{2139}
    if (text.match(/[^()A-Za-z\/0-9\s\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]+\u{25C0}\u{25B6}\u{2705}\u{274C}\u{2139}/ug)) {
      await safeReply(ctx, messages.validErr);
      console.log('intercepted input: ' + text);
      return true;
    }
    console.log("-interceptor passed");
    return false;
  }
}

export const msgInterceptor = new MessageInterceptor();

let lastPass = +new Date();
const pauseForTelegramRateLimit = async () => {
  var passed = false;
  while (!passed) {
    await pause(20 + Math.floor(Math.random() * 3));
    if (Date.now() - lastPass > 50) {
      lastPass = Date.now();
      passed = true;
    }
  }
};

export const safeReply = async (ctx, text, keyboard) => {
  try {
    await pauseForTelegramRateLimit();
    await ctx.reply(text, keyboard);
  } catch (error) {
    console.error(error);
  }
};

export const safeReplyWithHTML = async (ctx, text, keyboard) => {
  try {
    await pauseForTelegramRateLimit();
    await ctx.replyWithHTML(text, keyboard);
  } catch (error) {
    console.error(error);
  }
};

