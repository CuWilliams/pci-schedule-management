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
