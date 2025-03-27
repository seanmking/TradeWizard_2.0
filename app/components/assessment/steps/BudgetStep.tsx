"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface BudgetStepProps {
  onSubmit: (data: any) => void;
  data?: {
    budget?: number;
    currency?: string;
    timeline?: string;
    additionalNotes?: string;
  };
}

export default function BudgetStep({ onSubmit, data = {} }: BudgetStepProps) {
  const [budget, setBudget] = React.useState(data.budget?.toString() || '');
  const [currency, setCurrency] = React.useState(data.currency || 'USD');
  const [timeline, setTimeline] = React.useState(data.timeline || '');
  const [additionalNotes, setAdditionalNotes] = React.useState(data.additionalNotes || '');
  const [error, setError] = React.useState('');

  const currencies = [
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
    { value: 'JPY', label: 'Japanese Yen (JPY)' },
    { value: 'CNY', label: 'Chinese Yuan (CNY)' }
  ];

  const timelines = [
    { value: '3_months', label: '3 Months' },
    { value: '6_months', label: '6 Months' },
    { value: '1_year', label: '1 Year' },
    { value: '2_years', label: '2 Years' },
    { value: 'flexible', label: 'Flexible' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!budget || !currency || !timeline) {
      setError('Please fill in all required fields');
      return;
    }

    const numericBudget = parseFloat(budget);
    if (isNaN(numericBudget) || numericBudget <= 0) {
      setError('Please enter a valid budget amount');
      return;
    }

    onSubmit({
      budget: numericBudget,
      currency,
      timeline,
      additionalNotes
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Budget Amount
            </label>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Enter budget amount"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Currency
            </label>
            <Select
              value={currency}
              onValueChange={setCurrency}
            >
              {currencies.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Implementation Timeline
          </label>
          <Select
            value={timeline}
            onValueChange={setTimeline}
          >
            {timelines.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Additional Notes (Optional)
          </label>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any additional notes about budget or timeline"
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