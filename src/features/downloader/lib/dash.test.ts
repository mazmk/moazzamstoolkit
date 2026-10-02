import { describe, expect, it } from 'vitest'

import { parseDashManifest } from './dash'

// Trimmed from a real Loom manifest: separate audio/video adaptation sets, SegmentTimeline, signed URL.
const MANIFEST_URL =
  'https://luna.loom.com/id/abc/rev/1/resource/dash/playlist.mpd?Policy=p&Signature=s'
const MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT12S">
  <Period id="0">
    <AdaptationSet id="0" contentType="audio">
      <Representation id="0" bandwidth="129613" codecs="opus" mimeType="audio/webm">
        <SegmentTemplate timescale="1000000" initialization="abc-audio-init.webm" media="abc-audio-$Number$.webm" startNumber="0">
          <SegmentTimeline><S t="0" d="5000000"/><S d="5000000"/><S d="2000000"/></SegmentTimeline>
        </SegmentTemplate>
      </Representation>
    </AdaptationSet>
    <AdaptationSet id="1" contentType="video">
      <Representation id="original" bandwidth="4998635" codecs="vp9" mimeType="video/webm" width="1908" height="1080">
        <SegmentTemplate timescale="1000000" initialization="abc-video-init.webm" media="abc-video-$Number$.webm" startNumber="0">
          <SegmentTimeline><S t="0" d="5000000" r="1"/><S d="2000000"/></SegmentTimeline>
        </SegmentTemplate>
      </Representation>
      <Representation id="1500000" bandwidth="1500000" codecs="vp9" mimeType="video/webm" width="1272" height="720">
        <SegmentTemplate timescale="1000000" initialization="$RepresentationID$-init.webm" media="$RepresentationID$-$Time$.webm">
          <SegmentTimeline><S t="0" d="5000000" r="1"/><S d="2000000"/></SegmentTimeline>
        </SegmentTemplate>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`

describe('parseDashManifest', () => {
  const reps = parseDashManifest(MANIFEST, MANIFEST_URL)

  it('finds audio and every video quality', () => {
    expect(reps.map((r) => [r.kind, r.id, r.height])).toEqual([
      ['audio', '0', null],
      ['video', 'original', 1080],
      ['video', '1500000', 720],
    ])
  })

  it('expands the segment timeline, including repeats', () => {
    const video = reps.find((r) => r.id === 'original')
    expect(video?.segmentUrls.map((u) => new URL(u).pathname.split('/').pop())).toEqual([
      'abc-video-0.webm',
      'abc-video-1.webm',
      'abc-video-2.webm',
    ])
  })

  it('fills $RepresentationID$ and $Time$ templates', () => {
    const video = reps.find((r) => r.id === '1500000')
    expect(video?.initUrl).toContain('/dash/1500000-init.webm')
    expect(video?.segmentUrls.map((u) => new URL(u).pathname.split('/').pop())).toEqual([
      '1500000-0.webm',
      '1500000-5000000.webm',
      '1500000-10000000.webm',
    ])
  })

  it('carries the signed query string onto every segment', () => {
    for (const rep of reps) {
      for (const url of [rep.initUrl, ...rep.segmentUrls]) {
        expect(new URL(url).search).toBe('?Policy=p&Signature=s')
      }
    }
  })

  it('rejects malformed XML', () => {
    expect(() => parseDashManifest('<MPD', MANIFEST_URL)).toThrow('Invalid DASH manifest')
  })
})
