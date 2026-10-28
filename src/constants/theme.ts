/** Identidade visual da landpage do ProBarber: fundo escuro, detalhes dourados. */
export const Colors = {
  bg: '#0b0a09',
  bg2: '#12100e',
  bg3: '#1a1713',
  fg: '#f4ecdf',
  muted: '#a39786',
  gold: '#d4a24c',
  gold2: '#f0cf8a',
  goldDark: '#9a6b22',
  red: '#b3262e',
  green: '#4aa57a',
  border: 'rgba(212, 162, 76, 0.18)',
  goldSoft: 'rgba(212, 162, 76, 0.12)',
  greenSoft: 'rgba(74, 165, 122, 0.14)',
} as const;

/** Nomes registrados em useFonts (src/app/_layout.tsx). */
export const Fonts = {
  serif: 'PlayfairDisplay_700Bold',
  regular: 'Lexend_400Regular',
  medium: 'Lexend_500Medium',
  semibold: 'Lexend_600SemiBold',
} as const;

export const Spacing = {
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;
