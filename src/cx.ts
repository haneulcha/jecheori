// falsy 인자 무시, truthy만 공백 결합. clsx의 5% 기능 = 우리가 쓰는 전부.
export const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ')
