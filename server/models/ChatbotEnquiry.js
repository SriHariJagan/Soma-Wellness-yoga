import mongoose from 'mongoose';

const ChatbotEnquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, maxlength: 255, lowercase: true },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    interestedType: {
      type: String,
      enum: ['course', 'program', 'package', 'membership', 'general'],
      default: 'general',
    },
    interestedItem: { type: String, default: '', maxlength: 200 },
    interestedItemId: { type: String, default: '' },
    message: { type: String, default: '', maxlength: 2000 },
    source: { type: String, default: 'chatbot' },
    currentPage: { type: String, default: '', maxlength: 500 },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    status: { type: String, enum: ['new', 'contacted', 'converted', 'closed'], default: 'new' },
  },
  { timestamps: true }
);

ChatbotEnquirySchema.index({ createdAt: -1 });
ChatbotEnquirySchema.index({ email: 1 });
ChatbotEnquirySchema.index({ status: 1 });

const ChatbotEnquiry =
  mongoose.models.ChatbotEnquiry || mongoose.model('ChatbotEnquiry', ChatbotEnquirySchema);
export default ChatbotEnquiry;
