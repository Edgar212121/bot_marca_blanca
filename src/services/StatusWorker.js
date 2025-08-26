import { getTransactionStatus } from '../api';
import { app } from '../app';
import statusTrn from '../constants/statusTransactions';
import { pause } from '../helpers';
import TransactionModel from '../models/Transaction';
import Notifyer from './Notifyer';

class StatusWorker {
  
  constructor(interval) {
    if (StatusWorker.instance instanceof StatusWorker) {
      return StatusWorker.instance;
    }

    StatusWorker.instance = this;

    this.transactions = [];
    this.timer = null;
    this.interval_ms = interval || 30000;
    this.tranLoggingMuteCount = 0;
    return this;
  }
  
  async _getTransactions() {
    // console.log("get trans to ping:");
    this.transactions = await TransactionModel.find({
      $and: [
        { status: { $in: [statusTrn.new, statusTrn.waiting, statusTrn.confirming, statusTrn.exchanging, statusTrn.sending] } },
        { createdTimestamp: { $gt: Date.now() - 1000 * 60 * 180 } },
        { notifyEnabled: true }
      ]
    });
    // console.log("get trans to ping: found " + this.transactions.length + " items");
  }

  async _changeTrnStatus({ id, status }) {
    await TransactionModel.findOneAndUpdate({ transactionId: id }, { status });
  }

  _transactionWasChanged(prevTrn, nextTrn) {
    return nextTrn.status && nextTrn.status !== prevTrn.status;

  }
  async _pingOneTran(t) {
    console.log("tranPing: t.created:" + t.createdTimestamp + "; now=" + Date.now())
    if (isNaN(t.createdTimestamp)) {
      console.log("123 - tran has no timestamp");
      await TransactionModel.findOneAndUpdate({ transactionId: t.id }, { createdTimestamp: Date.now() });
      // }else if (t.createdTimestamp< Date.now() - 1000 * 60 * 50){
      // console.log("456 - tran is too old;
      // await TransactionModel.findOneAndUpdate({transactionId: t.id}, {notifyEnabled:false});
    } else {
      const updatedTrn = await getTransactionStatus(t.transactionId);
      if (updatedTrn && this._transactionWasChanged(t, updatedTrn)) {
        await Notifyer.addRecepient(t.telegramUserId).addPayload({
          ...updatedTrn,
          linkMask: t.transactionExplorerMask
        }).sendNotify();
        await app.analytics.trackTranUpdate(t.telegramUserId, updatedTrn.status);
        await this._changeTrnStatus(updatedTrn);
      }
    }
  }
  async _checkTrnStatus() {
    this.tranLoggingMuteCount++;
    if (this.tranLoggingMuteCount > 10 || this.transactions.length > 0){
      // console.log("tranPing: total: " + this.transactions.length);
      this.tranLoggingMuteCount = 0;
    }
    try {
      const localList = this.transactions;
      for (const t of localList) {
        await pause(10);// decrease request rate to <50 per second to prevent HTPT_429
        await this._pingOneTran(t);
      }
    } catch (e) {
      console.error(e);
    }
    setTimeout(async () => await this.run(), this.interval_ms);
  }


  async run() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    await this._getTransactions();
    await this._checkTrnStatus();
  }

}

export default new StatusWorker();
