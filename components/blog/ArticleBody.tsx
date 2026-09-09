import { Fragment } from "react";

/** Article content is plain text with a tiny, deliberately non-MDX markup
 *  convention: "## " starts a heading, "- " lines form a list, "**bold**"
 *  is inline emphasis, blank lines separate paragraphs. This turns that into
 *  real <h2>/<ul>/<strong> elements instead of dumping the raw markers on
 *  the page — headings need to be real headings for both readers and search
 *  engines to see the article's structure. */

function renderInline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Fragment key={key}>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index}>{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </Fragment>
  );
}

export default function ArticleBody({ content }: { content: string }) {
  const blocks = content.split("\n\n");

  return (
    <>
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        if (block.startsWith("## ")) {
          return (
            <h2 key={key} className="mt-8 text-xl font-bold text-foreground first:mt-0">
              {block.slice(3)}
            </h2>
          );
        }

        const lines = block.split("\n");
        if (lines[0].startsWith("- ")) {
          // Wrapped continuation lines don't start with "- " — fold each
          // one into the item above it instead of treating it as its own
          // paragraph or a malformed list entry.
          const items: string[] = [];
          for (const line of lines) {
            if (line.startsWith("- ")) {
              items.push(line.slice(2));
            } else {
              items[items.length - 1] += ` ${line.trim()}`;
            }
          }

          return (
            <ul key={key} className="list-disc space-y-1.5 pl-5">
              {items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `${key}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={key}>{renderInline(block.replace(/\n/g, " "), key)}</p>
        );
      })}
    </>
  );
}
