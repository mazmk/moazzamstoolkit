import { createContext, use } from 'react'

/**
 * True inside a blurred glass surface. Glass controls read it and switch to the non-blurred
 * `glass-inset` material, so backdrop-filter is never nested inside backdrop-filter.
 */
export const InsideGlassContext = createContext(false)

export const useInsideGlass = () => use(InsideGlassContext)
