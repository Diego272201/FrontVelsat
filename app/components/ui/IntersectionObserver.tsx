import { useEffect, useState, useRef } from 'react';

export const useIntersectionObserver = (options: IntersectionObserverInit) => {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const observe = (element: Element | null) => {
    if (observer.current && element) {
      observer.current.observe(element);
    }
  };

  useEffect(() => {
    observer.current = new IntersectionObserver(([entry]) => {
      setEntry(entry);
    }, options);

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [options]);

  return { entry, observe };
};
