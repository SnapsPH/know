import inquirer from 'inquirer';
import type { QuestionCollection } from 'inquirer';

export const urlValidation = (trimmedInput: string): boolean | string => {
  const generalUrlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  const npmUrlPattern = /^(https?:\/\/)?(www\.)?npmjs\.com\/package\/[@\w-]+(\.[^/]+)?(\/.*)?$/i;
  
  if (generalUrlPattern.test(trimmedInput) || npmUrlPattern.test(trimmedInput)) {
    return true;
  }
  
  return 'Please enter a valid URL';
};

export const resourceNameValidation = (input: string): boolean | string => {
  return input.trim().length > 0 
    ? true 
    : 'Resource name cannot be empty';
};

export const crawlPrompts = [
  {
    type: 'input',
    name: 'resourceName',
    message: 'Enter a name for this resource:',
    default: 'Unnamed Resource',
    validate: resourceNameValidation
  },
  {
    type: 'input',
    name: 'url',
    message: 'Enter the URL to crawl:',
    validate: urlValidation
  },
  {
    type: 'list',
    name: 'depth',
    message: 'Crawl Depth:',
    choices: ['0','1', '2', '3', '4', '5'],
    default: '0'
  },
  {
    type: 'confirm',
    name: 'process',
    message: 'Process immediately after crawling?',
    default: true
  }
];

export async function safePrompt<T extends inquirer.Answers = inquirer.Answers>(
  prompts: QuestionCollection, 
  isPrompting: boolean = false
): Promise<T> {
  if (isPrompting) {
    return new Promise((resolve) => {
      setTimeout(() => {
        safePrompt<T>(prompts).then(resolve);
      }, 100);
    });
  }

  try {
    const answers = await inquirer.prompt<T>(prompts);
    return answers;
  } catch (error) {
    console.error('Prompt Error:', error);
    throw error;
  }
}

export const mainMenuChoices = [
  'Crawl New Resource',
  'Process Existing Resource',
  'Cleanup Resources',
  'Batch Process',
  'View Existing Resources',
  'Manage Settings',
  'Exit'
];
