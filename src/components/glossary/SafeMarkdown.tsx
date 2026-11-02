"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

export function SafeMarkdown({ content, className }: SafeMarkdownProps) {
  if (!content) return null;

  return (
    <div className={cn("text-sm text-foreground/90 space-y-2 break-words", className)}>
      <ReactMarkdown
        components={{
          // Tautan wajib target _blank & rel="noopener noreferrer"
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4 hover:opacity-80 font-medium transition-opacity"
              {...props}
            >
              {children}
            </a>
          ),
          h1: ({ children, ...props }) => (
            <h1 className="text-lg font-bold text-foreground mt-3 mb-1.5" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-base font-semibold text-foreground mt-2.5 mb-1" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-sm font-semibold text-foreground mt-2 mb-1" {...props}>
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <p className="leading-relaxed my-1.5" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-5 my-1.5 space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-5 my-1.5 space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-primary/40 pl-3 my-2 italic text-muted-foreground bg-muted/30 py-1 rounded-r"
              {...props}
            >
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground font-semibold"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="rounded-md bg-muted p-3 font-mono text-xs overflow-x-auto my-2 text-foreground border border-border">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          hr: ({ ...props }) => <hr className="my-3 border-border" {...props} />,
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full border-collapse border border-border text-xs" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-border bg-muted px-2.5 py-1.5 text-left font-semibold" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-2.5 py-1.5" {...props}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
