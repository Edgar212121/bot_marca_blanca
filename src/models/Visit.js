import mongoose from 'mongoose';

const { Schema } = mongoose;

const VisitSchema = new Schema({
  userIp: String,
  ipParsed: Date,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
});

export default mongoose.model('Visit', VisitSchema);
