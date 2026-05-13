/**
 * <JsonLd /> — emits a single `<script type="application/ld+json">` tag
 * with the serialized payload. Server component, no client JS.
 *
 * The payload is HTML-escaped just enough to prevent breaking out of the
 * script tag (`<` → `<`). React already escapes `&` and `>` inside
 * strings, but the `<` character inside a CDATA-less <script> is the one
 * that lets a malicious payload close the tag early — hence the manual
 * replace.
 */

interface JsonLdProps {
  data: Record<string, unknown> | null;
}

export function JsonLd({ data }: JsonLdProps) {
  if (!data) return null;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
