import mongoose, { Document, Schema } from 'mongoose';

interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
}

interface Source {
  type: string;
  url: string;
  confidence: number;
}

export interface IBusinessProfile extends Document {
  name: string;
  description?: string;
  logo?: string;
  location?: string;
  contactInfo?: ContactInfo;
  socialMedia?: Record<string, string>;
  industries?: string[];
  source: Source;
  lastUpdated: Date;
}

const businessProfileSchema = new Schema<IBusinessProfile>({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  logo: {
    type: String
  },
  location: {
    type: String
  },
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  socialMedia: {
    type: Map,
    of: String,
    default: {}
  },
  industries: {
    type: [String],
    default: []
  },
  source: {
    type: {
      type: String,
      required: true,
      enum: ['website', 'instagram', 'facebook', 'document', 'manual'],
      default: 'manual'
    },
    url: {
      type: String,
      required: false
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 1
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for business search
businessProfileSchema.index({ name: 'text', description: 'text', 'industries': 'text' });

// Create method to filter businesses by confidence threshold
businessProfileSchema.statics.findByConfidence = function(minConfidence: number = 0.5) {
  // Default to 0.5 if minConfidence is undefined
  const threshold = typeof minConfidence === 'number' ? minConfidence : 0.5;
  return this.find({ 'source.confidence': { $gte: threshold } });
};

const BusinessProfile = mongoose.model<IBusinessProfile>('BusinessProfile', businessProfileSchema);

export default BusinessProfile;
