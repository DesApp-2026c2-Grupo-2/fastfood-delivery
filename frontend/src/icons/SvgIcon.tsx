import eye from './eye.svg?raw';
import eyeOff from './eye-off.svg?raw';

const icons = {
  eye,
  'eye-off': eyeOff,
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
