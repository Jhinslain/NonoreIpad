import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import {
  FALLBACK_CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
} from '../constants.js'

const StageLayoutContext = createContext(null)

export function StageLayoutProvider({ children }) {
  const [templateSize, setTemplateSize] = useState(null)

  const registerTemplateImageSize = useCallback((w, h) => {
    if (typeof w !== 'number' || typeof h !== 'number') return
    if (w < 16 || h < 16) return
    setTemplateSize((prev) => {
      if (prev?.width === w && prev?.height === h) return prev
      return { width: w, height: h }
    })
  }, [])

  const value = useMemo(() => {
    const fbW = GRID_COLS * FALLBACK_CELL_SIZE
    const fbH = GRID_ROWS * FALLBACK_CELL_SIZE
    const stageWidth = templateSize?.width ?? fbW
    const stageHeight = templateSize?.height ?? fbH
    return {
      stageWidth,
      stageHeight,
      cellWidth: stageWidth / GRID_COLS,
      cellHeight: stageHeight / GRID_ROWS,
      hasTemplateMetrics: Boolean(templateSize),
      templateWidth: templateSize?.width ?? null,
      templateHeight: templateSize?.height ?? null,
      registerTemplateImageSize,
    }
  }, [templateSize, registerTemplateImageSize])

  return (
    <StageLayoutContext.Provider value={value}>
      {children}
    </StageLayoutContext.Provider>
  )
}

export function useStageLayout() {
  const ctx = useContext(StageLayoutContext)
  if (!ctx) {
    throw new Error('useStageLayout doit être utilisé dans StageLayoutProvider')
  }
  return ctx
}
