import mongoose, { Document, Schema } from 'mongoose';

interface Source {
  type: string;
  url: string;
  confidence: number;
}

export interface IProductCatalog extends Document {
  name: string;
  description: string;
  images: string[];
  price?: string;
  currency?: string;
  category?: string;
  specifications?: Record<string, string>;
  source: Source;
  lastUpdated: Date;
}

const productCatalogSchema = new Schema<IProductCatalog>({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: false,
    default: ''
  },
  images: {
    type: [String],
    default: []
  },
  price: {
    type: String
  },
  currency: {
    type: String
  },
  category: {
    type: String
  },
  specifications: {
    type: Map,
    of: String,
    default: {}
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

// Index for product search
productCatalogSchema.index({ name: 'text', description: 'text', category: 'text' });

// Create method to filter products by confidence threshold
productCatalogSchema.statics.findByConfidence = function(minConfidence: number = 0.5) {
  // Default to 0.5 if minConfidence is undefined
  const threshold = typeof minConfidence === 'number' ? minConfidence : 0.5;
  return this.find({ 'source.confidence': { $gte: threshold } });
};

const ProductCatalog = mongoose.model<IProductCatalog>('ProductCatalog', productCatalogSchema);

export default ProductCatalog;
