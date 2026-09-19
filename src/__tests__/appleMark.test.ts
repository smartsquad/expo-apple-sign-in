import { APPLE_MARK_PATH, APPLE_MARK_VIEW_BOX, appleMarkSvg } from '../appleMark'

describe('apple mark', () => {
  it('uses a 24x24 view box so the bitten apple is not clipped', () => {
    expect(APPLE_MARK_VIEW_BOX).toBe('0 0 24 24')
    expect(APPLE_MARK_PATH.startsWith('M18.71 19.5')).toBe(true)
    expect(APPLE_MARK_PATH.includes('M13 3.5')).toBe(true)
  })

  it('renders an SVG path with the requested fill', () => {
    const svg = appleMarkSvg('#ffffff')
    expect(svg).toContain(`viewBox="${APPLE_MARK_VIEW_BOX}"`)
    expect(svg).toContain(`fill="#ffffff"`)
    expect(svg).toContain(APPLE_MARK_PATH)
  })
})
