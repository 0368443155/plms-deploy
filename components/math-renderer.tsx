"use client";

import { Block } from "@blocknote/core";
import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  content: string;
  displayMode?: boolean;
}

/**
 * Math Renderer Component
 * Renders LaTeX math equations using KaTeX
 * Can be used inline or in display mode
 */
export const MathRenderer = ({ content, displayMode = false }: MathRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !content) return;

    try {
      katex.render(content, containerRef.current, {
        displayMode,
        throwOnError: false,
        errorColor: "#cc0000",
      });
    } catch (error) {
      console.error("KaTeX rendering error:", error);
      if (containerRef.current) {
        containerRef.current.textContent = content;
      }
    }
  }, [content, displayMode]);

  return (
    <span
      ref={containerRef}
      className={displayMode ? "block my-4" : "inline"}
      style={{
        display: displayMode ? "block" : "inline",
        textAlign: displayMode ? "center" : "inherit",
      }}
    />
  );
};

/**
 * Helper function to check if a string contains LaTeX math
 */
export const isMathContent = (text: string): boolean => {
  // Check for common LaTeX patterns
  const mathPatterns = [
    /\$.*?\$/g, // Inline math: $...$
    /\$\$.*?\$\$/g, // Display math: $$...$$
    /\\[\(\[].*?\\[\)\]]/g, // LaTeX commands
    /\\frac\{.*?\}\{.*?\}/g, // Fractions
    /\\sum|\\int|\\prod|\\lim/g, // Math operators
  ];

  return mathPatterns.some((pattern) => pattern.test(text));
};

/**
 * Extract math content from text
 * Supports both inline ($...$) and display ($$...$$) math
 */
export const extractMathContent = (text: string): { isMath: boolean; content: string; displayMode: boolean } => {
  // Check for display math: $$...$$
  const displayMathMatch = text.match(/\$\$(.*?)\$\$/);
  if (displayMathMatch) {
    return {
      isMath: true,
      content: displayMathMatch[1],
      displayMode: true,
    };
  }

  // Check for inline math: $...$
  const inlineMathMatch = text.match(/\$(.*?)\$/);
  if (inlineMathMatch) {
    return {
      isMath: true,
      content: inlineMathMatch[1],
      displayMode: false,
    };
  }

  return {
    isMath: false,
    content: text,
    displayMode: false,
  };
};

