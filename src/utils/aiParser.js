import { pipeline } from '@xenova/transformers';

let classifier;

export const initClassifier = async () => {
  classifier = await pipeline('zero-shot-classification', 'Xenova/distilbart-mnli-12-1');
};

export const parseTask = async (inputText) => {
  if (!classifier) await initClassifier();

  const labels = ['High Priority', 'Medium Priority', 'Low Priority', 'Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Weekend'];

  const result = await classifier(inputText, labels);

  const priority = result.labels.find(l => l.includes('Priority')) || 'Medium Priority';
  const due = result.labels.find(l => ['Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Weekend'].includes(l)) || 'No Due Date';

  const cleanedTitle = inputText
    .replace(priority, '')
    .replace(due, '')
    .trim();

  return {
    text: cleanedTitle,
    dueDate: due,
    priority: priority.replace(' Priority', ''),
  };
};
