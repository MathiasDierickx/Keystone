import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { Mermaid } from "./Mermaid";

/**
 * GitHub-flavored Markdown renderer with syntax highlighting and Mermaid
 * diagram support. Used by both the review view and (later) the docs browser.
 */
export function MarkdownView({ content }: { content: string }) {
  return (
    <article
      className="prose prose-neutral dark:prose-invert max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-h1:text-2xl prose-h1:mb-3
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-code:rounded-md prose-code:bg-muted prose-code:px-1.5
        prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none
        prose-code:after:content-none
        prose-pre:rounded-xl prose-pre:bg-muted/60 prose-pre:text-foreground
        prose-blockquote:border-l-primary/40 prose-blockquote:text-muted-foreground
        prose-table:text-sm prose-th:text-left
        prose-img:rounded-xl prose-hr:border-border"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [
            rehypeHighlight,
            { detect: true, ignoreMissing: true, plainText: ["mermaid"] },
          ],
        ]}
        components={{
          code(props: ComponentPropsWithoutRef<"code"> & { node?: unknown }) {
            const { className, children, ...rest } = props;
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            if (lang === "mermaid") {
              return <Mermaid code={String(children).trim()} />;
            }
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
