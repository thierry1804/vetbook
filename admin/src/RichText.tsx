import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { Button, Select, Tooltip } from 'antd';
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined, ClearOutlined, UnorderedListOutlined, OrderedListOutlined,
  LinkOutlined, BlockOutlined,
} from '@ant-design/icons';

// Éditeur riche minimal (gras/italique/souligné, listes, lien, citation, titres) — construit directement sur
// Tiptap plutôt qu'un composant React-Admin couplé au framework : même jeu d'outils que l'ancienne version.
export function RichTextEditor({ value, onChange }: { value?: string; onChange?: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      // Tiptap 3 : le lien et le souligné font partie du StarterKit (les ajouter à part les déclarerait en double) ;
      // trailingNode ajouterait un paragraphe vide après chaque liste dans le contenu enregistré (absent en 2.x).
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, trailingNode: false, link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder: 'Écris le contenu ici…' }),
    ],
    // Tiptap 3 ne redessine plus le composant à chaque transaction : la barre d'outils (isActive) en a besoin.
    shouldRerenderOnTransaction: true,
    content: value || '',
    onUpdate: ({ editor: e }) => onChange?.(e.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) editor.commands.setContent(value || '', { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;
  const level = [2, 3, 4].find((l) => editor.isActive('heading', { level: l })) || 0;

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL du lien', prev || 'https://');
    if (url === null) return;
    if (url === '') editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', borderBottom: '1px solid var(--ant-color-border)', flexWrap: 'wrap' }}>
        <Select
          size="small" value={String(level)} style={{ width: 110 }}
          onChange={(v) => { const l = Number(v); if (l === 0) editor.chain().focus().setParagraph().run(); else editor.chain().focus().toggleHeading({ level: l as 2 | 3 | 4 }).run(); }}
          options={[{ value: '0', label: 'Normal' }, { value: '2', label: 'Titre 2' }, { value: '3', label: 'Titre 3' }, { value: '4', label: 'Titre 4' }]} />
        <Tooltip title="Gras"><Button type={editor.isActive('bold') ? 'primary' : 'text'} size="small" icon={<BoldOutlined />} onClick={() => editor.chain().focus().toggleBold().run()} /></Tooltip>
        <Tooltip title="Italique"><Button type={editor.isActive('italic') ? 'primary' : 'text'} size="small" icon={<ItalicOutlined />} onClick={() => editor.chain().focus().toggleItalic().run()} /></Tooltip>
        <Tooltip title="Souligné"><Button type={editor.isActive('underline') ? 'primary' : 'text'} size="small" icon={<UnderlineOutlined />} onClick={() => editor.chain().focus().toggleUnderline().run()} /></Tooltip>
        <Tooltip title="Effacer la mise en forme"><Button type="text" size="small" icon={<ClearOutlined />} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} /></Tooltip>
        <Tooltip title="Liste à puces"><Button type={editor.isActive('bulletList') ? 'primary' : 'text'} size="small" icon={<UnorderedListOutlined />} onClick={() => editor.chain().focus().toggleBulletList().run()} /></Tooltip>
        <Tooltip title="Liste numérotée"><Button type={editor.isActive('orderedList') ? 'primary' : 'text'} size="small" icon={<OrderedListOutlined />} onClick={() => editor.chain().focus().toggleOrderedList().run()} /></Tooltip>
        <Tooltip title="Lien"><Button type={editor.isActive('link') ? 'primary' : 'text'} size="small" icon={<LinkOutlined />} onClick={setLink} /></Tooltip>
        <Tooltip title="Citation"><Button type={editor.isActive('blockquote') ? 'primary' : 'text'} size="small" icon={<BlockOutlined />} onClick={() => editor.chain().focus().toggleBlockquote().run()} /></Tooltip>
      </div>
      <div className="rte-content" style={{ minHeight: 320, maxHeight: '55vh', overflowY: 'auto', padding: 16, fontSize: 15, lineHeight: 1.6 }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
