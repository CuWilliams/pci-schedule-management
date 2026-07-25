// Canonical class category colors — mirrors --cls-* tokens in pci-tokens.css
const COLOR_HEX = {
  purple: '#7B68C8',
  green:  '#6AAF3D',
  yellow: '#E8C840',
  orange: '#E8803A',
  blue:   '#5BA3D9',
  gray:   '#9E9E9E',
  red:    '#D95050'
};

// Instructor accent colors — mirrors --inst-* tokens in pci-tokens.css
const INSTRUCTOR_HEX = {
  emerald: '#10B981',
  pink:    '#EC4899',
  indigo:  '#6366F1',
  amber:   '#F59E0B',
  teal:    '#14B8A6',
  violet:  '#8B5CF6',
  cyan:    '#06B6D4'
};

// Role constants — mirrors PciAuth.ROLE_HIERARCHY keys
const ROLES = {
  OWNER:      'owner',
  ADMIN:      'admin',
  INSTRUCTOR: 'instructor',
  MEMBER:     'member'
};

// localStorage keys shared across pages
const SESSION_KEY  = 'pci_session';
const BOOKINGS_KEY = 'pci_bookings';
