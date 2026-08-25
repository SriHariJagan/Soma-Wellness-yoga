import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

export class CounterRepository {
  async nextSequence(name, session) {
    const result = await Counter.findByIdAndUpdate(
      name,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session },
    );
    return result.seq;
  }

  async currentSequence(name) {
    const doc = await Counter.findById(name);
    return doc ? doc.seq : 0;
  }
}

export default CounterRepository;
