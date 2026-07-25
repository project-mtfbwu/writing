import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Root, Content, Heading as MdastHeading, PhrasingContent } from "mdast";
import { toString } from "mdast-util-to-string";

export async function markdownToSafeHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}

export async function mdastFragmentToSafeHtml(nodes: Content[]): Promise<string> {
  const tree: Root = { type: "root", children: nodes };
  const file = await unified()
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .run(tree);

  const htmlFile = await unified().use(rehypeStringify).stringify(file as never);
  return String(htmlFile);
}

export function phrasingToMarkdown(nodes: PhrasingContent[]): string {
  return nodes.map((node) => toString(node)).join("");
}

export function headingText(node: MdastHeading): string {
  return toString(node).trim();
}
