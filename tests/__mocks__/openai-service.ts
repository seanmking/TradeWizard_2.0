export const openAIService = {
  getCompletion: jest.fn().mockResolvedValue('Mocked AI response'),
  selectModelForTask: jest.fn().mockReturnValue('gpt-3.5-turbo'),
  mapStageToTaskType: jest.fn().mockReturnValue('initial_assessment')
}; 