export const CUSTOM_COLOURS = [
  { name: 'Purple', value: '#a855f7' },
  { name: 'Violet', value: '#7542df' },
  { name: 'Pink', value: '#ed49bb' },
  { name: 'Orange', value: '#ed7b18' },
  { name: 'Turquoise', value: '#06b5ab' },
  { name: 'Magenta', value: '#ce36c8' },
] as const;

export type PaletteChoice = 'blue' | 'red' | 'green' | 'custom';

