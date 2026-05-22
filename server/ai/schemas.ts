// JSON-schema definitions for structured Claude tool calls (Gui app).

// Batch file analysis — many files per call, each gets a brief_summary +
// importance + role assigned by a single LLM pass over truncated content.
export const fileAnalysisSchema = {
  type: 'object',
  properties: {
    files: {
      type: 'array',
      description: 'One entry per file. Must include every input path exactly once.',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The exact file path as given in input.' },
          brief_summary: {
            type: 'string',
            description: 'Single sentence (≤ 25 words) describing what this file does and the role it plays in the project. If multiple files in the batch share a role, lead with that shared role label (e.g. "Route handler — …").',
          },
          importance: {
            type: 'string',
            enum: ['core', 'standard', 'boilerplate'],
            description: '"core" = carries the project\'s distinctive logic. "boilerplate" = config/scaffolding/conventional files. "standard" = supporting code that\'s necessary but not novel. Most files should be "standard".',
          },
          role: {
            type: 'string',
            enum: ['entry_point', 'core_logic', 'data', 'ui', 'utility', 'config', 'test', 'types', 'docs'],
            description: 'Coarse classification of the file\'s function.',
          },
        },
        required: ['path', 'brief_summary', 'importance', 'role'],
      },
    },
  },
  required: ['files'],
} as const;

export const folderDescribeSchema = {
  type: 'object',
  properties: {
    zone1: {
      type: 'string',
      description:
        'Three-to-five-paragraph plain-English description of this folder. Cover: (1) what binds the children together, (2) how this folder relates to its siblings, (3) where it fits in the overall project pipeline. Write for a curious non-expert.',
    },
    children: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The child node id, exactly as provided.' },
          brief_summary: {
            type: 'string',
            description: 'A single sentence (≤ 25 words) describing what this child contains.',
          },
          importance: {
            type: 'string',
            enum: ['core', 'standard', 'boilerplate'],
            description: 'How load-bearing this item is to the project\'s distinctive purpose. "core" = files/folders containing the project\'s novel logic that make it itself rather than a generic template. "boilerplate" = config, scaffolding, conventional files you would find in any project of this type. "standard" = supporting code that is necessary but not novel.',
          },
        },
        required: ['id', 'brief_summary', 'importance'],
      },
    },
  },
  required: ['zone1', 'children'],
} as const;

export const fileDescribeSchema = {
  type: 'object',
  properties: {
    zone1: {
      type: 'string',
      description:
        'Three-to-five-paragraph plain-English description of this file. Cover: (1) its overall purpose, (2) how the functions inside it work together, (3) how this file participates in the project pipeline.',
    },
    blocks: {
      type: 'array',
      description: 'Logical groupings of the functions in this file. Each block bundles related functions under a shared theme.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short title for the block (≤ 5 words).' },
          one_liner: { type: 'string', description: 'Single sentence (≤ 25 words) describing the block.' },
          function_names: {
            type: 'array',
            description: 'Names of the functions in this file that belong to this block.',
            items: { type: 'string' },
          },
        },
        required: ['name', 'one_liner', 'function_names'],
      },
    },
  },
  required: ['zone1', 'blocks'],
} as const;

export const jumpResolutionSchema = {
  type: 'object',
  properties: {
    target_id: {
      type: 'string',
      description: 'The id (uuid) of the single tree node that best matches the user query. Must be one of the candidate ids exactly.',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'How confident you are in this match.',
    },
    reasoning: {
      type: 'string',
      description: 'One short sentence explaining why this node matches the query.',
    },
  },
  required: ['target_id', 'confidence', 'reasoning'],
} as const;

export const functionGroupSchema = {
  type: 'object',
  properties: {
    zone1: {
      type: 'string',
      description:
        'Plain-English description of this group of functions. Cover what they collectively do, how they call each other, and the role they play within the file.',
    },
    function_briefs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          function_name: { type: 'string' },
          brief: { type: 'string', description: 'Single sentence (≤ 25 words) summarizing this function.' },
        },
        required: ['function_name', 'brief'],
      },
    },
  },
  required: ['zone1', 'function_briefs'],
} as const;
