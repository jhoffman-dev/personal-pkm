"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EditorContent,
  EditorContext,
  type Editor,
  useEditor,
} from "@tiptap/react";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";
import type { EditorView } from "@tiptap/pm/view";

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover";
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { useWindowSize } from "@/hooks/use-window-size";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";
import { cn } from "@/lib/utils";
import { DEFAULT_NOTE_BODY, DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss";

const DEFAULT_NOTE_CONTENT = DEFAULT_NOTE_BODY;
const DEFAULT_STANDALONE_CONTENT = "<p></p>";

function formatImageUploadError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("File size exceeds maximum allowed")) {
      return `Image is too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }

    return error.message;
  }

  return "Failed to upload image.";
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

export function SimpleEditor({
  content,
  onContentChange,
  onTitleChange,
  className,
}: {
  content?: string;
  onContentChange?: (nextContent: string) => void;
  onTitleChange?: (title: string) => void;
  className?: string;
}) {
  const hasLinkedTitle = typeof onTitleChange === "function";
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main",
  );
  const [uploadToastMessage, setUploadToastMessage] = useState<string | null>(
    null,
  );
  const toolbarRef = useRef<HTMLDivElement>(null);
  const uploadToastTimeoutRef = useRef<number | null>(null);

  const showUploadToast = useCallback((message: string) => {
    setUploadToastMessage(message);

    if (uploadToastTimeoutRef.current !== null) {
      window.clearTimeout(uploadToastTimeoutRef.current);
    }

    uploadToastTimeoutRef.current = window.setTimeout(() => {
      setUploadToastMessage(null);
      uploadToastTimeoutRef.current = null;
    }, 3500);
  }, []);

  const insertImagesFromFiles = useCallback(
    async (view: EditorView, files: File[]) => {
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        return false;
      }

      const imageType = view.state.schema.nodes.image;
      if (!imageType) {
        return false;
      }

      for (const file of imageFiles) {
        try {
          const src = await handleImageUpload(file);
          const fileName = file.name.replace(/\.[^/.]+$/, "") || "image";
          const node = imageType.create({
            src,
            alt: fileName,
            title: fileName,
          });
          const transaction = view.state.tr
            .replaceSelectionWith(node)
            .scrollIntoView();
          view.dispatch(transaction);
        } catch (error) {
          showUploadToast(formatImageUploadError(error));
        }
      }

      return true;
    },
    [showUploadToast],
  );

  const extractTitle = useCallback((editorInstance: Editor) => {
    const firstNode = editorInstance.state.doc.firstChild;
    const text = firstNode?.textContent?.trim();
    return text && text.length > 0 ? text : DEFAULT_NOTE_TITLE;
  }, []);

  const ensureFirstLineHeading = useCallback((editorInstance: Editor) => {
    const { state } = editorInstance;
    const firstNode = state.doc.firstChild;
    const headingType = state.schema.nodes.heading;

    if (!headingType) {
      return false;
    }

    if (!firstNode) {
      editorInstance.commands.setContent(DEFAULT_NOTE_CONTENT, {
        emitUpdate: true,
      });
      return true;
    }

    const firstNodeIsH1 =
      firstNode.type.name === "heading" && firstNode.attrs.level === 1;

    if (firstNodeIsH1) {
      return false;
    }

    const headingNode = headingType.create({ level: 1 }, firstNode.content);
    const from = 1;
    const to = from + firstNode.nodeSize;
    const transaction = state.tr.replaceWith(from, to, headingNode);

    editorInstance.view.dispatch(transaction);
    return true;
  }, []);

  const emitValueChanges = useCallback(
    (editorInstance: Editor) => {
      const html = editorInstance.getHTML();

      if (hasLinkedTitle) {
        onTitleChange?.(extractTitle(editorInstance));
        onContentChange?.(html);
        return;
      }

      if (typeof window === "undefined") {
        onContentChange?.(html);
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const first = doc.body.firstElementChild;
      const firstTag = first?.tagName.toLowerCase();
      const firstText = first?.textContent?.trim() ?? "";
      const isLegacyTitleHeading =
        firstTag === "h1" &&
        (firstText.length === 0 || firstText === DEFAULT_NOTE_TITLE);

      if (isLegacyTitleHeading) {
        first?.remove();
      }

      const normalized =
        doc.body.innerHTML.trim() || DEFAULT_STANDALONE_CONTENT;
      onContentChange?.(normalized);
    },
    [extractTitle, hasLinkedTitle, onContentChange, onTitleChange],
  );

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files ?? []);
        const hasImages = files.some((file) => file.type.startsWith("image/"));

        if (hasImages) {
          event.preventDefault();
          void insertImagesFromFiles(view, files);
          return true;
        }

        return false;
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image.configure({ allowBase64: true }),
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => showUploadToast(formatImageUploadError(error)),
      }),
    ],
    content:
      content ??
      (hasLinkedTitle ? DEFAULT_NOTE_CONTENT : DEFAULT_STANDALONE_CONTENT),
    onCreate: ({ editor: editorInstance }) => {
      if (hasLinkedTitle) {
        ensureFirstLineHeading(editorInstance);
      }
      emitValueChanges(editorInstance);
    },
    onUpdate: ({ editor: editorInstance }) => {
      if (hasLinkedTitle) {
        ensureFirstLineHeading(editorInstance);
      }
      emitValueChanges(editorInstance);
    },
  });

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  useEffect(() => {
    return () => {
      if (uploadToastTimeoutRef.current !== null) {
        window.clearTimeout(uploadToastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!editor || content === undefined) {
      return;
    }

    const parser = new DOMParser();
    const inputDoc = parser.parseFromString(content, "text/html");

    if (!hasLinkedTitle) {
      const first = inputDoc.body.firstElementChild;
      const firstTag = first?.tagName.toLowerCase();
      const firstText = first?.textContent?.trim() ?? "";
      const isLegacyTitleHeading =
        firstTag === "h1" &&
        (firstText.length === 0 || firstText === DEFAULT_NOTE_TITLE);

      if (isLegacyTitleHeading) {
        first?.remove();
      }
    }

    const normalizedContent =
      inputDoc.body.innerHTML.trim() ||
      (hasLinkedTitle ? DEFAULT_NOTE_CONTENT : DEFAULT_STANDALONE_CONTENT);

    const current = editor.getHTML();
    if (current !== normalizedContent) {
      editor.commands.setContent(normalizedContent, { emitUpdate: false });

      if (hasLinkedTitle) {
        ensureFirstLineHeading(editor);
        onTitleChange?.(extractTitle(editor));
      }
    }
  }, [
    content,
    editor,
    ensureFirstLineHeading,
    extractTitle,
    hasLinkedTitle,
    onTitleChange,
  ]);

  return (
    <div className={cn("simple-editor-wrapper", className)}>
      <EditorContext.Provider value={{ editor }}>
        {uploadToastMessage ? (
          <div className="fixed top-4 right-4 z-50 rounded-md border bg-background px-3 py-2 text-sm text-destructive shadow-sm">
            {uploadToastMessage}
          </div>
        ) : null}

        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        >
          {mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  );
}
