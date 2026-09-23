// Renders **key idea** as a highlighter mark. Everything else is plain text.
export default function RichText({ text, as: Tag = 'p' }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return (
    <Tag>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? <mark key={i}>{part.slice(2, -2)}</mark> : <span key={i}>{part}</span>
      )}
    </Tag>
  );
}
