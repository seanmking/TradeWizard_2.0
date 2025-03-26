import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { LinearProgress, Card, Typography, Button, TextField, Box } from '@mui/material';

interface Question {
  question: {
    id: string;
    text: string;
    type: string;
    options?: string[];
    level: string;
  };
  enhancedPrefix?: string;
  enhancedText?: string;
  confidence?: number;
}

interface Progress {
  overallProgress: number;
  estimatedCompletionTime: number;
  categoryProgresses: {
    categoryId: string;
    categoryName: string;
    progress: number;
  }[];
}

const AssessmentInterface: React.FC = () => {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  const fetchNextQuestion = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<Question>(
        `${API_BASE_URL}/assessment/next-question/${userId}`
      );
      setCurrentQuestion(data);
      setAnswer('');
      setError('');
    } catch (err) {
      setError('Failed to load next question. Please try again.');
      console.error('Error fetching question:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, API_BASE_URL]);

  const fetchProgress = useCallback(async () => {
    try {
      const { data } = await axios.get<Progress>(`${API_BASE_URL}/assessment/progress/${userId}`);
      setProgress(data);
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  }, [userId, API_BASE_URL]);

  useEffect(() => {
    if (!userId) {
      router.push('/login');
      return;
    }
    fetchNextQuestion();
    fetchProgress();
  }, [userId, router, fetchNextQuestion, fetchProgress]);

  const handleSubmit = async () => {
    if (!currentQuestion || !answer.trim()) return;

    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/assessment/submit-answer`, {
        userId,
        questionId: currentQuestion.question.id,
        answer: answer.trim(),
      });

      await fetchProgress();
      await fetchNextQuestion();
    } catch (err) {
      setError('Failed to submit answer. Please try again.');
      console.error('Error submitting answer:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Export Readiness Assessment
      </Typography>

      {progress && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Overall Progress: {progress.overallProgress.toFixed(1)}%
          </Typography>
          <LinearProgress variant="determinate" value={progress.overallProgress} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Estimated completion time: {progress.estimatedCompletionTime} minutes
          </Typography>
        </Box>
      )}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {currentQuestion && (
        <Card sx={{ p: 3, mb: 3 }}>
          {currentQuestion.enhancedPrefix && (
            <Typography variant="body1" color="primary" sx={{ mb: 2 }}>
              {currentQuestion.enhancedPrefix}
            </Typography>
          )}

          <Typography variant="h6" gutterBottom>
            {currentQuestion.question.text}
          </Typography>

          {currentQuestion.enhancedText && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {currentQuestion.enhancedText}
            </Typography>
          )}

          {currentQuestion.question.type === 'multiple_choice' &&
          currentQuestion.question.options ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {currentQuestion.question.options.map((option, index) => (
                <Button
                  key={index}
                  variant={answer === option ? 'contained' : 'outlined'}
                  onClick={() => setAnswer(option)}
                  sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  {option}
                </Button>
              ))}
            </Box>
          ) : (
            <TextField
              fullWidth
              multiline
              rows={4}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Enter your answer here..."
              sx={{ mb: 2 }}
            />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="contained" onClick={handleSubmit} disabled={loading || !answer.trim()}>
              {loading ? 'Submitting...' : 'Submit Answer'}
            </Button>
          </Box>
        </Card>
      )}

      {progress && progress.categoryProgresses.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Category Progress
          </Typography>
          {progress.categoryProgresses.map(category => (
            <Box key={category.categoryId} sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                {category.categoryName}: {category.progress.toFixed(1)}%
              </Typography>
              <LinearProgress variant="determinate" value={category.progress} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default AssessmentInterface;
