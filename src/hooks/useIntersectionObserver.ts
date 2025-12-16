import { useEffect, useRef, useState } from "react";

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
}

/**
 * Hook for intersection observer (lazy loading, infinite scroll, etc.)
 * Returns ref to attach to element and isIntersecting state
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLElement>(
  options?: UseIntersectionObserverOptions
): [React.RefObject<T>, boolean] {
  const { freezeOnceVisible = false, ...observerOptions } = options || {};
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // If already visible and frozen, don't observe
    if (freezeOnceVisible && isIntersecting) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        rootMargin: "50px",
        threshold: 0.1,
        ...observerOptions,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isIntersecting, freezeOnceVisible, observerOptions]);

  return [elementRef, isIntersecting];
}

/**
 * Example usage - Lazy load component:
 * 
 * const [ref, isVisible] = useIntersectionObserver({ freezeOnceVisible: true });
 * 
 * return (
 *   <div ref={ref}>
 *     {isVisible ? <HeavyComponent /> : <Skeleton />}
 *   </div>
 * );
 */

/**
 * Example usage - Infinite scroll:
 * 
 * const [ref, isVisible] = useIntersectionObserver();
 * 
 * useEffect(() => {
 *   if (isVisible && hasNextPage) {
 *     fetchNextPage();
 *   }
 * }, [isVisible, hasNextPage]);
 * 
 * return (
 *   <>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={ref} />
 *   </>
 * );
 */
