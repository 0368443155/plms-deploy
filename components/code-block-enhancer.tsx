"use client";

import { useEffect, useRef, useState } from "react";

// Dynamically import Prism only on client-side to avoid SSR issues
let Prism: any = null;
if (typeof window !== "undefined") {
  // Import Prism core
  Prism = require("prismjs");

  // Import themes
  require("prismjs/themes/prism.css");
  require("prismjs/themes/prism-tomorrow.css");

  // Import language components in correct order (dependencies first)
  require("prismjs/components/prism-markup"); // HTML (needed by others)
  require("prismjs/components/prism-css");
  require("prismjs/components/prism-clike"); // C-like (needed by C, C++, Java, etc.)
  require("prismjs/components/prism-javascript");
  require("prismjs/components/prism-typescript");
  require("prismjs/components/prism-python");
  require("prismjs/components/prism-c"); // C (needed by C++)
  require("prismjs/components/prism-cpp"); // C++ (depends on C)
  require("prismjs/components/prism-java");
  require("prismjs/components/prism-json");
}

/**
 * Code Block Enhancer
 * Enhances BlockNote code blocks with Prism.js syntax highlighting
 * 
 * Usage: Wrap BlockNote editor with this component
 */
export const CodeBlockEnhancer = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !containerRef.current || !Prism) return;

    // Find all code blocks and highlight them
    const codeBlocks = containerRef.current.querySelectorAll("pre code");

    codeBlocks.forEach((codeBlock) => {
      try {
        // Get language from class or data attribute
        const language =
          codeBlock.className.match(/language-(\w+)/)?.[1] ||
          codeBlock.getAttribute("data-language") ||
          "javascript";

        // Highlight with Prism.js
        Prism.highlightElement(codeBlock as HTMLElement);
      } catch (error) {
        console.error("Prism highlighting error:", error);
      }
    });
  }, [isMounted]);

  // Re-highlight on content changes
  useEffect(() => {
    if (!isMounted || !Prism) return;

    const observer = new MutationObserver(() => {
      if (containerRef.current && Prism) {
        const codeBlocks = containerRef.current.querySelectorAll("pre code");
        codeBlocks.forEach((codeBlock) => {
          try {
            Prism.highlightElement(codeBlock as HTMLElement);
          } catch (error) {
            console.error("Prism re-highlighting error:", error);
          }
        });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, [isMounted]);

  // Don't render until mounted (client-side only)
  if (!isMounted) {
    return <div>{children}</div>;
  }

  return (
    <div ref={containerRef} className="code-block-enhancer">
      {children}
    </div>
  );
};

/**
 * Supported languages for syntax highlighting
 */
export const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "c",
  "css",
  "html",
  "json",
  "markdown",
  "sql",
  "bash",
  "shell",
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

