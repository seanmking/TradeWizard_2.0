"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface MarketSelectionStepProps {
  onSubmit: (data: any) => void;
  data?: {
    targetMarkets?: string[];
    marketResearch?: string;
  };
}

export default function MarketSelectionStep({ onSubmit, data = {} }: MarketSelectionStepProps) {
  const [selectedMarkets, setSelectedMarkets] = React.useState<string[]>(data.targetMarkets || []);
  const [marketResearch, setMarketResearch] = React.useState(data.marketResearch || '');
  const [error, setError] = React.useState('');

  const markets = [
    { value: 'north_america', label: 'North America' },
    { value: 'europe', label: 'Europe' },
    { value: 'asia_pacific', label: 'Asia Pacific' },
    { value: 'middle_east', label: 'Middle East' },
    { value: 'africa', label: 'Africa' },
    { value: 'latin_america', label: 'Latin America' }
  ];

  const handleMarketChange = (value: string) => {
    const newMarkets = selectedMarkets.includes(value)
      ? selectedMarkets.filter(market => market !== value)
      : [...selectedMarkets, value];
    setSelectedMarkets(newMarkets);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedMarkets.length === 0) {
      setError('Please select at least one target market');
      return;
    }

    onSubmit({
      targetMarkets: selectedMarkets,
      marketResearch
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Target Markets
          </label>
          <div className="flex flex-wrap gap-2">
            {markets.map(({ value, label }) => (
              <div
                key={value}
                className={`px-4 py-2 rounded-md cursor-pointer border ${
                  selectedMarkets.includes(value)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
                onClick={() => handleMarketChange(value)}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Market Research Notes (Optional)
          </label>
          <Textarea
            value={marketResearch}
            onChange={(e) => setMarketResearch(e.target.value)}
            placeholder="Enter any market research or insights"
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