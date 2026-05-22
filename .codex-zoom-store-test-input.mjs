globalThis.window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
};
globalThis.localStorage = globalThis.window.localStorage;
globalThis.performance = globalThis.performance || { now: () => Date.now() };

import useStore from './src/store/useStore.js';
import { loadProjectData } from './src/lib/loadProject.js';

const data = {
  project: { name: 'Zoom test project' },
  concepts: [
    { concept_key: 'entry', name: 'Entry Point', color: 'teal', explanation: 'Starts the app', importance: 'critical' },
    { concept_key: 'services', name: 'Services', color: 'blue', explanation: 'Handles integrations', importance: 'important' },
  ],
  edges: [
    { source_concept_key: 'entry', target_concept_key: 'services', relationship: 'calls into', strength: 'strong' },
  ],
  files: [],
  userState: { exploration_path: [] },
  sub_concepts: [
    { parent_concept_key: 'entry', sub_concept_key: 'entry/router', name: 'Router', one_liner: 'Chooses the first screen', color: 'teal', importance: 'important', file_ids: [] },
    { parent_concept_key: 'entry', sub_concept_key: 'entry/bootstrap', name: 'Bootstrap', one_liner: 'Creates app shell', color: 'teal', importance: 'supporting', file_ids: [] },
  ],
  sub_concept_edges: [
    { parent_concept_key: 'entry', source_sub_key: 'entry/bootstrap', target_sub_key: 'entry/router', label: 'hands off to' },
  ],
};

loadProjectData(data, 'zoom-test');
let state = useStore.getState();
console.log('ready keys:', [...state.subConceptsReadyKeys].join(','));
console.log('concepts before:', state.concepts.map(c => c.id).join(','));

await state.fetchSubConcepts('entry');
state = useStore.getState();
console.log('concepts after expand:', state.concepts.map(c => c.id).join(','));
console.log('expanded entry:', Boolean(state.expansions.entry));

state.collapseConcept('entry');
state = useStore.getState();
console.log('concepts after collapse:', state.concepts.map(c => c.id).join(','));
console.log('expanded after collapse:', Boolean(state.expansions.entry));
