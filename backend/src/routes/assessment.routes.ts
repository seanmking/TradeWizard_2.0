import { Router } from 'express';
import { AssessmentController } from '../controllers/assessment.controller';

const router = Router();
const assessmentController = new AssessmentController();

// Get next question for user
router.get('/next-question/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const question = await assessmentController.getNextQuestion(userId);
    res.json(question);
  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({
      error: 'Failed to get next question',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Submit answer for a question
router.post('/submit-answer', async (req, res) => {
  try {
    const { userId, questionId, answer } = req.body;

    if (!userId || !questionId || !answer) {
      return res.status(400).json({
        error: 'Missing required fields: userId, questionId, answer',
      });
    }

    const response = await assessmentController.submitAnswer(userId, questionId, answer);

    res.json(response);
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({
      error: 'Failed to submit answer',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get assessment progress
router.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const progress = await assessmentController.calculateProgress(userId);
    res.json(progress);
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({
      error: 'Failed to get progress',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
