import fc from 'fast-check';

const unicodeText = fc.array(fc.constantFrom('初', '音', 'ミ', 'ク', '桜', 'ñ', 'á', '♪', '🎵', ' '),
  { minLength: 1, maxLength: 50 }).map((characters) => characters.join(''));

export const nonBlankText = fc.oneof(fc.string({ minLength: 1, maxLength: 100 }), unicodeText)
  .filter((text) => text.trim().length > 0);

export const songArbitrary = fc.record({
  title: nonBlankText,
  vocaloid: nonBlankText,
  producer: nonBlankText,
  durationSeconds: fc.integer({ min: 1, max: 3600 }),
});

// Los campos de texto admiten nombres Unicode; no se restringen a cantantes predefinidos.
export const options = { numRuns: 300 };
if (process.env.FC_SEED !== undefined) options.seed = Number(process.env.FC_SEED);
if (process.env.FC_PATH !== undefined) options.path = process.env.FC_PATH;
