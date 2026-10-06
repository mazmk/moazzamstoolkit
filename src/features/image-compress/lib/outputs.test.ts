import { describe, expect, it } from 'vitest'

import { DEFAULT_FILENAME } from './filename'
import { assignOutputPaths } from './outputs'

const item = (
  id: string,
  name: string,
  dir = '',
  kind = 'file',
  format: 'jpeg' | 'webp' = 'jpeg',
) => ({
  id,
  name,
  dir,
  source: { kind },
  result: { format },
})

describe('assignOutputPaths', () => {
  it('renames, keeps folders for folder/archive images and dedupes across the batch', () => {
    const paths = assignOutputPaths(
      [
        item('1', 'a.jpg'),
        item('2', 'a.jpeg'),
        item('3', 'b.png', 'photos/2024', 'archive', 'webp'),
        item('4', 'c.jpg', 'loose/dir', 'file'),
        { ...item('5', 'pending.jpg'), result: null },
      ],
      DEFAULT_FILENAME,
      true,
    )
    expect(Object.fromEntries(paths)).toEqual({
      '1': 'a-compressed.jpg',
      '2': 'a-compressed-2.jpg',
      '3': 'photos/2024/b-compressed.webp',
      '4': 'c-compressed.jpg',
    })
  })

  it('flattens folders when keepFolders is off, still without collisions', () => {
    const paths = assignOutputPaths(
      [item('1', 'a.jpg', 'x', 'folder'), item('2', 'a.jpg', 'y', 'folder')],
      { ...DEFAULT_FILENAME, suffix: '' },
      false,
    )
    expect([...paths.values()]).toEqual(['a.jpg', 'a-2.jpg'])
  })
})
