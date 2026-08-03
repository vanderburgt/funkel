// Hand-drawn icon set — 1.6px strokes, geometric, in the spirit of the
// instructional arrow glyphs from the reference material.

const I = ({ size = 22, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true" {...rest}>{children}</svg>
);

export const IconPlay = ({ size }) => (
  <I size={size}><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" /></I>
);

export const IconPause = ({ size }) => (
  <I size={size}>
    <rect x="7" y="5.5" width="3.2" height="13" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.8" y="5.5" width="3.2" height="13" rx="1" fill="currentColor" stroke="none" />
  </I>
);

const skipDigits = {
  fontFamily: 'var(--mono)',
  fontSize: '7px',
  fontWeight: 500,
  letterSpacing: '0'
};

// 270° arc opening at the top, arrowhead tangent to the travel direction,
// digits set in the centre.
export const IconBack15 = ({ size }) => (
  <I size={size}>
    <path d="M12 5.4a7.6 7.6 0 1 0 7.6 7.6" />
    <path d="M15 2.8l-3 2.6 3 2.6" />
    <text x="12" y="13.4" textAnchor="middle" dominantBaseline="middle"
      fill="currentColor" stroke="none" style={skipDigits}>15</text>
  </I>
);

export const IconFwd30 = ({ size }) => (
  <I size={size}>
    <path d="M12 5.4a7.6 7.6 0 1 1-7.6 7.6" />
    <path d="M9 2.8l3 2.6-3 2.6" />
    <text x="12" y="13.4" textAnchor="middle" dominantBaseline="middle"
      fill="currentColor" stroke="none" style={skipDigits}>30</text>
  </I>
);

export const IconSearch = ({ size }) => (
  <I size={size}><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></I>
);

export const IconLibrary = ({ size }) => (
  <I size={size}>
    <rect x="3.5" y="3.5" width="7.4" height="7.4" rx="1.5" />
    <rect x="13.1" y="3.5" width="7.4" height="7.4" rx="1.5" />
    <rect x="3.5" y="13.1" width="7.4" height="7.4" rx="1.5" />
    <circle cx="16.8" cy="16.8" r="3.7" />
  </I>
);

export const IconAntenna = ({ size }) => (
  <I size={size}>
    <circle cx="12" cy="13" r="1.4" fill="currentColor" stroke="none" />
    <path d="M12 14.5V21" />
    <path d="M7.5 8.5a6.4 6.4 0 0 1 9 0" />
    <path d="M4.8 5.8a10.2 10.2 0 0 1 14.4 0" />
  </I>
);

export const IconShare = ({ size }) => (
  <I size={size}>
    <path d="M12 14V3.5" />
    <path d="M8.5 6.5L12 3l3.5 3.5" />
    <path d="M6 10.5H5a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 5 20.5h14a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1" />
  </I>
);

export const IconCheck = ({ size }) => (
  <I size={size}><path d="M4.5 12.5l5 5 10-11" /></I>
);

export const IconPlus = ({ size }) => (
  <I size={size}><path d="M12 5v14M5 12h14" /></I>
);

export const IconChevronLeft = ({ size }) => (
  <I size={size}><path d="M14.5 5l-7 7 7 7" /></I>
);

export const IconChevronDown = ({ size }) => (
  <I size={size}><path d="M5 9.5l7 7 7-7" /></I>
);

export const IconMoon = ({ size }) => (
  <I size={size}><path d="M20 13.5A8.1 8.1 0 0 1 10.5 4a8.1 8.1 0 1 0 9.5 9.5z" /></I>
);

export const IconDots = ({ size }) => (
  <I size={size}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </I>
);

export const IconSettings = ({ size }) => (
  <I size={size}>
    <path d="M4 7h16M4 12h16M4 17h16" />
    <circle cx="9" cy="7" r="2" fill="var(--paper, #F3EFE6)" />
    <circle cx="15" cy="12" r="2" fill="var(--paper, #F3EFE6)" />
    <circle cx="7" cy="17" r="2" fill="var(--paper, #F3EFE6)" />
  </I>
);
