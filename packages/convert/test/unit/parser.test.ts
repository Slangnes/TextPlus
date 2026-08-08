import { describe, it } from 'vitest';

/**
 * TextPlus Convert - M4 Parser Roadmap Stubs
 *
 * The implemented first slice (plain-text transcript segmentation) is
 * covered by real tests in transcript.test.ts. The remaining M4 surface is
 * tracked here as explicit todos instead of placeholder passes.
 */

describe('TextPlus Convert - engine-specific parsing (M4)', () => {
  it.todo('parses Glulx-flavored transcripts');
  it.todo('parses Inform 7 test transcripts');
  it.todo('parses TADS 3 transcripts');
  it.todo('extracts objects and inventory mentions');
  it.todo('merges multiple transcripts into a branching graph');
});
