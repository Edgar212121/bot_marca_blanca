import { bot } from '../bot';
import statusTrn from '../constants/statusTransactions';
import { messages } from '../messages';
import { pause } from '../helpers';

const messsageOptions = {
  parse_mode: 'HTML',
  disable_web_page_preview: true,
};

class Notifyer {
  constructor(recepientId, payload) {
    if (Notifyer.instance instanceof Notifyer) {
      return Notifyer.instance;
    }

    this.recepientId = recepientId;
    this.messages = [];
    this.payload = payload || {};

    return this;
  }

  _createMessagesByStatus() {
    if (this.payload.status === statusTrn.sending) {
      this.messages = [];
      return;
    }

    if (this.payload.status === statusTrn.finished) {
      const { amountReceive, expectedReceiveAmount, payoutHash, linkMask, toCurrency } = this.payload;

      const messageByAmount = amountReceive <= expectedReceiveAmount ?
        `Your <b>${toCurrency.toUpperCase()}</b> have been sent to your wallet.`
        : `Congrats! You’ve earned  ${(amountReceive - expectedReceiveAmount).toFixed(8)} <b>${toCurrency.toUpperCase()}</b> more than was expected! Your ${amountReceive} <b>${toCurrency.toUpperCase()}</b> have been sent to your wallet.`;

      this.messages = [
        `Yay! The transaction is successfully finished. ${messageByAmount}\n\nThank you for choosing ChangeNOW - hope to see you again soon!`,
        `<a href="${linkMask.replace('$$', payoutHash)}">${payoutHash}</a>`
      ];
      return;
    }

    this.messages = messages[this.payload.status] ? [messages[this.payload.status]] : [];
  };

  addRecepient(recepientId) {
    this.recepientId = recepientId;
    return this;
  };

  addPayload(payload) {
    this.payload = payload;
    return this;
  };

  async sendNotify() {
    this._createMessagesByStatus();

    if (this.messages.length) {

      const promises = this.messages.map(async message => {
        await bot.telegram.sendMessage(this.recepientId, message, messsageOptions);
        await pause(500);
      });

      await Promise.all(promises);

    }
  };

}

export default new Notifyer();

