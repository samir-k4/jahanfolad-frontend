import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const VIEWPORT_PADDING = 15;
const MENU_GAP = 4;

export default function useAnchoredMenuPosition({
  anchorRef,
  menuRef,
  isOpen,
  align = "left",
  minWidth = 0,
  preferredHeight = 320,
}) {
  const [coords, setCoords] = useState(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportPadding = Math.min(VIEWPORT_PADDING, viewportWidth / 2);
    const maxWidth = Math.max(0, viewportWidth - viewportPadding * 2);
    const width = Math.min(Math.max(rect.width, minWidth), maxWidth);
    const desiredLeft = align === "right" ? rect.right - width : rect.left;
    const left = Math.min(
      Math.max(desiredLeft, viewportPadding),
      viewportWidth - width - viewportPadding,
    );

    const spaceAbove = Math.max(
      0,
      rect.top - MENU_GAP - VIEWPORT_PADDING,
    );
    const spaceBelow = Math.max(
      0,
      viewportHeight - rect.bottom - MENU_GAP - VIEWPORT_PADDING,
    );
    const openUp =
      spaceBelow < preferredHeight && spaceAbove > spaceBelow;
    const availableHeight = openUp ? spaceAbove : spaceBelow;

    const nextCoords = {
      top: openUp ? "auto" : `${rect.bottom + MENU_GAP}px`,
      bottom: openUp
        ? `${viewportHeight - rect.top + MENU_GAP}px`
        : "auto",
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: Math.min(preferredHeight, availableHeight),
    };

    setCoords((current) => {
      if (
        current &&
        current.top === nextCoords.top &&
        current.bottom === nextCoords.bottom &&
        current.left === nextCoords.left &&
        current.width === nextCoords.width &&
        current.maxHeight === nextCoords.maxHeight
      ) {
        return current;
      }
      return nextCoords;
    });
  }, [align, anchorRef, minWidth, preferredHeight]);

  useLayoutEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleScroll = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      updatePosition();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, menuRef, updatePosition]);

  return { coords, updatePosition };
}
