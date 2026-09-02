import eye from './eye.svg?raw';
import eyeOff from './eye-off.svg?raw';
import home from './home.svg?raw';
import tag from './tag.svg?raw';
import bag from './bag.svg?raw';
import logout from './logout.svg?raw';
import chevronLeft from './chevron-left.svg?raw';
import chevronRight from './chevron-right.svg?raw';
import upload from './upload.svg?raw';
import close from './close.svg?raw';
import check from './check.svg?raw';

const icons = {
  eye,
  'eye-off': eyeOff,
  home,
  tag,
  bag,
  logout,
  'chevron-left': chevronLeft,
  'chevron-right': chevronRight,
  upload,
  close,
  check,
} as const;

type IconName = keyof typeof icons;

type SvgIconProps = {
  name: IconName;
  className?: string;
};

export function SvgIcon({ name, className }: SvgIconProps) {
  return (
    <span
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
}
