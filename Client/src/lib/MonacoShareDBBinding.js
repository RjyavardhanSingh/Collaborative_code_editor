/**
 * Custom binding between Monaco editor and ShareDB
 */
export class MonacoShareDBBinding {
  constructor(shareDBDoc, editor) {
    this.shareDBDoc = shareDBDoc;
    this.editor = editor;
    this.model = editor.getModel();
    this.isUpdatingShareDB = false;
    this.isUpdatingMonaco = false;
    this.isDestroyed = false;

    // Initialize with current content
    this.syncInitialContent();

    // Initialize listeners
    this.initListeners();
  }

  syncInitialContent() {
    const docContent = this.shareDBDoc.data?.content || "";
    const editorContent = this.model.getValue();

    // If the content is different and ShareDB has content, update editor
    if (docContent && docContent !== editorContent) {
      this.isUpdatingMonaco = true;
      this.editor.executeEdits("sharedb-init", [
        {
          range: this.model.getFullModelRange(),
          text: docContent,
          forceMoveMarkers: true,
        },
      ]);
      this.isUpdatingMonaco = false;
    }
    // If ShareDB is empty but editor has content, update ShareDB
    else if (!docContent && editorContent) {
      this.isUpdatingShareDB = true;
      this.shareDBDoc.submitOp([{ p: ["content"], oi: editorContent }], {
        source: "monaco-init",
      });
      this.isUpdatingShareDB = false;
    }
  }

  initListeners() {
    // Listen for changes in Monaco editor
    this.modelChangeDisposable = this.model.onDidChangeContent((event) => {
      if (this.isUpdatingMonaco || this.isDestroyed) return;

      this.isUpdatingShareDB = true;

      try {
        // Get the full content and update ShareDB
        const content = this.model.getValue();

        console.log("📤 Monaco -> ShareDB:", {
          contentLength: content.length,
          changeLength: event.changes.reduce(
            (acc, change) => acc + change.text.length,
            0
          ),
        });

        // Update content field in the ShareDB document
        this.shareDBDoc.submitOp(
          [{ p: ["content"], od: this.shareDBDoc.data?.content, oi: content }],
          { source: "monaco" }
        );
      } catch (err) {
        console.error("Error updating ShareDB from Monaco:", err);
      } finally {
        this.isUpdatingShareDB = false;
      }
    });

    // Listen for changes in ShareDB document
    this.opHandler = (op, source) => {
      if (this.isUpdatingShareDB || this.isDestroyed || source === "monaco")
        return;

      try {
        console.log("📥 ShareDB -> Monaco:", {
          op: op?.length,
          source,
        });

        // Update Monaco editor with the new content
        if (
          this.shareDBDoc.data &&
          typeof this.shareDBDoc.data.content === "string"
        ) {
          const content = this.shareDBDoc.data.content;
          const editorContent = this.model.getValue();

          if (content !== editorContent) {
            this.isUpdatingMonaco = true;

            // IMPORTANT: Save all cursors and selections before updating content
            const cursors = this.saveAllCursors();

            // Use Monaco's edit API to update the content
            this.editor.executeEdits("sharedb", [
              {
                range: this.model.getFullModelRange(),
                text: content,
                forceMoveMarkers: true, // Try to preserve markers
              },
            ]);

            // IMPORTANT: Restore all cursors after updating content
            this.restoreAllCursors(cursors);

            this.isUpdatingMonaco = false;
          }
        }
      } catch (err) {
        console.error("Error updating Monaco from ShareDB:", err);
      }
    };

    this.shareDBDoc.on("op", this.opHandler);
  }

  // New method to save cursor positions
  saveAllCursors() {
    // Find all cursor decorations (we need to look in the DOM)
    const cursors = [];
    const cursorElements = document.querySelectorAll(
      '[class^="remote-cursor-"]'
    );

    cursorElements.forEach((element) => {
      // Extract user ID from class name
      const classNames = Array.from(element.classList);
      const cursorClass = classNames.find((c) =>
        c.startsWith("remote-cursor-")
      );

      if (cursorClass) {
        const userId = cursorClass.replace("remote-cursor-", "");

        // Find line and column from the element's position
        // This is a bit hacky but works
        const lineElement = element.closest(".view-line");
        if (lineElement) {
          // Get line number and selection from data attributes
          const lineNumber = parseInt(
            lineElement.getAttribute("data-line-number") || "0"
          );

          cursors.push({
            userId,
            lineNumber,
            // We can't easily get the exact column, so we'll just preserve the line
          });
        }
      }
    });

    return cursors;
  }

  // New method to restore cursor positions
  restoreAllCursors(cursors) {
    // We can't directly restore cursors here
    // Instead, we'll dispatch a custom event that the cursor tracking system can listen for
    if (cursors.length > 0) {
      const event = new CustomEvent("restore-remote-cursors", {
        detail: { cursors },
      });
      document.dispatchEvent(event);
    }
  }

  destroy() {
    this.isDestroyed = true;

    // Remove listeners
    if (this.modelChangeDisposable) {
      this.modelChangeDisposable.dispose();
    }

    // Remove ShareDB listeners
    if (this.shareDBDoc) {
      this.shareDBDoc.removeListener("op", this.opHandler);
    }
  }
}
