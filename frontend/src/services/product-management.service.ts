import axios from 'axios';
import { ProductDetectionResult, UserProductMetadata, ProductFilter } from '../types/product.types';

class ProductManagementService {
  private apiBaseUrl = '/api/products';

  // Detect product from URL
  async detectProduct(url: string): Promise<ProductDetectionResult> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/detect`, { url });
      return response.data.detection;
    } catch (error) {
      console.error('Product detection error:', error);
      throw error;
    }
  }

  // Save or update user's product
  async saveProduct(productData: UserProductMetadata): Promise<UserProductMetadata> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/save`, productData);
      return response.data;
    } catch (error) {
      console.error('Product save error:', error);
      throw error;
    }
  }

  // Fetch user's saved products
  async getUserProducts(userId: string, filters?: ProductFilter): Promise<UserProductMetadata[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/user/${userId}`, { 
        params: filters 
      });
      return response.data;
    } catch (error) {
      console.error('Fetch products error:', error);
      throw error;
    }
  }

  // Get product export readiness details
  async getProductExportReadiness(productId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/readiness/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Export readiness error:', error);
      throw error;
    }
  }

  // Categorize product
  async categorizeProduct(productId: string, category: string): Promise<UserProductMetadata> {
    try {
      const response = await axios.patch(`${this.apiBaseUrl}/${productId}/categorize`, { category });
      return response.data;
    } catch (error) {
      console.error('Product categorization error:', error);
      throw error;
    }
  }

  // Get available product categories
  async getProductCategories(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/categories`);
      return response.data;
    } catch (error) {
      console.error('Fetch categories error:', error);
      throw error;
    }
  }
}

export default new ProductManagementService();
