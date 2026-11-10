// Original line icons (24x24, stroke = currentColor).
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 22): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
});
const mk = (d: React.ReactNode) => ({ size, ...rest }: P) => <svg {...base(size)} {...rest}>{d}</svg>;

export const IconDumbbell = mk(<><path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" /></>);
export const IconBody = mk(<><circle cx="12" cy="4.5" r="2" /><path d="M5 9h14M12 9v6M9 21l3-6 3 6" /></>);
export const IconTarget = mk(<><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" /><path d="M12 8l3.5 2v4L12 16l-3.5-2v-4z" /></>);
export const IconCalendar = mk(<><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>);
export const IconMore = mk(<><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="19" cy="12" r="1.2" fill="currentColor" /></>);
export const IconCheck = mk(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconX = mk(<path d="M6 6l12 12M18 6L6 18" />);
export const IconUp = mk(<path d="M12 19V5M6 11l6-6 6 6" />);
export const IconDown = mk(<path d="M12 5v14M6 13l6 6 6-6" />);
export const IconTimer = mk(<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2.5h5" /></>);
export const IconPlus = mk(<path d="M12 5v14M5 12h14" />);
export const IconMinus = mk(<path d="M5 12h14" />);
export const IconChevronLeft = mk(<path d="M15 5l-7 7 7 7" />);
export const IconChevronRight = mk(<path d="M9 5l7 7-7 7" />);
export const IconSwap = mk(<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />);
export const IconRotate = mk(<><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v5h-5" /></>);
export const IconTrash = mk(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />);
export const IconHistory = mk(<><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3 4v4h4M12 8v4l3 2" /></>);
export const IconInfo = mk(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>);
export const IconPause = mk(<path d="M9 5v14M15 5v14" />);
export const IconPlay = mk(<path d="M7 5l12 7-12 7z" />);
export const IconGear = mk(<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3" /></>);
export const IconTrophy = mk(<><path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M8 21h8M10 17h4" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" /></>);
export const IconFlame = mk(<path d="M12 21c4 0 7-2.6 7-6.5 0-3.4-2.4-5.6-4-8-0.7 2.2-2 3.4-3.2 3.4C12 7 11 4.7 9.5 3 9 7 5 9.5 5 14.5 5 18.4 8 21 12 21z" />);
export const IconWeight = mk(<><path d="M6.5 8h11l2.5 12H4z" /><circle cx="12" cy="5" r="2" /></>);
export const IconLink = mk(<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />);
export const IconUpload = mk(<path d="M12 16V4M7 9l5-5 5 5M4 20h16" />);
export const IconDownload = mk(<path d="M12 4v12M7 11l5 5 5-5M4 20h16" />);
/** "Less often": the star with a slash through it. */
export const IconStarOff = mk(<><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" opacity=".55" /><path d="M4 4l16 16" /></>);
export const IconBolt = mk(<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" />);
export const IconPerson = mk(<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>);
export const IconStar = mk(<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />);
export const IconList = mk(<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />);
export const IconEdit = mk(<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />);
