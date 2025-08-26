import { useEffect, type RefObject } from "react";

export const useClickOutside = <T extends HTMLElement>(
  refs: RefObject<T | null>[],
  callback: (event: MouseEvent) => void
) => {
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const isOutside = refs.every(
        (ref) => !ref.current?.contains(event.target as Node)
      );

      if (isOutside) {
        callback(event);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [callback, refs]);
};
