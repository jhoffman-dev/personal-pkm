import { useMemo, useState } from "react";
import { ExternalLink, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  deleteBrowserBookmark,
  listBrowserBookmarks,
  normalizeBrowserUrl,
  upsertBrowserBookmark,
  type BrowserBookmark,
} from "@/lib/browser-bookmarks";

function deriveBookmarkTitle(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

export function BrowserPage() {
  const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>(() =>
    listBrowserBookmarks(),
  );
  const [inputUrl, setInputUrl] = useState("https://");
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSaveCurrentUrl = Boolean(currentUrl);

  const hasCurrentBookmark = useMemo(
    () =>
      currentUrl
        ? bookmarks.some((bookmark) => bookmark.url === currentUrl)
        : false,
    [bookmarks, currentUrl],
  );

  const navigateToInputUrl = () => {
    const normalized = normalizeBrowserUrl(inputUrl);
    if (!normalized) {
      setErrorMessage("Please enter a valid http(s) URL.");
      return;
    }

    setErrorMessage(null);
    setCurrentUrl(normalized);
    setInputUrl(normalized);
  };

  const saveCurrentAsBookmark = () => {
    if (!currentUrl) {
      return;
    }

    const title = deriveBookmarkTitle(currentUrl);
    upsertBrowserBookmark({ title, url: currentUrl });
    setBookmarks(listBrowserBookmarks());
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full overflow-hidden py-0">
        <CardContent className="grid h-full grid-cols-[18rem_minmax(0,1fr)] gap-0 p-0">
          <aside className="border-r p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Bookmarks</h2>
              <span className="text-muted-foreground text-xs">
                {bookmarks.length}
              </span>
            </div>

            <div className="space-y-1 overflow-y-auto">
              {bookmarks.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No bookmarks yet.
                </p>
              ) : (
                bookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="rounded-md border p-2">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        setCurrentUrl(bookmark.url);
                        setInputUrl(bookmark.url);
                        setErrorMessage(null);
                      }}
                    >
                      <p className="truncate text-sm font-medium">
                        {bookmark.title}
                      </p>
                      <p className="text-muted-foreground mt-1 truncate text-xs">
                        {bookmark.url}
                      </p>
                    </button>

                    <div className="mt-2 flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.open(
                            bookmark.url,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }}
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          deleteBrowserBookmark(bookmark.id);
                          setBookmarks(listBrowserBookmarks());
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b p-3">
              <Input
                value={inputUrl}
                onChange={(event) => setInputUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    navigateToInputUrl();
                  }
                }}
                placeholder="https://example.com"
              />
              <Button type="button" onClick={navigateToInputUrl}>
                Go
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={saveCurrentAsBookmark}
                disabled={!canSaveCurrentUrl}
              >
                <Star className="size-4" />
                {hasCurrentBookmark ? "Saved" : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!currentUrl) {
                    return;
                  }

                  window.open(currentUrl, "_blank", "noopener,noreferrer");
                }}
                disabled={!currentUrl}
              >
                <ExternalLink className="size-4" />
                Open
              </Button>
            </div>

            {errorMessage ? (
              <p className="text-destructive border-b px-3 py-2 text-sm">
                {errorMessage}
              </p>
            ) : null}

            <div className="min-h-0 flex-1">
              {currentUrl ? (
                <iframe
                  key={currentUrl}
                  src={currentUrl}
                  title="Browser preview"
                  className="h-full w-full border-0"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                  Enter a URL and click Go.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
