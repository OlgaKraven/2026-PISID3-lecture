import { conceptGuidance0102 } from './concept-guidance-01-02';
import { conceptGuidance0310 } from './concept-guidance-03-10';
import { conceptGuidance11To18 } from './concept-guidance-11-18';
import { conceptGuidance19To26 } from './concept-guidance-19-26';

type ConceptGuidance = {
  decision?: string;
  pitfall?: string;
  check?: string;
  distractors?: [string, string];
};

export const conceptGuidance: Record<string, Record<string, ConceptGuidance>> = {
  ...conceptGuidance0102,
  ...conceptGuidance0310,
  ...conceptGuidance11To18,
  ...conceptGuidance19To26,
};
