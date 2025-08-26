import mongoose from 'mongoose';
import { system } from 'nodemon/lib/config';
import statusTransactions from '../constants/statusTransactions';

const { Schema } = mongoose;

const TransactionSchema = new Schema({
  transactionId: { type: String, required: true },
  payinAddress: { type: String, required: true },
  payoutAddress: { type: String, required: true },
  payoutExtraId: { type: String, required: false },
  fromCurrency: { type: String, required: true },
  toCurrency: { type: String, required: true },
  amount: { type: Schema.Types.Decimal128, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  transactionExplorerMask: { type: String, required: true },
  status: { type: String, enum: Object.keys(statusTransactions), default: statusTransactions.new },
  telegramUserId: { type: Number, required: true },
  notifyEnabled: { type: Boolean, default: true },
  createdTimestamp: { type: Number, required: true, default: Date.now() },
});

export default mongoose.model('Transaction', TransactionSchema);
