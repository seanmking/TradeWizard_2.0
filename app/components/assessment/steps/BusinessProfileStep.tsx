"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface BusinessProfileStepProps {
  onSubmit: (data: any) => void;
  data?: {
    website?: string;
    socials?: string;
  };
}

export default function BusinessProfileStep({ onSubmit, data = {} }: BusinessProfileStepProps) {
  const [website, setWebsite] = React.useState(data.website || '');
  const [socials, setSocials] = React.useState(data.socials || '');
  const [error, setError] = React.useState('');
  
  const formatUrl = (url: string) => {
    if (!url) return url;
    url = url.trim();
    if (!url.match(/^https?:\/\//i)) {
      return `https://${url}`;
    }
    return url;
  };

  const validateUrl = (url: string) => {
    if (!url) return true; // Empty URL is allowed
    try {
      new URL(formatUrl(url));
      return true;
    } catch {
      return false;
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!website && !socials) {
      setError('Please provide either a website URL or social media links');
      return;
    }

    if (website && !validateUrl(website)) {
      setError('Please enter a valid website URL');
      return;
    }
    
    onSubmit({ 
      website: website ? formatUrl(website) : '',
      socials 
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Business Website
          </label>
          <Input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="www.example.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Social Media Links
          </label>
          <Textarea
            value={socials}
            onChange={(e) => setSocials(e.target.value)}
            placeholder="Enter your social media links (one per line)"
            rows={4}
          />
        </div>
        
        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}
        
        <div className="flex justify-end pt-4">
          <Button type="submit">
            Continue
          </Button>
        </div>
      </div>
    </form>
  );
} 