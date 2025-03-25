import mongoose, { Document, Schema } from 'mongoose';

export interface IExtractionResult extends Document {
  source: string;
  sourceUrl: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  businessInfoExtracted?: boolean;
  productsExtracted?: number;
  error?: string;
}

const extractionResultSchema = new Schema<IExtractionResult>({
  source: {
    type: String,
    required: true,
    enum: ['website', 'instagram', 'facebook', 'document', 'manual'],
    default: 'website'
  },
  sourceUrl: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  businessInfoExtracted: {
    type: Boolean,
    default: false
  },
  productsExtracted: {
    type: Number,
    default: 0
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
extractionResultSchema.index({ source: 1, status: 1 });
extractionResultSchema.index({ sourceUrl: 1 });
extractionResultSchema.index({ timestamp: -1 });

const ExtractionResult = mongoose.model<IExtractionResult>('ExtractionResult', extractionResultSchema);

export default ExtractionResult;
