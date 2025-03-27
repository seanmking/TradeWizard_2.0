import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Category } from '../data/mockScores';

interface Props {
  data: Array<{
    category: Category;
    score: number;
  }>;
  onCategoryClick: (category: Category) => void;
}

export const ReadinessRadarChart: React.FC<Props> = ({ data, onCategoryClick }) => {
  return (
    <div className="w-full h-[500px] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="category" tick={{ fill: '#4B5563', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#4B5563' }} />
          <Tooltip />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#2563EB"
            fill="#3B82F6"
            fillOpacity={0.6}
            onClick={point => {
              const payload = (point as unknown as { payload: { category: Category } }).payload;
              if (payload?.category) {
                onCategoryClick(payload.category);
              }
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
